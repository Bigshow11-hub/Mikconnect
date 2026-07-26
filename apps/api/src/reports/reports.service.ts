import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";

import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async monthly(tenantId: string, month?: string) {
    const period = reportPeriod(month);
    const data = await this.prisma.withTenantContext(async (tx) => {
      const [tenant, sales, payments, sessions, tickets] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            name: true,
            currency: true,
            tier: true,
            subscription: { select: { status: true, currentPeriodEnd: true } },
          },
        }),
        tx.sale.findMany({
          where: { tenantId, createdAt: { gte: period.start, lt: period.end } },
          select: {
            amount: true,
            commission: true,
            channel: true,
            agent: { select: { id: true, user: { select: { name: true } } } },
            ticket: { select: { plan: { select: { id: true, name: true } } } },
          },
        }),
        tx.payment.findMany({
          where: { tenantId, createdAt: { gte: period.start, lt: period.end } },
          select: { amount: true, status: true, provider: true },
        }),
        tx.session.findMany({
          where: { tenantId, startedAt: { gte: period.start, lt: period.end } },
          select: {
            sessionSeconds: true,
            dataUsedMb: true,
            ticket: { select: { code: true, plan: { select: { dataLimitMb: true } } } },
          },
        }),
        tx.ticket.findMany({
          where: { tenantId, createdAt: { gte: period.start, lt: period.end } },
          select: { status: true },
        }),
      ]);
      return { tenant, sales, payments, sessions, tickets };
    });
    if (!data.tenant) throw new NotFoundException("Espace introuvable.");

    const plans = aggregate(
      data.sales,
      (sale) => sale.ticket.plan.id,
      (sale) => sale.ticket.plan.name,
    );
    const agents = aggregate(
      data.sales.filter((sale) => sale.agent),
      (sale) => sale.agent!.id,
      (sale) => sale.agent!.user.name,
    );
    const statusCounts = Object.fromEntries(
      ["ISSUED", "SOLD", "USED", "EXPIRED", "CANCELLED"].map((status) => [
        status,
        data.tickets.filter((ticket) => ticket.status === status).length,
      ]),
    );
    const paymentCounts = Object.fromEntries(
      ["PENDING", "CONFIRMED", "FAILED", "EXPIRED"].map((status) => [
        status,
        data.payments.filter((payment) => payment.status === status).length,
      ]),
    );
    const anomalies = data.sessions
      .filter(
        (session) =>
          session.ticket.plan.dataLimitMb &&
          session.dataUsedMb > session.ticket.plan.dataLimitMb * 1.1,
      )
      .map((session) => ({
        ticketCode: session.ticket.code,
        usedMb: session.dataUsedMb,
        limitMb: session.ticket.plan.dataLimitMb!,
      }));

    return {
      period: { month: period.key, from: period.start.toISOString(), to: period.end.toISOString() },
      tenant: data.tenant,
      totals: {
        revenue: sum(data.sales, (sale) => sale.amount),
        commissions: sum(data.sales, (sale) => sale.commission),
        netRevenue: sum(data.sales, (sale) => sale.amount - sale.commission),
        sales: data.sales.length,
        ticketsCreated: data.tickets.length,
        sessions: data.sessions.length,
        dataUsedMb: sum(data.sessions, (session) => session.dataUsedMb),
        sessionSeconds: sum(data.sessions, (session) => session.sessionSeconds),
      },
      tickets: statusCounts,
      payments: paymentCounts,
      channels: ["AGENT", "MOBILE_MONEY"].map((channel) => ({
        channel,
        sales: data.sales.filter((sale) => sale.channel === channel).length,
        revenue: sum(
          data.sales.filter((sale) => sale.channel === channel),
          (sale) => sale.amount,
        ),
      })),
      plans,
      agents,
      anomalies,
    };
  }

  async csv(tenantId: string, userId: string, month?: string) {
    await this.subscriptions.assertFeature(tenantId, "accountingCsv");
    const report = await this.monthly(tenantId, month);
    const rows = [
      ["Mois", "Type", "Libellé", "Ventes", "Revenu", "Commissions", "Devise"],
      ...report.plans.map((plan) => [
        report.period.month,
        "Forfait",
        plan.label,
        plan.sales,
        plan.revenue,
        plan.commissions,
        report.tenant.currency,
      ]),
      ...report.agents.map((agent) => [
        report.period.month,
        "Agent",
        agent.label,
        agent.sales,
        agent.revenue,
        agent.commissions,
        report.tenant.currency,
      ]),
    ];
    await this.auditExport(tenantId, userId, report.period.month, "CSV", true);
    return { content: rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), report };
  }

  async pdf(tenantId: string, userId: string, month?: string) {
    await this.subscriptions.assertFeature(tenantId, "monthlyPdf");
    const report = await this.monthly(tenantId, month);
    try {
      const content = renderReportPdf(report);
      await this.auditExport(tenantId, userId, report.period.month, "PDF", true);
      return { content: await content, report };
    } catch (error) {
      await this.auditExport(tenantId, userId, report.period.month, "PDF", false);
      throw error;
    }
  }

  private auditExport(
    tenantId: string,
    userId: string,
    month: string,
    format: string,
    ok: boolean,
  ) {
    return this.prisma.withTenantContext((tx) =>
      tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: ok ? "MONTHLY_REPORT_EXPORTED" : "MONTHLY_REPORT_EXPORT_FAILED",
          resource: "MonthlyReport",
          resourceId: month,
          metadata: { month, format },
        },
      }),
    );
  }
}

