import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const startSchema = z.object({ code: z.string().length(8), destHotspotId: z.string().uuid() });
const endSchema = z.object({ id: z.string().uuid(), dataUsed: z.coerce.number().optional(), sessionDuration: z.coerce.number().optional() });
const agreementSchema = z.object({ name: z.string().min(1), providerIspId: z.string().uuid(), consumerIspId: z.string().uuid(), roamingFee: z.coerce.number().min(0).max(1).default(0.05) });
const settlementSchema = z.object({ agreementId: z.string().uuid(), periodStart: z.string(), periodEnd: z.string() });

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = {
    OR: [
      { sourceHotspot: { userId: req.user!.userId } },
      { destHotspot: { userId: req.user!.userId } },
    ],
  };
  const [sessions, total] = await Promise.all([
    prisma.roamingSession.findMany({
      where,
      include: {
        sourceHotspot: { select: { name: true, location: true } },
        destHotspot: { select: { name: true, location: true } },
        settlement: { select: { id: true, status: true, periodStart: true, periodEnd: true } },
      },
      skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.roamingSession.count({ where }),
  ]);
  res.json({ data: sessions, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/start', validate(startSchema), async (req: Request, res: Response) => {
  const { code, destHotspotId } = req.body;
  const voucher = await prisma.voucher.findUnique({ where: { code }, include: { hotspot: true } });
  if (!voucher || voucher.status !== 'ACTIVE') return res.status(400).json({ error: 'Code invalide ou deja utilise' });

  const destHotspot = await prisma.hotspot.findUnique({ where: { id: destHotspotId } });
  if (!destHotspot) return res.status(404).json({ error: 'Hotspot de destination introuvable' });

  const agreement = await prisma.roamingAgreement.findFirst({
    where: {
      OR: [
        { providerIspId: voucher.hotspot.userId, consumerIspId: destHotspot.userId },
        { providerIspId: destHotspot.userId, consumerIspId: voucher.hotspot.userId },
      ],
      isActive: true,
    },
  });

  const roamingFee = agreement?.roamingFee ?? 0.05;
  const feeAmount = Math.round(voucher.price * roamingFee * 100) / 100;

  const session = await prisma.roamingSession.create({
    data: {
      code, sourceHotspotId: voucher.hotspotId, destHotspotId,
      amount: voucher.price, roamingFee,
      commission: Math.round(voucher.price * 0.1 * 100) / 100,
    },
  });

  await prisma.voucher.update({ where: { id: voucher.id }, data: { status: 'USED', usedAt: new Date() } });
  res.status(201).json(session);
});

router.post('/end', validate(endSchema), async (req: Request, res: Response) => {
  const { id, dataUsed, sessionDuration } = req.body;
  const session = await prisma.roamingSession.findUnique({ where: { id } });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  const updated = await prisma.roamingSession.update({
    where: { id },
    data: { status: 'COMPLETED', endedAt: new Date(), dataUsed: dataUsed ?? session.dataUsed, sessionDuration: sessionDuration ?? session.sessionDuration },
  });
  res.json(updated);
});

router.get('/agreements', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = { OR: [{ providerIspId: req.user!.userId }, { consumerIspId: req.user!.userId }] };
  const [agreements, total] = await Promise.all([
    prisma.roamingAgreement.findMany({ where, include: { settlements: { take: 5, orderBy: { createdAt: 'desc' } } }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.roamingAgreement.count({ where }),
  ]);
  res.json({ data: agreements, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/agreements', requireRole('ADMIN'), validate(agreementSchema), async (req: Request, res: Response) => {
  const agreement = await prisma.roamingAgreement.create({ data: req.body });
  res.status(201).json(agreement);
});

router.get('/settlements', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const [settlements, total] = await Promise.all([
    prisma.roamingSettlement.findMany({
      include: { agreement: { select: { name: true } }, sessions: { select: { id: true, amount: true, code: true, status: true } } },
      skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.roamingSettlement.count(),
  ]);
  res.json({ data: settlements, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/settlements', requireRole('ADMIN'), validate(settlementSchema), async (req: Request, res: Response) => {
  const { agreementId, periodStart, periodEnd } = req.body;
  const sessions = await prisma.roamingSession.findMany({
    where: {
      settlementId: null, status: 'COMPLETED',
      createdAt: { gte: new Date(periodStart), lte: new Date(periodEnd) },
      OR: [{ sourceHotspot: { userId: req.user!.userId } }, { destHotspot: { userId: req.user!.userId } }],
    },
  });

  const totalAmount = sessions.reduce((sum, s) => sum + s.amount, 0);
  const totalFee = sessions.reduce((sum, s) => sum + s.commission + s.roamingFee * s.amount, 0);

  if (sessions.length === 0) return res.status(400).json({ error: 'Aucune session a regler dans cette periode' });

  const settlement = await prisma.roamingSettlement.create({
    data: {
      agreementId, periodStart: new Date(periodStart), periodEnd: new Date(periodEnd),
      totalAmount, totalFee: Math.round(totalFee * 100) / 100,
      netAmount: Math.round((totalAmount - totalFee) * 100) / 100,
      sessions: { connect: sessions.map((s) => ({ id: s.id })) },
    },
  });
  res.status(201).json(settlement);
});

router.patch('/settlements/:id/settle', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const updated = await prisma.roamingSettlement.update({ where: { id: req.params.id }, data: { status: 'SETTLED', settledAt: new Date() } });
  res.json(updated);
});

export default router;
