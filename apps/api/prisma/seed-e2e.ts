import {
  Country,
  Currency,
  PrismaClient,
  Role,
  SubscriptionStatus,
  SubscriptionTier,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const password = "E2e-password-123";

const tenants = [
  {
    id: "tenant-e2e-gn",
    name: "Zone Kaloum E2E",
    country: Country.GN,
    currency: Currency.GNF,
    ownerId: "user-owner-e2e-gn",
    ownerName: "Aminata Diallo",
    ownerEmail: "owner.gn.e2e@mikconnect.test",
    phone: "+224620000001",
    zoneId: "zone-e2e-gn",
    zoneName: "Kaloum Centre",
    plans: [
      { id: "plan-e2e-gn-express", name: "Express", durationMinutes: 60, price: 1000 },
      { id: "plan-e2e-gn-day", name: "Journalier", durationMinutes: 1440, price: 5000 },
    ],
  },
  {
    id: "tenant-e2e-ci",
    name: "Zone Plateau E2E",
    country: Country.CI,
    currency: Currency.XOF,
    ownerId: "user-owner-e2e-ci",
    ownerName: "Koffi Yao",
    ownerEmail: "owner.ci.e2e@mikconnect.test",
    phone: "+2250700000001",
    zoneId: "zone-e2e-ci",
    zoneName: "Plateau Centre",
    plans: [
      { id: "plan-e2e-ci-express", name: "Express", durationMinutes: 60, price: 100 },
      { id: "plan-e2e-ci-day", name: "Journalier", durationMinutes: 1440, price: 500 },
    ],
  },
] as const;

async function main() {
  const target = process.env.DATABASE_URL ?? "";
  const parsed = new URL(target);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const schemaName = parsed.searchParams.get("schema") ?? "public";
  if (!`${databaseName}:${schemaName}`.toLowerCase().includes("e2e")) {
    throw new Error(
      "Le seed E2E refuse toute base dont le nom ou le schéma ne contient pas « e2e ». ",
    );
  }

  await prisma.tenant.deleteMany({ where: { id: { in: tenants.map((tenant) => tenant.id) } } });
  const passwordHash = await bcrypt.hash(password, 8);

  for (const tenant of tenants) {
    await prisma.tenant.create({
      data: {
        id: tenant.id,
        name: tenant.name,
        country: tenant.country,
        currency: tenant.currency,
        tier: SubscriptionTier.FREE,
        users: {
          create: {
            id: tenant.ownerId,
            email: tenant.ownerEmail,
            passwordHash,
            role: Role.OWNER,
            name: tenant.ownerName,
            phone: tenant.phone,
          },
        },
        zones: { create: { id: tenant.zoneId, name: tenant.zoneName } },
        plans: {
          create: tenant.plans.map((plan) => ({
            ...plan,
            currency: tenant.currency,
            active: true,
          })),
        },
        subscription: {
          create: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.TRIALING,
            currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
          },
        },
      },
    });
  }

  console.log("Base E2E prête : 2 tenants, 2 owners, 4 forfaits et 2 zones.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
