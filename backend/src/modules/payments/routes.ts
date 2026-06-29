import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const initiateSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().min(1),
  phoneNumber: z.string().optional(),
  planId: z.string().uuid().optional(),
  hotspotId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
});

const webhookSchema = z.object({ reference: z.string(), status: z.enum(['SUCCESS', 'FAILED']) });

router.post('/initiate', validate(initiateSchema), async (req: Request, res: Response) => {
  const { amount, method, phoneNumber, planId, hotspotId, customerName, customerEmail } = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      amount, method, status: 'PENDING',
      reference: `MC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      phoneNumber, hotspotId,
      metadata: JSON.stringify({ planId, customerName, customerEmail }),
    },
  });
  res.status(201).json({
    success: true,
    transaction: { id: transaction.id, reference: transaction.reference, amount: transaction.amount, status: transaction.status },
    paymentMethods: { mobileMoney: ['MTN_MOMO', 'MOOV', 'WAVE', 'ORANGE_MONEY'], widget: 'https://cdn.fedapay.com/checkout.js' },
  });
});

router.post('/webhook/fedapay', async (req: Request, res: Response) => {
  const event = req.body;
  const transactionId = event?.transaction?.id;
  const status = event?.event_type === 'transaction.completed' ? 'COMPLETED' : 'FAILED';
  if (transactionId) {
    const tx = await prisma.transaction.findFirst({ where: { metadata: { contains: String(transactionId) } } });
    if (tx) {
      await prisma.transaction.update({ where: { id: tx.id }, data: { status } });
      if (status === 'COMPLETED' && tx.metadata) {
        const meta = JSON.parse(tx.metadata);
        if (meta.planId) {
          const code = crypto.randomBytes(4).toString('hex').toUpperCase();
          await prisma.voucher.create({
            data: {
              code, price: tx.amount, status: 'ACTIVE',
              hotspotId: tx.hotspotId || meta.hotspotId, planId: meta.planId,
              transactionId: tx.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
  }
  res.json({ received: true });
});

router.post('/webhook/momo', validate(webhookSchema), async (req: Request, res: Response) => {
  const { reference, status } = req.body;
  const transaction = await prisma.transaction.findUnique({ where: { reference } });
  if (!transaction) return res.json({ received: true, note: 'Transaction not found, may be duplicate webhook' });

  await prisma.transaction.update({ where: { id: transaction.id }, data: { status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED' } });

  if (status === 'SUCCESS') {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const meta = transaction.metadata ? JSON.parse(transaction.metadata) : {};
    const planId = meta.planId || '';
    if (planId) {
      await prisma.voucher.create({
        data: {
          code, price: transaction.amount, status: 'ACTIVE',
          hotspotId: transaction.hotspotId || meta.hotspotId || '', planId,
          transactionId: transaction.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  res.json({ received: true });
});

router.get('/methods', async (_req: Request, res: Response) => {
  res.json({
    methods: [
      { id: 'MTN_MOMO', name: 'MTN Mobile Money', countries: ['BJ', 'CI', 'GH', 'CM', 'UG'] },
      { id: 'MOOV', name: 'Moov Money', countries: ['BJ', 'CI'] },
      { id: 'WAVE', name: 'Wave', countries: ['SN', 'BF', 'CI'] },
      { id: 'ORANGE_MONEY', name: 'Orange Money', countries: ['CI', 'ML', 'SN', 'BF'] },
      { id: 'FEDAPAY', name: 'FedaPay (Carte & Mobile)', countries: ['BJ', 'TG', 'SN', 'CI'] },
    ],
  });
});

export default router;
