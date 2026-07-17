import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type CreateZoneDto } from "./dto/zones.dto";

/**
 * ZonesService — mikconnect.
 *
 * CRUD des zones d'un tenant (RLS isole par tenantId). L'onboarding crée
 * la première zone via create() ; le dashboard liste via findAll().
 * `tenantId` est passé depuis le contrôleur (issu du JWT via @CurrentUser).
 */
@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateZoneDto) {
    return this.prisma.withTenantContext((tx) =>
      tx.zone.create({
        data: { tenantId, name: dto.name, location: dto.location },
        select: { id: true, name: true, location: true, createdAt: true },
      }),
    );
  }

  async findAll(tenantId: string) {
    return this.prisma.withTenantContext((tx) =>
      tx.zone.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          location: true,
          createdAt: true,
          routers: {
            select: {
              id: true,
              label: true,
              host: true,
              apiPort: true,
              apiTls: true,
              status: true,
              lastSeenAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const zone = await this.prisma.withTenantContext((tx) =>
      tx.zone.findUnique({
        where: { id, tenantId },
        select: {
          id: true,
          name: true,
          location: true,
          createdAt: true,
          routers: {
            select: {
              id: true,
              label: true,
              host: true,
              apiPort: true,
              apiTls: true,
              status: true,
              lastSeenAt: true,
            },
          },
        },
      }),
    );
    if (!zone) throw new NotFoundException("Zone introuvable.");
    return zone;
  }
}
