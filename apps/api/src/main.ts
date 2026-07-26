import "./instrument";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { parseCorsOrigins } from "./common/security-config";
import { assertProductionConfiguration } from "./common/production-config";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

async function bootstrap() {
  assertProductionConfiguration();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(
    (
      request: Request & { user?: { tenantId?: string; sub?: string } },
      response: Response,
      next: NextFunction,
    ) => {
      const requestId = request.header("x-request-id")?.slice(0, 128) || randomUUID();
      const startedAt = Date.now();
      response.setHeader("X-Request-ID", requestId);
      response.on("finish", () => {
        Logger.log(
          JSON.stringify({
            event: "http_request",
            requestId,
            method: request.method,
            path: request.originalUrl.split("?")[0],
            status: response.statusCode,
            durationMs: Date.now() - startedAt,
            tenantId: request.user?.tenantId,
            userId: request.user?.sub,
          }),
          "HTTP",
        );
      });
      next();
    },
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Token", "Idempotency-Key", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "Content-Disposition"],
  });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}`, "Bootstrap");
}
bootstrap();
