/**
 * Seed DigHiConnect -> Mikconnect
 * Lit les JSON de migration-dighiconnect/raw/ et injecte dans dev.db via Prisma.
 * Idempotent : skip si Hotspot "KOLIA WIFI ZONE" existe déjà.
 *
 * Mapping :
 *   DGC hotspot  -> mikconnect.Hotspot  (userId = bigishow57@gmail.com)
 *   DGC offers   -> mikconnect.Plan     (duration = minutes, type ∈ HOURLY/DAILY/WEEKLY/MONTHLY)
 *   DGC vouchers -> mikconnect.Voucher  (code préservé, status=ACTIVE)
 *
 * Secrets PROD non migrés : public_token, radius_secret, fedapay_public_key.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const RAW_DIR = path.resolve(__dirname, '../../../../migration-dighiconnect/raw');
//                                  ^^^ 5 niveaux : migration -> modules -> src -> backend -> mikconnect -> migration-dighiconnect/raw
// Quand lancé depuis /backend (cwd), __dirname pointe vers /backend/src/modules/migration, donc on remonte jusqu'à /mikconnect.

function loadJSON<T = any>(name: string): T {
  const p = path.join(RAW_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

/** Mappe duration_minutes -> type enum mikconnect (HOURLY/DAILY/WEEKLY/MONTHLY). */
function inferPlanType(durationMinutes: number): 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' {
  if (durationMinutes < 60) return 'HOURLY';
  if (durationMinutes < 60 * 24) return 'HOURLY';
  if (durationMinutes < 60 * 24 * 7) return 'DAILY';
  if (durationMinutes < 60 * 24 * 30) return 'WEEKLY';
  return 'MONTHLY';
}

async function main() {
  console.log('=== SEED DigHiConnect -> Mikconnect ===');
  console.log('Date:', new Date().toISOString());
  console.log('__dirname =', __dirname);
  console.log('RAW_DIR   =', RAW_DIR, '(exists=' + fs.existsSync(RAW_DIR) + ')');
  console.log('');

  // 0) Vérif Hotspot "KOLIA WIFI ZONE" déjà présent
  const existing = await prisma.hotspot.findFirst({ where: { name: 'KOLIA WIFI ZONE' } });
  if (existing) {
    console.log('Hotspot "KOLIA WIFI ZONE" déjà présent (id=' + existing.id + '). Seed annulé (idempotent).');
    const c = await prisma.voucher.count({ where: { hotspotId: existing.id } });
    const p = await prisma.plan.count({ where: { hotspotId: existing.id } });
    console.log(`État actuel : ${p} Plan(s), ${c} Voucher(s) pour ce Hotspot.`);
    await prisma.$disconnect();
    return;
  }

  // 1) Charge JSON source
  const hotspotsDgc = loadJSON<{ results: any[] }>('hotspots').results;
  const offersDgc = loadJSON<{ results: any[] }>('offers').results;
  const vouchersDgc = loadJSON<{ results: any[] }>('vouchers').results;

  console.log(`Chargé : ${hotspotsDgc.length} hotspot(s), ${offersDgc.length} offer(s), ${vouchersDgc.length} voucher(s) DGC.`);

  const adminEmail = 'bigishow57@gmail.com';
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) { throw new Error(`Aucun User ${adminEmail} trouvé en base.`); }
  console.log(`Admin user: ${admin.id} (${admin.name})`);

  // 2) Crée les Hotspots (=1)
  let hotspotsCreated = 0;
  const dgcIdToMikId = new Map<number, string>();
  for (const h of hotspotsDgc) {
    const created = await prisma.hotspot.create({
      data: {
        name: h.name,
        location: h.address || null,
        routerIp: h.router_ip,
        routerPort: 8728,
        // Secrets PROD ABSENTS volontairement (security)
        username: 'radius-imported',
        password: '-REDACTED-' as string, // Vous remplacerez par la vraie paire du routeur
        status: h.is_active ? 'ACTIVE' : 'INACTIVE',
        bandwidth: h.bandwidth || 'illimité',
        macAddress: null,
        serialNumber: null,
        userId: admin.id,
      },
    });
    hotspotsCreated++;
    dgcIdToMikId.set(h.id, created.id);
    console.log(`  Hotspot créé: ${created.name} (mik=${created.id})`);
  }

  // 3) Crée les Plans
  let plansCreated = 0;
  const dgcOfferIdToMikPlanId = new Map<number, string>();
  for (const o of offersDgc) {
    const hotspotMikId = dgcIdToMikId.get(o.hotspot);
    if (!hotspotMikId) throw new Error(`Pas de Hotspot mikconnect pour offer.hotspot=${o.hotspot}`);

    const created = await prisma.plan.create({
      data: {
        name: o.name,
        type: inferPlanType(o.duration_minutes),
        duration: o.duration_minutes, // DGC en minutes ==> mikconnect aussi en minutes
        price: parseFloat(o.price_fcfa), // GNF, string -> float
        bandwidth: o.bandwidth_profile_details?.speed_display || 'illimité',
        isActive: o.is_active,
        hotspotId: hotspotMikId,
      },
    });
    plansCreated++;
    dgcOfferIdToMikPlanId.set(o.id, created.id);
    console.log(`  Plan créé: ${created.name} (${created.duration}min ${created.price}GNF)`);
  }

  // 4) Crée les Vouchers (par lots de 100)
  let vouchersCreated = 0;
  const batch: any[] = [];
  const BATCH = 100;
  for (const v of vouchersDgc) {
    const hotspotMikId = dgcIdToMikId.get(v.hotspot_id);
    const planMikId = dgcOfferIdToMikPlanId.get(v.offer);
    if (!hotspotMikId) { console.warn(`Skip voucher ${v.code} : hotspot introuvable`); continue; }
    if (!planMikId) { console.warn(`Skip voucher ${v.code} : offer introuvable`); continue; }

    batch.push({
      code: v.code,
      price: parseFloat(v.offer_price ?? v.transaction_amount ?? '0'),
      status: v.status === 'active' ? 'ACTIVE' : 'USED',
      usedAt: v.used_at ? new Date(v.used_at) : null,
      expiresAt: v.expires_at ? new Date(v.expires_at) : null,
      hotspotId: hotspotMikId,
      planId: planMikId,
      transactionId: null, // transactions DGC non exposées
      createdAt: new Date(v.created_at),
    });

    if (batch.length >= BATCH) {
      const r = await prisma.voucher.createMany({ data: batch });
      vouchersCreated += r.count;
      batch.length = 0;
    }
  }
  if (batch.length) {
    const r = await prisma.voucher.createMany({ data: batch });
    vouchersCreated += r.count;
  }

  console.log('');
  console.log('=== RÉSULTAT ===');
  console.log(`Hotspots créés: ${hotspotsCreated}/${hotspotsDgc.length}`);
  console.log(`Plans créés:    ${plansCreated}/${offersDgc.length}`);
  console.log(`Vouchers créés: ${vouchersCreated}/${vouchersDgc.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('SEED ERREUR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
