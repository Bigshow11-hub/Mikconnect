import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { validate, paginationSchema } from '../../middleware/validate';
import { MikroTikService } from '../../services/mikrotik';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  routerIp: z.string().optional(),
  routerPort: z.coerce.number().int().default(8728),
  username: z.string().optional(),
  password: z.string().optional(),
  bandwidth: z.string().optional(),
});
const updateSchema = createSchema.partial();

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;
  const [hotspots, total] = await Promise.all([
    prisma.hotspot.findMany({
      where: { userId: req.user!.userId },
      include: { plans: true, _count: { select: { vouchers: true } } },
      skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    prisma.hotspot.count({ where: { userId: req.user!.userId } }),
  ]);
  res.json({ data: hotspots, total, page, limit, totalPages: Math.ceil(total / limit) });
});

/** GET /hotspots/active — utilisateurs en ligne sur tous les hotspots de l'user */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const hotspots = await prisma.hotspot.findMany({
      where: { userId: req.user!.userId },
      select: { id: true, name: true, location: true, routerIp: true, routerPort: true, username: true, password: true },
    });

    const results = await Promise.allSettled(
      hotspots.map(async (hs) => {
        if (!hs.routerIp || !hs.username) return { hotspotId: hs.id, name: hs.name, location: hs.location, online: 0, sessions: [] };
        try {
          const mt = new MikroTikService();
          await mt.connect({ host: hs.routerIp, port: hs.routerPort || 8728, username: hs.username, password: hs.password || '' });
          const active = await mt.getActiveSessions();
          await mt.disconnect();
          return {
            hotspotId: hs.id,
            name: hs.name,
            location: hs.location,
            online: active.length,
            sessions: active.slice(0, 10).map((s: any) => ({
              user: s.name || s.user || '?',
              address: s.address || '?',
              uptime: s.uptime || '?',
              bytesIn: s['bytes-in'] || 0,
              bytesOut: s['bytes-out'] || 0,
            })),
          };
        } catch {
          return { hotspotId: hs.id, name: hs.name, location: hs.location, online: 0, sessions: [], error: true };
        }
      })
    );

    const totalOnline = results.reduce((sum, r) => r.status === 'fulfilled' ? sum + (r.value as any).online : sum, 0);

    res.json({
      totalOnline,
      hotspots: results.map((r) => r.status === 'fulfilled' ? r.value : { online: 0, error: true }),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const hotspot = await prisma.hotspot.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { plans: true, vouchers: { take: 20, orderBy: { createdAt: 'desc' } } },
  });
  if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });
  res.json(hotspot);
});

router.post('/', validate(createSchema), async (req: Request, res: Response) => {
  const data = req.body;
  const hotspot = await prisma.hotspot.create({
    data: { ...data, userId: req.user!.userId },
  });
  res.status(201).json(hotspot);
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response) => {
  const existing = await prisma.hotspot.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!existing) return res.status(404).json({ error: 'Hotspot not found' });
  const updated = await prisma.hotspot.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const existing = await prisma.hotspot.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!existing) return res.status(404).json({ error: 'Hotspot not found' });
  await prisma.hotspot.delete({ where: { id: req.params.id } });
  res.json({ message: 'Hotspot deleted' });
});

export default router;