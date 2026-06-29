import { Router, Request, Response } from 'express';
import { prisma } from '../../index';
import { authenticate } from '../../middleware/auth';
import { MikroTikService } from '../../services/mikrotik';

const router = Router();

router.use(authenticate);

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });

    const mt = new MikroTikService();
    try {
      await mt.connect({
        host: hotspot.routerIp,
        port: hotspot.routerPort,
        username: hotspot.username,
        password: hotspot.password,
      });
      const resources = await mt.getSystemResources();
      await mt.disconnect();
      res.json({ success: true, resources });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Connection failed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/sync-vouchers', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { plans: true, vouchers: { where: { status: 'ACTIVE' } } },
    });
    if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });

    const mt = new MikroTikService();
    try {
      await mt.connect({
        host: hotspot.routerIp,
        port: hotspot.routerPort,
        username: hotspot.username,
        password: hotspot.password,
      });

      const results = [];
      for (const voucher of hotspot.vouchers) {
        try {
          await mt.addHotspotUser(
            voucher.code,
            voucher.code,
            'hotspot1',
            'default',
            `MikConnect-${voucher.id}`
          );
          results.push({ code: voucher.code, status: 'synced' });
        } catch (err: any) {
          results.push({ code: voucher.code, status: 'failed', error: err.message });
        }
      }

      await mt.disconnect();
      res.json({ success: true, synced: results.filter((r: any) => r.status === 'synced').length, results });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/disconnect-user', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });

    const { username } = req.body;
    const mt = new MikroTikService();
    await mt.connect({
      host: hotspot.routerIp,
      port: hotspot.routerPort,
      username: hotspot.username,
      password: hotspot.password,
    });

    const sessions = await mt.getActiveSessions();
    const userSession = sessions.find((s: any) => s.user === username);
    if (userSession) {
      await mt.removeHotspotUser(username);
    }

    await mt.disconnect();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/active-sessions', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });

    const mt = new MikroTikService();
    await mt.connect({
      host: hotspot.routerIp,
      port: hotspot.routerPort,
      username: hotspot.username,
      password: hotspot.password,
    });

    const sessions = await mt.getActiveSessions();
    await mt.disconnect();

    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/configure', async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { plans: true },
    });
    if (!hotspot) return res.status(404).json({ error: 'Hotspot not found' });

    const mt = new MikroTikService();
    try {
      await mt.connect({
        host: hotspot.routerIp,
        port: hotspot.routerPort,
        username: hotspot.username,
        password: hotspot.password,
      });

      const configResults: any[] = [];
      for (const plan of hotspot.plans) {
        if (plan.bandwidth) {
          try {
            const profileName = `MC-${plan.name.replace(/\s+/g, '')}`;
            await mt.addBandwidthProfile(profileName, plan.bandwidth);
            configResults.push({ plan: plan.name, profile: profileName, status: 'created' });
          } catch (err: any) {
            configResults.push({ plan: plan.name, status: 'failed', error: err.message });
          }
        }
      }

      await mt.disconnect();
      res.json({ success: true, configResults });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
