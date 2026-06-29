import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  commission: z.coerce.number().min(0).max(100).default(0),
});

const updateSchema = createSchema.partial();

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    const where = { userId: req.user!.userId };
    const [resellers, total] = await Promise.all([
      prisma.reseller.findMany({ where, include: { children: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.reseller.count({ where }),
    ]);
    res.json({ data: resellers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.post('/', validate(createSchema), async (req: Request, res: Response, next) => {
  try {
    const { name, phone, email, commission } = req.body;
    const reseller = await prisma.reseller.create({
      data: { name, phone, email, commission, userId: req.user!.userId },
    });
    res.status(201).json(reseller);
  } catch (err) { next(err); }
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next) => {
  try {
    const updated = await prisma.reseller.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await prisma.reseller.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reseller deleted' });
  } catch (err) { next(err); }
});

export default router;
