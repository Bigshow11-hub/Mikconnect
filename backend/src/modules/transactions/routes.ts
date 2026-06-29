import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().min(1),
  phoneNumber: z.string().optional(),
  hotspotId: z.string().uuid().optional(),
  metadata: z.any().optional(),
});

const statusSchema = z.object({ status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']) });

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = { userId: req.user!.userId };
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/hotspot/:hotspotId', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const where = { hotspotId: req.params.hotspotId };
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post('/', validate(createSchema), async (req: Request, res: Response) => {
  const { amount, method, phoneNumber, hotspotId, metadata } = req.body;
  const reference = `MC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const transaction = await prisma.transaction.create({
    data: { amount, method, phoneNumber, reference, hotspotId, userId: req.user!.userId, metadata },
  });
  res.status(201).json(transaction);
});

router.patch('/:id/status', validate(statusSchema), async (req: Request, res: Response) => {
  const { status } = req.body;
  const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: { status } });
  res.json(updated);
});

export default router;
