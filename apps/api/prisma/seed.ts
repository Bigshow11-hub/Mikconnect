// mikconnect — seed initial.
//
// Crée deux tenants de démo (CI + GN) avec owner, forfaits par défaut et
// subscription FREE. Utilisé pour le dev local et les tests d'intégration.
//
// Lancé via : pnpm db:seed (→ prisma db seed → ts-node prisma/seed.ts).
import {
  PrismaClient,
  Country,
  Currency,
  Role,
  SubscriptionTier,
  SubscriptionStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding mikconnect…");

  // --- Tenant CI : Zone Plateau (Abidjan) ---
  const ciTenant = await prisma.tenant.upsert({
    where: { id: "tenant-demo-ci" },
    update: {},
    create: {
      id: "tenant-demo-ci",
      name: "Zone Plateau",
      country: Country.CI,
      currency: Currency.XOF,
      tier: SubscriptionTier.FREE,
      users: {
        create: {
          id: "user-owner-ci",
          email: "owner.ci@mikconnect.test",
          passwordHash: await bcrypt.hash("password123", 12),
          role: Role.OWNER,
          name: "Propriétaire CI",
          phone: "+225 07 00 00 00 01",
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.TRIALING,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      plans: {
        createMany: {
          data: [
            { name: "Express", durationMinutes: 60, price: 100, currency: Currency.XOF },
            { name: "Demi-journée", durationMinutes: 6 * 60, price: 300, currency: Currency.XOF },
            { name: "Journalier", durationMinutes: 24 * 60, price: 500, currency: Currency.XOF },
            { name: "Hebdo", durationMinutes: 7 * 24 * 60, price: 2000, currency: Currency.XOF },
          ],
        },
      },
    },
  });

  // --- Tenant GN : Zone Kaloum (Conakry) ---
  const gnTenant = await prisma.tenant.upsert({
    where: { id: "tenant-demo-gn" },
    update: {},
    create: {
      id: "tenant-demo-gn",
      name: "Zone Kaloum",
      country: Country.GN,
      currency: Currency.GNF,
      tier: SubscriptionTier.FREE,
      users: {
        create: {
          id: "user-owner-gn",
          email: "owner.gn@mikconnect.test",
          passwordHash: await bcrypt.hash("password123", 12),
          role: Role.OWNER,
          name: "Propriétaire GN",
          phone: "+224 620 00 00 01",
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.TRIALING,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      plans: {
        createMany: {
          data: [
            { name: "Express", durationMinutes: 60, price: 1000, currency: Currency.GNF },
            { name: "Demi-journée", durationMinutes: 6 * 60, price: 3000, currency: Currency.GNF },
            { name: "Journalier", durationMinutes: 24 * 60, price: 5000, currency: Currency.GNF },
            { name: "Hebdo", durationMinutes: 7 * 24 * 60, price: 20000, currency: Currency.GNF },
          ],
        },
      },
    },
  });

  console.log(`  ✓ Tenant CI: ${ciTenant.id} (${ciTenant.name})`);
  console.log(`  ✓ Tenant GN: ${gnTenant.id} (${gnTenant.name})`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
