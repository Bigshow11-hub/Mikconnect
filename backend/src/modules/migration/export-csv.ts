/**
 * Export CSV des données migrées DigHiConnect:
 *   - hotspots.csv  (1 ligne)
 *   - plans.csv     (5 lignes)
 *   - vouchers.csv  (336 lignes, format ouvert)
 *   - mapping.csv   (DGC.public_uuid <-> Mikconnect.id)
 *
 * Sortie : ../migration-dighiconnect/exports/
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const RAW_DIR = path.resolve(__dirname, '../../../../migration-dighiconnect/raw');
const EXPORT_DIR = path.resolve(__dirname, '../../../../migration-dighiconnect/exports');

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function writeCSV(name: string, header: string[], rows: any[][]): string {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const fp = path.join(EXPORT_DIR, name);
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  fs.writeFileSync(fp, lines.join('\r\n'), 'utf-8');
  return fp;
}

async function main() {
  console.log('=== EXPORT CSV ===');
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  // 1) Hotspots
  const hotspots = await prisma.hotspot.findMany({ include: { user: true } });
  const hsRows = hotspots.map((h) => [
    h.id, h.name, h.location, h.routerIp, h.routerPort, h.status,
    h.bandwidth, h.macAddress, h.serialNumber, h.username, h.password,
    h.userId, h.user.email, h.createdAt.toISOString(), h.updatedAt.toISOString(),
  ]);
  const hsPath = writeCSV(
    'hotspots.csv',
    ['mik_id', 'name', 'location', 'routerIp', 'routerPort', 'status', 'bandwidth',
     'macAddress', 'serialNumber', 'mikrotik_username', 'mikrotik_password_placeholder',
     'mik_userId', 'owner_email', 'createdAt', 'updatedAt'],
    hsRows,
  );

  // 2) Plans
  const plans = await prisma.plan.findMany({ include: { hotspot: true } });
  const planRows = plans.map((p) => [
    p.id, p.name, p.type, p.duration, p.price, p.bandwidth,
    String(p.isActive), p.hotspotId, p.hotspot.name, p.createdAt.toISOString(),
  ]);
  const plansPath = writeCSV(
    'plans.csv',
    ['mik_id', 'name', 'type', 'duration_minutes', 'price', 'bandwidth',
     'isActive', 'hotspotId', 'hotspot_name', 'createdAt'],
    planRows,
  );

  // 3) Vouchers
  const vs = await prisma.voucher.findMany({
    include: { hotspot: true, plan: true },
    orderBy: { createdAt: 'asc' },
  });
  const vsRows = vs.map((v) => [
    v.id, v.code, v.price, v.status,
    v.usedAt?.toISOString() ?? '', v.expiresAt?.toISOString() ?? '',
    v.hotspotId, v.hotspot.name,
    v.planId, v.plan?.name ?? '',
    v.transactionId ?? '', v.pdfUrl ?? '',
    v.createdAt.toISOString(),
  ]);
  const vsPath = writeCSV(
    'vouchers.csv',
    ['mik_id', 'code', 'price', 'status', 'used_at', 'expires_at',
     'hotspotId', 'hotspot_name', 'planId', 'plan_name',
     'transactionId', 'pdfUrl', 'createdAt'],
    vsRows,
  );

  // 4) Mapping DGC <-> Mik (en lisant le JSON DGC source)
  const dgcHotspots = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'hotspots.json'), 'utf-8')).results;
  const dgcOffers = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'offers.json'), 'utf-8')).results;
  const mapRows: any[][] = [];
  for (const dh of dgcHotspots) {
    const mh = hotspots.find((x) => x.name === dh.name);
    if (mh) mapRows.push(['hotspot', dh.id, mh.id, dh.name, dh.public_uuid, '']);
  }
  for (const o of dgcOffers) {
    const mp = plans.find((x) => x.name === o.name);
    if (mp) mapRows.push(['offer', o.id, mp.id, o.name, '', o.public_uuid]);
  }
  const mapPath = writeCSV(
    'mapping.csv',
    ['resource', 'dgc_id', 'mik_id', 'name', 'hotspot_dgc_uuid', 'offer_dgc_uuid'],
    mapRows,
  );

  console.log('Fichiers écrits :');
  console.log('  ', hsPath, '(', hsRows.length, 'lignes)');
  console.log('  ', plansPath, '(', planRows.length, 'lignes)');
  console.log('  ', vsPath, '(', vsRows.length, 'lignes)');
  console.log('  ', mapPath, '(', mapRows.length, 'lignes)');
  console.log('Total octets :', hsRows.length + planRows.length + vsRows.length + mapRows.length);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
