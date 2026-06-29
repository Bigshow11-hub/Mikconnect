/* Test live des routes MikConnect contre le serveur lancé sur :3002 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Lit .env (même chemin que dans index.ts). 
// __dirname = backend/src/modules/migration, donc ../../../.env = backend/.env
const dotenvPath = path.resolve(__dirname, '../../../.env');
const envContent = fs.existsSync(dotenvPath) ? fs.readFileSync(dotenvPath, 'utf8') : '';
const jwtSecret = (envContent.match(/JWT_SECRET="?([^"\n]+)"?/) || [])[1] || 'fallback';
console.log('JWT_SECRET len=', jwtSecret.length, '…');

function get(port: number, p: string, token?: string): Promise<{status: number; body: string}> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: p, method: 'GET',
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }, (res) => { let b=''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode || 0, body: b })); });
    req.on('error', reject); req.end();
  });
}

(async () => {
  const admin = await prisma.user.findUnique({ where: { email: 'bigishow57@gmail.com' } });
  if (!admin) { console.error('admin manquant'); process.exit(1); }

  const token = jwt.sign({ userId: admin.id, role: admin.role }, jwtSecret, { expiresIn: '1h' });
  console.log('JWT signe pour user', admin.email, 'len(token)=', token.length);
  const PORT = 3002;
  const HOTSPOT_ID = (await prisma.hotspot.findFirst({ where: { name: 'KOLIA WIFI ZONE' }, select: { id: true } }))?.id;
  if (!HOTSPOT_ID) throw new Error('hotspot introuvable');

  console.log('=== TESTS LIVE MikConnect sur port', PORT, '===');
  console.log('Hotspot ID:', HOTSPOT_ID);

  const h = await get(PORT, '/api/health');
  console.log(`\n[1] GET /api/health -> ${h.status} ${h.body}`);

  const hs = await get(PORT, '/api/hotspots?page=1&limit=10', token);
  const hsJ = JSON.parse(hs.body);
  console.log(`[2] GET /api/hotspots -> ${hs.status} total=${hsJ.total}`);
  for (const x of hsJ.data) console.log(`      ${x.name.padEnd(20)} plans=${x.plans?.length} vouchers=${x._count?.vouchers} status=${x.status}`);

  const pl = await get(PORT, `/api/plans/hotspot/${HOTSPOT_ID}`, token);
  const plans = JSON.parse(pl.body);
  console.log(`[3] GET /api/plans/hotspot/... -> ${pl.status} (${plans.length} plans)`);
  for (const p of plans) console.log(`      ${p.name.padEnd(12)} ${String(p.duration).padStart(6)}min ${String(p.price).padStart(7)}GNF (${p.type})`);

  for (const page of [1, 2, 7]) {
    const v = await get(PORT, `/api/vouchers/hotspot/${HOTSPOT_ID}?page=${page}&limit=20`, token);
    const j = JSON.parse(v.body);
    console.log(`[4] GET /api/vouchers/hotspot/...?page=${page} -> ${v.status} total=${j.total} returned=${j.data?.length}`);
    if (j.data?.[0]) console.log(`      sample code=${j.data[0].code} plan=${j.data[0].plan?.name} expiresAt=${j.data[0].expiresAt}`);
  }

  const all = await get(PORT, `/api/vouchers?page=1&limit=100`, token);
  console.log(`[5] GET /api/vouchers (index, page=1 limit=100) -> ${all.status} total=${JSON.parse(all.body).total}`);

  console.log('\n[6] Test /api/hotspots/active (connexion Mikrotik réelle — va probablement timeout)');
  const t0 = Date.now();
  try {
    const act = await get(PORT, `/api/hotspots/active`, token);
    console.log(`     -> ${act.status} en ${Date.now()-t0}ms`);
    console.log(`     body (extrait): ${act.body.slice(0, 200)}`);
  } catch (e: any) {
    console.log(`     TIMEOUT en ${Date.now()-t0}ms: ${e.message}`);
  }

  await prisma.$disconnect();
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
