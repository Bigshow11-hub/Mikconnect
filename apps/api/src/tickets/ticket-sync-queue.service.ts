import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";
import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";
import { TicketsService } from "./tickets.service";

const QUEUE_NAME = "mikconnect-ticket-sync";

interface TicketSyncJob {
  outboxId: string;
  tenantId: string;
  batchId: string;
}

/**
 * Adapter BullMQ du module Tickets.
 * La base reste la source de vérité via OutboxEvent : une panne Redis ne
 * perd jamais le travail, le dispatcher reprendra l'événement plus tard.
 */
@Injectable()
export class TicketSyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TicketSyncQueueService.name);
  private queue?: Queue<TicketSyncJob>;
  private worker?: Worker<TicketSyncJob>;
  private redis?: IORedis;
  private workerRedis?: IORedis;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>("TICKET_SYNC_QUEUE_ENABLED") !== "true") {
      this.logger.log("Ticket sync queue disabled; manual retry remains available.");
      return;
    }
    const redisUrl = this.config.get<string>("REDIS_URL");
    if (!redisUrl) throw new Error("REDIS_URL est requis lorsque TICKET_SYNC_QUEUE_ENABLED=true.");

    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    this.workerRedis = this.redis.duplicate();
    await Promise.all([this.redis.connect(), this.workerRedis.connect()]);
    this.queue = new Queue<TicketSyncJob>(QUEUE_NAME, { connection: this.redis });
    this.worker = new Worker<TicketSyncJob>(
      QUEUE_NAME,
      async (job) => {
        const result = await this.tickets.retryBatchForSystem(job.data.tenantId, job.data.batchId);
        if (!result.ok) throw new Error(result.message);
        return result;
      },
      { connection: this.workerRedis, concurrency: 2 },
    );
    this.worker.on("completed", (job) => void this.complete(job));
    this.worker.on("failed", (job, error) => void this.fail(job, error));
    await this.dispatchPending();
    this.logger.log("Ticket sync queue ready.");
  }

  @Interval(5_000)
  async dispatchPending() {
    if (!this.queue) return;
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        type: "TICKET_BATCH_SYNC",
        status: { in: ["PENDING", "FAILED"] },
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    for (const event of events) {
      try {
        await this.queue.add(
          "sync-batch",
          { outboxId: event.id, tenantId: event.tenantId, batchId: event.aggregateId },
          {
            jobId: event.id,
            attempts: 5,
            backoff: { type: "exponential", delay: 10_000 },
            removeOnComplete: 200,
            removeOnFail: 500,
          },
        );
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: "DISPATCHED", dispatchedAt: new Date(), attempts: { increment: 1 } },
        });
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            availableAt: new Date(Date.now() + 30_000),
            lastError: error instanceof Error ? error.message.slice(0, 500) : "Redis indisponible",
          },
        });
      }
    }
  }

  private async complete(job: Job<TicketSyncJob>) {
    await this.prisma.outboxEvent.update({
      where: { id: job.data.outboxId },
      data: { status: "COMPLETED", completedAt: new Date(), lastError: null },
    });
  }

  private async fail(job: Job<TicketSyncJob> | undefined, error: Error) {
    if (!job) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    await this.prisma.outboxEvent.update({
      where: { id: job.data.outboxId },
      data: {
        status: exhausted ? "DEAD" : "DISPATCHED",
        lastError: error.message.slice(0, 500),
      },
    });
    if (exhausted) this.logger.error(`Ticket sync dead-letter: ${job.data.batchId}`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.workerRedis?.quit();
    await this.redis?.quit();
  }
}
