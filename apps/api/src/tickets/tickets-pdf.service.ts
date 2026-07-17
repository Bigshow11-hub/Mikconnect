import { BadRequestException, Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TicketsPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async createVoucherSheet(
    tenantId: string,
    userId: string,
    role: "OWNER" | "AGENT" | "ADMIN",
    ticketIds: string[],
    layout: "A4_STANDARD" | "A4_COMPACT" = "A4_STANDARD",
  ): Promise<Buffer> {
    const agent = role === "AGENT"
      ? await this.prisma.withTenantContext((tx) =>
          tx.agent.findUnique({ where: { userId }, select: { id: true } }),
        )
      : null;
    if (role === "AGENT" && !agent) throw new BadRequestException("Espace agent introuvable.");

    const [tenant, tickets] = await Promise.all([
      this.prisma.withTenantContext((tx) =>
        tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      ),
      this.prisma.withTenantContext((tx) =>
        tx.ticket.findMany({
          where: {
            tenantId,
            id: { in: ticketIds },
            ...(agent ? { agentId: agent.id } : {}),
          },
          select: {
            id: true,
            code: true,
            expiresAt: true,
            plan: {
              select: {
                name: true,
                durationMinutes: true,
                dataLimitMb: true,
                price: true,
                currency: true,
              },
            },
            agent: { select: { user: { select: { name: true } } } },
          },
          orderBy: { createdAt: "asc" },
        }),
      ),
    ]);

    if (!tenant || tickets.length !== ticketIds.length) {
      throw new BadRequestException("Certains tickets sont introuvables ou n’appartiennent pas à cet espace.");
    }

    const document = new PDFDocument({
      size: "A4",
      margin: 28,
      info: {
        Title: `Tickets WiFi - ${tenant.name}`,
        Author: "mikconnect",
        Subject: "Vouchers WiFi imprimables",
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
    });

    const pageWidth = 595.28;
    const margin = 24;
    const columns = layout === "A4_COMPACT" ? 3 : 2;
    const perPage = columns * 4;
    const gapX = 8;
    const gapY = 8;
    const ticketWidth = (pageWidth - margin * 2 - gapX * (columns - 1)) / columns;
    const ticketHeight = 190;

    tickets.forEach((ticket, index) => {
      if (index > 0 && index % perPage === 0) document.addPage();
      const indexOnPage = index % perPage;
      const column = indexOnPage % columns;
      const row = Math.floor(indexOnPage / columns);
      const x = margin + column * (ticketWidth + gapX);
      const y = margin + row * (ticketHeight + gapY);
      drawVoucher(document, {
        x,
        y,
        width: ticketWidth,
        height: ticketHeight,
        tenantName: tenant.name,
        code: ticket.code,
        planName: ticket.plan.name,
        duration: formatDuration(ticket.plan.durationMinutes),
        dataLimit: ticket.plan.dataLimitMb ? formatData(ticket.plan.dataLimitMb) : "Sans limite de data",
        price: `${formatAmount(ticket.plan.price)} ${ticket.plan.currency}`,
        expiresAt: ticket.expiresAt,
        agentName: ticket.agent?.user.name ?? null,
      });
    });

    document.end();
    return completed;
  }
}

interface VoucherLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  tenantName: string;
  code: string;
  planName: string;
  duration: string;
  dataLimit: string;
  price: string;
  expiresAt: Date | null;
  agentName: string | null;
}

function drawVoucher(document: PDFKit.PDFDocument, voucher: VoucherLayout) {
  const { x, y, width, height } = voucher;
  document.save();
  document.roundedRect(x, y, width, height, 5).lineWidth(0.8).strokeColor("#CBD2DC").stroke();
  document.rect(x, y, width, 38).fill("#172033");
  document.rect(x, y, 4, height).fill("#405A86");

  document
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(voucher.tenantName, x + 15, y + 10, { width: width - 92, ellipsis: true });
  document
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor("#DDE4EE")
    .text("ACCÈS WIFI", x + width - 74, y + 12, { width: 58, align: "right", characterSpacing: 0.8 });

  document
    .fillColor("#526074")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(voucher.planName.toUpperCase(), x + 15, y + 51, { width: width - 115, ellipsis: true, characterSpacing: 0.6 });
  document.roundedRect(x + width - 91, y + 46, 75, 18, 9).fill("#EEF2F7");
  document.font("Helvetica-Bold").fontSize(8).fillColor("#25344E").text(voucher.price, x + width - 86, y + 51, { width: 65, align: "center" });

  document
    .fillColor("#172033")
    .font("Courier-Bold")
    .fontSize(width < 200 ? 15 : 21)
    .text(voucher.code, x + 15, y + 75, { width: width - 30, align: "center", characterSpacing: 1.2 });

  document.moveTo(x + 15, y + 111).lineTo(x + width - 15, y + 111).lineWidth(0.5).strokeColor("#D9DFE7").stroke();
  const factWidth = (width - 30) / 3;
  drawVoucherFact(document, x + 15, y + 121, factWidth, "DURÉE", voucher.duration);
  drawVoucherFact(document, x + 15 + factWidth, y + 121, factWidth, "VOLUME", voucher.dataLimit);
  drawVoucherFact(document, x + 15 + factWidth * 2, y + 121, factWidth, "ACCÈS", "1 appareil");

  document.font("Helvetica").fontSize(6.8).fillColor("#526074")
    .text(width < 200 ? "WiFi → Portail → Saisissez le code" : "1. Connectez-vous au WiFi  2. Ouvrez le portail  3. Saisissez le code", x + 15, y + 154, { width: width - 30, align: "center" });

  const footer = [
    voucher.agentName ? `Revendeur : ${voucher.agentName}` : null,
    voucher.expiresAt ? `Valable jusqu’au ${voucher.expiresAt.toLocaleDateString("fr-FR")}` : null,
  ].filter(Boolean).join("  •  ");
  if (footer) {
    document.fontSize(6).fillColor("#7A8798").text(footer, x + 15, y + height - 15, { width: width - 30, align: "center", ellipsis: true });
  }
  document.restore();
}

function drawVoucherFact(document: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
  document.font("Helvetica").fontSize(5.5).fillColor("#7A8798").text(label, x, y, { width, align: "center", characterSpacing: 0.6 });
  document.font("Helvetica-Bold").fontSize(7.2).fillColor("#25344E").text(value, x, y + 10, { width, align: "center", ellipsis: true });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440} j`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function formatData(megabytes: number) {
  return megabytes >= 1024 ? `${megabytes / 1024} Go` : `${megabytes} Mo`;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
}
