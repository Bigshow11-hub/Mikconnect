import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";

type Check = { status: "up" | "down" | "not_configured"; latencyMs?: number };

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async inspect() {
    const [database, redis] = await Promise.all([this.database(), this.redis()]);
    const dependencies = {
      database,
      redis,
      radius: this.configured("RADIUS_DB_URL"),
      cinetpay: this.configured("CINETPAY_API_KEY"),
      sms: this.configured("SMS_API_URL"),
      routerSync: process.env.TICKET_SYNC_QUEUE_ENABLED === "true" ? redis : this.disabled(),
    };
    const criticalDown =
      database.status === "down" ||
      (process.env.TICKET_SYNC_QUEUE_ENABLED === "true" && redis.status !== "up");
    return {
      status: criticalDown ? "degraded" : "ok",
      checkedAt: new Date().toISOString(),
      dependencies,
    };
  }

  private async database(): Promise<Check> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up", latencyMs: Date.now() - started };
    } catch {
      return { status: "down", latencyMs: Date.now() - started };
    }
  }

  private async redis(): Promise<Check> {
    const url = process.env.REDIS_URL;
    if (!url) return { status: "not_configured" };
    const started = Date.now();
    const client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1_500,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    try {
      await client.connect();
      await client.ping();
      return { status: "up", latencyMs: Date.now() - started };
    } catch {
      return { status: "down", latencyMs: Date.now() - started };
    } finally {
      client.disconnect();
    }
  }

  private configured(key: string): Check {
    return { status: process.env[key]?.trim() ? "up" : "not_configured" };
  }

  private disabled(): Check {
    return { status: "not_configured" };
  }
}
