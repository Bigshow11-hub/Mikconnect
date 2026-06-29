import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  country: z.string().optional(),
});

router.get('/', requireRole('ADMIN'), validate(paginationSchema), async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limitNum,
      select: { id: true, name: true, email: true, role: true, phone: true, companyName: true, country: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

router.patch('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { active } = req.body;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: active },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  res.json(user);
});

router.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, phone: true, companyName: true, country: true, isActive: true, createdAt: true },
  });
  res.json(user);
});

router.put('/me', validate(updateSchema), async (req: Request, res: Response) => {
  const { name, phone, companyName, country } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, phone, companyName, country },
    select: { id: true, email: true, name: true, role: true, phone: true, companyName: true, country: true },
  });
  res.json(user);
});

router.get('/stats', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const [hotspots, vouchers, transactions, activeVouchers] = await Promise.all([
    prisma.hotspot.count({ where: { userId } }),
    prisma.voucher.count({ where: { hotspot: { userId } } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.voucher.count({ where: { hotspot: { userId }, status: 'ACTIVE' } }),
  ]);
  res.json({ totalHotspots: hotspots, totalVouchers: vouchers, totalTransactions: transactions, activeVouchers });
});

export default router;
