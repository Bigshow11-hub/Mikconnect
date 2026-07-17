import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ZonesModule } from "./zones/zones.module";
import { RoutersModule } from "./routers/routers.module";
import { PlansModule } from "./plans/plans.module";
import { TicketsModule } from "./tickets/tickets.module";
import { AgentsModule } from "./agents/agents.module";
import { PaymentsModule } from "./payments/payments.module";
import { RadiusModule } from "./radius/radius.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 180,
      },
    ]),
    PrismaModule,
    AuthModule,
    ZonesModule,
    RoutersModule,
    PlansModule,
    TicketsModule,
    AgentsModule,
    PaymentsModule,
    RadiusModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
