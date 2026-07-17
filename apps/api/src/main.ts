import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { parseCorsOrigins } from "./common/security-config";
import { assertProductionConfiguration } from "./common/production-config";

async function bootstrap() {
  assertProductionConfiguration();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
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
    allowedHeaders: ["Authorization", "Content-Type", "X-Token"],
  });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}`, "Bootstrap");
}
bootstrap();