function reportPeriod(value?: string) {
  const current = value ?? new Date().toISOString().slice(0, 7);
  const [year, month] = current.split("-").map(Number);
  const start = new Date(Date.UTC(year!, month! - 1, 1));
  const end = new Date(Date.UTC(year!, month!, 1));
  return { key: current, start, end };
}

function sum<T>(items: T[], value: (item: T) => number) {
  return items.reduce((total, item) => total + value(item), 0);
}

function aggregate<T extends { amount: number; commission: number }>(
  items: T[],
  id: (item: T) => string,
  label: (item: T) => string,
) {
  const values = new Map<
    string,
    { id: string; label: string; sales: number; revenue: number; commissions: number }
  >();
  for (const item of items) {
    const key = id(item);
    const current = values.get(key) ?? {
      id: key,
      label: label(item),
      sales: 0,
      revenue: 0,
      commissions: 0,
    };
    current.sales += 1;
    current.revenue += item.amount;
    current.commissions += item.commission;
    values.set(key, current);
  }
  return [...values.values()].sort((a, b) => b.revenue - a.revenue);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

type MonthlyReport = Awaited<ReturnType<ReportsService["monthly"]>>;

function renderReportPdf(report: MonthlyReport): Promise<Buffer> {
  const document = new PDFDocument({
    size: "A4",
    margin: 42,
    info: { Title: `Rapport ${report.period.month} - ${report.tenant.name}`, Author: "mikconnect" },
  });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  document.rect(0, 0, 595, 104).fill("#172033");
  document.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(21).text("Rapport mensuel", 42, 34);
  document
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#DDE4EE")
    .text(`${report.tenant.name} - ${report.period.month}`, 42, 67);
  document.fillColor("#172033").font("Helvetica-Bold").fontSize(11).text("Synthèse", 42, 130);
  const metrics = [
    ["Revenus", `${formatNumber(report.totals.revenue)} ${report.tenant.currency}`],
    ["Revenu net", `${formatNumber(report.totals.netRevenue)} ${report.tenant.currency}`],
    ["Ventes", formatNumber(report.totals.sales)],
    ["Données", `${formatNumber(report.totals.dataUsedMb)} Mo`],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 42 + (index % 2) * 255;
    const y = 153 + Math.floor(index / 2) * 54;
    document.roundedRect(x, y, 238, 42, 4).fill("#EEF2F7");
    document
      .fillColor("#526074")
      .font("Helvetica")
      .fontSize(7)
      .text(label!, x + 12, y + 9);
    document
      .fillColor("#172033")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(value!, x + 12, y + 21);
  });
  drawReportTable(document, "Forfaits", report.plans, 282, report.tenant.currency);
  const agentsY = Math.min(document.y + 30, 520);
  drawReportTable(document, "Agents", report.agents, agentsY, report.tenant.currency);
  document
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#7A8798")
    .text(`Généré le ${new Date().toLocaleDateString("fr-FR")} - mikconnect`, 42, 800, {
      width: 511,
      align: "center",
    });
  document.end();
  return completed;
}

function drawReportTable(
  document: PDFKit.PDFDocument,
  title: string,
  rows: MonthlyReport["plans"],
  y: number,
  currency: string,
) {
  document.fillColor("#172033").font("Helvetica-Bold").fontSize(11).text(title, 42, y);
  let rowY = y + 24;
  document.rect(42, rowY, 511, 22).fill("#25344E");
  document
    .fillColor("#FFFFFF")
    .fontSize(7)
    .text("Libellé", 52, rowY + 8)
    .text("Ventes", 330, rowY + 8)
    .text("Revenu", 410, rowY + 8);
  rowY += 22;
  for (const row of rows.slice(0, 6)) {
    document.rect(42, rowY, 511, 24).fill(rowY % 48 === 0 ? "#F6F8FB" : "#FFFFFF");
    document
      .fillColor("#25344E")
      .font("Helvetica")
      .fontSize(8)
      .text(row.label, 52, rowY + 8, { width: 250, ellipsis: true });
    document.text(String(row.sales), 330, rowY + 8, { width: 50 });
    document
      .font("Helvetica-Bold")
      .text(`${formatNumber(row.revenue)} ${currency}`, 410, rowY + 8, {
        width: 130,
        align: "right",
      });
    rowY += 24;
  }
  if (rows.length === 0)
    document
      .fillColor("#7A8798")
      .font("Helvetica")
      .fontSize(8)
      .text("Aucune donnée pour cette période.", 52, rowY + 8);
  document.y = rowY;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/\s/g, " ");
}
