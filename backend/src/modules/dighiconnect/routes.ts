import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { getDigHiConnect, DigHiConnectService } from '../../services/dighiconnect';

const router = Router();

/**
 * DigHiConnect integration — proxy endpoints that let mikconnect admins
 * pull data from DigHiConnect's Public API without exposing the API key
 * to the frontend. DigHi credentials stay in backend .env.
 *
 * All routes require auth (regular admin user).
 *
 * Mounted at /api/dighiconnect in src/index.ts.
 */

router.use(authenticate);

/** Parse integer query params with a sane default. */
const intQ = (v: unknown): number | undefined => {
  if (v === undefined || v === '' || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Uniform upstream-error wrapping. */
const call = async (res: Response, fn: () => Promise<any>) => {
  try {
    const data = await fn();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'dig-hiconnect unreachable', detail: err.message });
  }
};

/** Strip trailing slash from a path key. Helper for dynamic endpoints. */
const keyFromReq = (req: Request, fallback: string): string =>
  String(req.params.endpoint || fallback).replace(/^\/+|\/+$/g, '');

/** GET /api/dighiconnect/endpoints — full upstream index */
router.get('/endpoints', (_req, res) =>
  call(res, async () => ({ data: await getDigHiConnect().listEndpoints() })),
);

/** GET /api/dighiconnect/hotspots?search=&page=&pageSize= */
router.get('/hotspots', (req, res) => {
  const { search, page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listHotspots({
    search, page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/** GET /api/dighiconnect/hotspots/find?name=kolia */
router.get('/hotspots/find', async (req, res) => {
  const name = String(req.query.name || '');
  if (!name) return res.status(400).json({ error: 'name query param required' });
  try {
    const found = await getDigHiConnect().findHotspotByName(name);
    if (!found) return res.status(404).json({ error: 'no hotspot matches' });
    res.json(found);
  } catch (err: any) {
    res.status(502).json({ error: 'dig-hiconnect unreachable', detail: err.message });
  }
});

/** GET /api/dighiconnect/vouchers?hotspot=&page=&pageSize= */
router.get('/vouchers', (req, res) => {
  const { hotspot, page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listVouchers({
    hotspot: intQ(hotspot), page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/** GET /api/dighiconnect/offers?hotspot=&page=&pageSize= */
router.get('/offers', (req, res) => {
  const { hotspot, page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listOffers({
    hotspot: intQ(hotspot), page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/** GET /api/dighiconnect/bandwidth-profiles */
router.get('/bandwidth-profiles', (req, res) => {
  const { page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listBandwidthProfiles({
    page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/** GET /api/dighiconnect/monitoring-links */
router.get('/monitoring-links', (req, res) => {
  const { page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listMonitoringLinks({
    page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/** GET /api/dighiconnect/api-keys — never returns full keys (DigHi only shows prefix) */
router.get('/api-keys', (req, res) => {
  const { page, pageSize } = req.query as Record<string, string>;
  call(res, () => getDigHiConnect().listApiKeys({
    page: intQ(page), pageSize: intQ(pageSize),
  }));
});

/**
 * GET /api/dighiconnect/proxy/:endpoint — generic escape hatch for any
 * endpoint in the index. Query params forwarded as-is. Returns one page.
 *
 * Useful while we're still discovering the schema — once a route gets
 * a dedicated handler, prefer that.
 *
 * Example:  GET /api/dighiconnect/proxy/resellers?page=1
 */
router.get('/proxy/:endpoint', async (req, res) => {
  const endpoint = keyFromReq(req, '');
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  await call(res, () =>
    getDigHiConnect().listPage(endpoint, req.query as Record<string, string>),
  );
});

export default router;
