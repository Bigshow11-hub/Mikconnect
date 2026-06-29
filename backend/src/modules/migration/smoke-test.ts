/**
 * Smoke-test de l'API mikconnect contre dev.db :
 *   1. signe un JWT pour l'admin bigishow57
 *   2. démarre index.ts via tsx en background
 *   3. ping /api/health
 *   4. GET /api/hotspots, /api/plans, /api/vouchers/hotspot/:id
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

const PORT = parseInt(process.env.PORT || '3001');

// Résolution manuelle (évite de monter un module jwt ici)
import * as crypto from 'crypto';
function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signJwt(payload: object, secret: string): string {
  const headerEnc = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEnc = b64url(JSON.stringify(payload));
  const data = `${headerEnc}.${payloadEnc}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function get(url: string, token?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: http.RequestOptions = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method: 'GET', headers: { Accept: 'application/json' },
    };
    if (token) (opts.headers as any).Authorization = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let body = ''; res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  // 0) Récup user admin
  const admin = await prisma.user.findUnique({ where: { email: 'bigishow57@gmail.com' } });
  if (!admin) { console.error('Admin introuvable'); process.exit(1); }
  console.log('Admin:', admin.id, admin.email);

  const jwtSecret = process.env.JWT_SECRET || 'mikconnect-super-secret-key-change-in-production';
  const token = signJwt({ userId: admin.id, role: admin.role }, jwtSecret);
  console.log('JWT généré (longueur:', token.length, ')');

  // 1) Démarrage du serveur
  const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.resolve(__dirname, '../../'),
    env: { ...process.env, PORT: String(PORT) },
    shell: true,
  });
  let out = '';
  serverProcess.stdout?.on('data', (d) => { out += d.toString(); });
  serverProcess.stderr?.on('data', (d) => { out += d.toString(); });
  await sleep(4000);
  console.log('--- server boot log ---');
  console.log(out.split('\n').slice(-15).join('\n'));
  console.log('------------------------');

  // 2) Health
  const health = await get(`http://127.0.0.1:${PORT}/api/health`);
  console.log(`GET /api/health -> HTTP ${health.status}  ${health.body}`);

  // 3) Hotspots (auth)
  const hs = await get(`http://127.0.0.1:${PORT}/api/hotspots?page=1&limit=10`, token);
  console.log(`GET /api/hotspots -> HTTP ${hs.status}`);
  let hotspotId: string | null = null;
  try {
    const j = JSON.parse(hs.body);
    console.log(`  total=${j.total} returned=${j.data?.length}`);
    j.data?.forEach((h: any) => {
      console.log(`    - ${h.name} (${h.id}) status=${h.status}`); hotspotId = h.id;
    });
  } catch {}

  if (hotspotId) {
    // 4) Plans de ce hotspot
    const ps = await get(`http://127.0.0.1:${PORT}/api/plans/hotspot/${hotspotId}`, token);
    console.log(`GET /api/plans/hotspot/${hotspotId} -> HTTP ${ps.status}`);
    try { JSON.parse(ps.body).forEach((p: any) => console.log(`    - ${p.name} (${p.duration}min ${p.price}GNF)`)); } catch {}

    // 5) Vouchers page 1
    const vs = await get(`http://127.0.0.1:${PORT}/api/vouchers/hotspot/${hotspotId}?page=1&limit=5`, token);
    console.log(`GET /api/vouchers/hotspot/${hotspotId} -> HTTP ${vs.status}`);
    try { const j = JSON.parse(vs.body); console.log(`  total=${j.total} returned=${j.data?.length}`); j.data?.slice(0,5).forEach((v:any)=>console.log(`    - ${v.code} ${v.status} plan=${v.plan?.name}`)); } catch {}
  }

  serverProcess.kill();
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
