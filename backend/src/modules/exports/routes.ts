import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { generateVoucherPDF, generateInvoicePDF } from '../../services/pdf';

const router = Router();

router.use(authenticate);

router.get('/voucher/:id/pdf', async (req: Request, res: Response) => {
  const voucher = await prisma.voucher.findUnique({
    where: { id: req.params.id },
    include: { hotspot: { select: { name: true } }, plan: { select: { name: true } } },
  });
  if (!voucher) return res.status(404).json({ error: 'Ticket introuvable' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${voucher.code}.pdf"`);
  generateVoucherPDF({
    code: voucher.code,
    price: voucher.price,
    hotspotName: voucher.hotspot?.name,
    planName: voucher.plan?.name,
    expiresAt: voucher.expiresAt,
    createdAt: voucher.createdAt,
  }).pipe(res);
});

router.post('/vouchers/pdf', async (req: Request, res: Response) => {
  const { ids } = req.body;
  const vouchers = await prisma.voucher.findMany({
    where: { id: { in: ids || [] } },
    include: { hotspot: { select: { name: true } }, plan: { select: { name: true } } },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="tickets-${Date.now()}.pdf"`);

  const doc = new (require('pdfkit'))({ margin: 30 });
  doc.pipe(res);
  doc.fontSize(18).font('Helvetica-Bold').text('MIKCONNECT', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text(`Tickets (${vouchers.length})`, { align: 'center' });
  doc.moveDown(1.5);

  vouchers.forEach((v: any, i: number) => {
    if (i > 0) doc.addPage();
    const subDoc = generateVoucherPDF({
      code: v.code,
      price: v.price,
      hotspotName: v.hotspot?.name,
      planName: v.plan?.name,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
    });
    doc.addContent(subDoc);
  });
  doc.end();
});

router.get('/transactions/pdf', async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.pdf"`);
  generateInvoicePDF(transactions, 'Historique des transactions').pipe(res);
});

router.get('/transactions/csv', async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = 'Reference,Montant,Method,Statut,Phone,Date\n';
  const rows = transactions.map((t) =>
    `"${t.reference || ''}",${t.amount},"${t.method || ''}","${t.status || ''}","${t.phoneNumber || ''}","${t.createdAt.toISOString()}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
  res.send(header + rows);
});

router.get('/vouchers/csv', async (req: Request, res: Response) => {
  const vouchers = await prisma.voucher.findMany({
    where: { hotspot: { userId: req.user!.userId } },
    include: { hotspot: { select: { name: true } }, plan: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = 'Code,Prix,Statut,Hotspot,Offre,Expire le,Cree le\n';
  const rows = vouchers.map((v) =>
    `"${v.code}",${v.price},"${v.status}","${v.hotspot?.name || ''}","${v.plan?.name || ''}","${v.expiresAt ? v.expiresAt.toISOString() : ''}","${v.createdAt.toISOString()}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="vouchers-${Date.now()}.csv"`);
  res.send(header + rows);
});

export default router;
