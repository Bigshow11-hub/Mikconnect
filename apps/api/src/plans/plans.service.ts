import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * PlansService — mikconnect.
 *
 * Liste les forfaits (plans) d'un tenant — créés automatiquement au
 * register (4 forfaits par défaut selon le pays). L'owner peut les
 * éditer plus tard (Phase 2). RLS isole par tenantId automatiquement.
 */
@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.plan.findMany({
        where: { tenantId, active: true },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          dataLimitMb: true,
          price: true,
          currency: true,
        },
        orderBy: { price: "asc" },
      }),
    );
  }
}
