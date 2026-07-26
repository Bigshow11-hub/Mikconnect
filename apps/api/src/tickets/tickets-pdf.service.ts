import { BadRequestException, Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

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
    const agent =
      role === "AGENT"
        ? await this.prisma.withTenantContext((tx) =>
            tx.agent.findUnique({ where: { userId }, select: { id: true } }),
          )
        : null;
    if (role === "AGENT" && !agent) throw new BadRequestException("Espace agent introuvable.");

    const [tenant, tickets] = await Promise.all([
      this.prisma.withTenantContext((tx) =>
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, zones: { select: { name: true }, take: 1 } },
        }),
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
      throw new BadRequestException(
        "Certains tickets sont introuvables ou n’appartiennent pas à cet espace.",
      );
    }

    return this.renderVoucherSheet(tenant.name, tenant.zones[0]?.name ?? null, tickets, layout);
  }

  async createVoucherSheetForBatch(
    tenantId: string,
    userId: string,
    batchId: string,
    layout: "A4_STANDARD" | "A4_COMPACT" = "A4_STANDARD",
  ) {
    const batch = await this.prisma.withTenantContext((tx) =>
      tx.ticketBatch.findFirst({
        where: { id: batchId, tenantId },
        select: {
          id: true,
          reference: true,
          tenant: {
            select: { name: true, zones: { select: { name: true }, take: 1 } },
          },
          tickets: {
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
          },
        },
      }),
    );
    if (!batch) throw new BadRequestException("Lot de tickets introuvable.");

    try {
      const pdf = await this.renderVoucherSheet(
        batch.tenant.name,
        batch.tenant.zones[0]?.name ?? null,
        batch.tickets,
        layout,
      );
      await this.prisma.withTenantContext((tx) =>
        tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: "TICKET_BATCH_PDF_EXPORTED",
            resource: "TicketBatch",
            resourceId: batch.id,
            metadata: { reference: batch.reference, layout, tickets: batch.tickets.length },
          },
        }),
      );
      return {
        pdf,
        reference: batch.reference,
        date: new Date().toISOString().slice(0, 10),
      };
    } catch (error) {
      await this.prisma.withTenantContext((tx) =>
        tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: "TICKET_BATCH_PDF_EXPORT_FAILED",
            resource: "TicketBatch",
            resourceId: batch.id,
            metadata: {
              reference: batch.reference,
              layout,
              error: error instanceof Error ? error.message.slice(0, 300) : "Erreur inconnue",
            },
          },
        }),
      );
      throw error;
    }
  }

  private async renderVoucherSheet(
    tenantName: string,
    zoneName: string | null,
    tickets: VoucherTicket[],
    layout: "A4_STANDARD" | "A4_COMPACT",
  ): Promise<Buffer> {
    const document = new PDFDocument({
      size: "A4",
      margin: 28,
      info: {
        Title: `Tickets WiFi - ${tenantName}`,
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

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index]!;
      if (index > 0 && index % perPage === 0) document.addPage();
      const indexOnPage = index % perPage;
      const column = indexOnPage % columns;
      const row = Math.floor(indexOnPage / columns);
      const x = margin + column * (ticketWidth + gapX);
      const y = margin + row * (ticketHeight + gapY);
      const qrCode = await QRCode.toBuffer(ticket.code, {
        type: "png",
        width: layout === "A4_COMPACT" ? 74 : 86,
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#172033", light: "#FFFFFF" },
      });
      drawVoucher(document, {
        x,
        y,
        width: ticketWidth,
        height: ticketHeight,
        tenantName,
        zoneName,
        code: ticket.code,
        qrCode,
        planName: ticket.plan.name,
        duration: formatDuration(ticket.plan.durationMinutes),
        dataLimit: ticket.plan.dataLimitMb
          ? formatData(ticket.plan.dataLimitMb)
          : "Sans limite de data",
        price: `${formatAmount(ticket.plan.price)} ${ticket.plan.currency}`,
        expiresAt: ticket.expiresAt,
        agentName: ticket.agent?.user.name ?? null,
      });
    }

    document.end();
    return completed;
  }
}

interface VoucherTicket {
  id: string;
  code: string;
  expiresAt: Date | null;
  plan: {
    name: string;
    durationMinutes: number;
    dataLimitMb: number | null;
    price: number;
    currency: string;
  };
  agent: { user: { name: string } } | null;
}

interface VoucherLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  tenantName: string;
  zoneName: string | null;
  code: string;
  qrCode: Buffer;
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
    .text(voucher.zoneName ?? "ACCÈS WIFI", x + width - 92, y + 12, {
      width: 76,
      align: "right",
      ellipsis: true,
    });

  document
    .fillColor("#526074")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(voucher.planName.toUpperCase(), x + 15, y + 51, {
      width: width - 115,
      ellipsis: true,
      characterSpacing: 0.6,
    });
  document.roundedRect(x + width - 91, y + 46, 75, 18, 9).fill("#EEF2F7");
  document
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#25344E")
    .text(voucher.price, x + width - 86, y + 51, { width: 65, align: "center" });

  const qrSize = width < 200 ? 46 : 50;
  document.image(voucher.qrCode, x + 16, y + 71, { width: qrSize, height: qrSize });

  document
    .fillColor("#172033")
    .font("Courier-Bold")
    .fontSize(width < 200 ? 13 : 18)
    .text(voucher.code, x + 74, y + 82, {
      width: width - 89,
      align: "center",
      characterSpacing: 1,
    });

  document
    .moveTo(x + 15, y + 127)
    .lineTo(x + width - 15, y + 127)
    .lineWidth(0.5)
    .strokeColor("#D9DFE7")
    .stroke();
  const factWidth = (width - 30) / 3;
  drawVoucherFact(document, x + 15, y + 134, factWidth, "DURÉE", voucher.duration);
  drawVoucherFact(document, x + 15 + factWidth, y + 134, factWidth, "VOLUME", voucher.dataLimit);
  drawVoucherFact(document, x + 15 + factWidth * 2, y + 134, factWidth, "ACCÈS", "1 appareil");

  document
    .font("Helvetica")
    .fontSize(6.8)
    .fillColor("#526074")
    .text(
      width < 200
        ? "WiFi → Portail → Saisissez le code"
        : "1. Connectez-vous au WiFi  2. Ouvrez le portail  3. Saisissez le code",
      x + 15,
      y + 161,
      { width: width - 30, align: "center" },
    );

  const footer = [
    voucher.agentName ? `Revendeur : ${voucher.agentName}` : null,
    voucher.expiresAt ? `Valable jusqu’au ${voucher.expiresAt.toLocaleDateString("fr-FR")}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");
  if (footer) {
    document
      .fontSize(6)
      .fillColor("#7A8798")
      .text(footer, x + 15, y + height - 15, {
        width: width - 30,
        align: "center",
        ellipsis: true,
      });
  }
  document.restore();
}

function drawVoucherFact(
  document: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  document
    .font("Helvetica")
    .fontSize(5.5)
    .fillColor("#7A8798")
    .text(label, x, y, { width, align: "center", characterSpacing: 0.6 });
  document
    .font("Helvetica-Bold")
    .fontSize(7.2)
    .fillColor("#25344E")
    .text(value, x, y + 10, { width, align: "center", ellipsis: true });
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
