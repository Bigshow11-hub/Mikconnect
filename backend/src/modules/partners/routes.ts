import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(1).default(0.10),
});

const updateSchema = createSchema.partial();

router.get('/', async (_req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(_req.query);
  const skip = (page - 1) * limit;
  const [partners, total] = await Promise.all([
    prisma.partner.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.partner.count(),
  ]);
  res.json({ data: partners, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/', validate(createSchema), async (req: Request, res: Response) => {
  const { name, email, phone, commissionRate } = req.body;
  const referralCode = `MC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const partner = await prisma.partner.create({
    data: { name, email, phone, commissionRate, referralCode },
  });
  res.status(201).json(partner);
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response) => {
  const updated = await prisma.partner.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});

export default router;
