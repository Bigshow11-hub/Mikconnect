import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']),
  duration: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
  bandwidth: z.string().optional(),
  hotspotId: z.string().uuid(),
});

const updateSchema = createSchema.partial();

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const [plans, total] = await Promise.all([
    prisma.plan.findMany({
      where: { hotspot: { userId: req.user!.userId } },
      include: { hotspot: { select: { name: true } } },
      skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.plan.count({ where: { hotspot: { userId: req.user!.userId } } }),
  ]);
  res.json({ data: plans, total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/hotspot/:hotspotId', async (req: Request, res: Response) => {
  const plans = await prisma.plan.findMany({
    where: { hotspotId: req.params.hotspotId, hotspot: { userId: req.user!.userId } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(plans);
});

router.post('/', validate(createSchema), async (req: Request, res: Response) => {
  const plan = await prisma.plan.create({ data: req.body });
  res.status(201).json(plan);
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response) => {
  const updated = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.plan.delete({ where: { id: req.params.id } });
  res.json({ message: 'Plan deleted' });
});

export default router;
