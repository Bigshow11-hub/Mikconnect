import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import crypto from 'crypto';
import { paginationSchema } from '../../middleware/validate';

const router = Router();

const validateSchema = z.object({ code: z.string().length(8) });
const generateSchema = z.object({
  planId: z.string().uuid(),
  hotspotId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

router.post('/validate', validate(validateSchema), async (req: Request, res: Response) => {
  const { code } = req.body;
  const voucher = await prisma.voucher.findUnique({
    where: { code }, include: { plan: true, hotspot: true },
  });
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
  if (voucher.status !== 'ACTIVE') return res.status(400).json({ error: `Voucher is ${voucher.status}` });
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    await prisma.voucher.update({ where: { id: voucher.id }, data: { status: 'EXPIRED' } });
    return res.status(400).json({ error: 'Voucher expired' });
  }
  res.json({ valid: true, voucher });
});

router.use(authenticate);

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
}

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = { hotspot: { userId: req.user!.userId } };
  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: { hotspot: { select: { name: true } }, plan: { select: { name: true } } },
      skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.voucher.count({ where }),
  ]);
  res.json({ data: vouchers, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/hotspot/:hotspotId', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = { hotspotId: req.params.hotspotId };
  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.voucher.count({ where }),
  ]);
  res.json({ data: vouchers, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/generate', validate(generateSchema), async (req: Request, res: Response) => {
  const { planId, hotspotId, quantity } = req.body;
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const codes: string[] = [];
  const voucherData = [];
  for (let i = 0; i < quantity; i++) {
    const code = generateCode();
    codes.push(code);
    voucherData.push({
      code, price: plan.price,
      expiresAt: new Date(Date.now() + plan.duration * 60 * 1000),
      hotspotId, planId,
    });
  }
  await prisma.voucher.createMany({ data: voucherData });
  res.status(201).json({ codes, quantity, plan: plan.name });
});

export default router;
