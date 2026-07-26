import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { SentryGlobalFilter } from "@sentry/nestjs/setup";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ZonesModule } from "./zones/zones.module";
import { RoutersModule } from "./routers/routers.module";
import { PlansModule } from "./plans/plans.module";
import { TicketsModule } from "./tickets/tickets.module";
import { AgentsModule } from "./agents/agents.module";
import { PaymentsModule } from "./payments/payments.module";
import { RadiusModule } from "./radius/radius.module";
import { HealthModule } from "./health/health.module";
import { ReportsModule } from "./reports/reports.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { NetworkOperationsModule } from "./network-operations/network-operations.module";
import { MonitoringLinksModule } from "./monitoring-links/monitoring-links.module";
import { TicketSupportModule } from "./ticket-support/ticket-support.module";

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
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ZonesModule,
    RoutersModule,
    PlansModule,
    TicketsModule,
    AgentsModule,
    PaymentsModule,
    RadiusModule,
    HealthModule,
    ReportsModule,
    SubscriptionsModule,
    PrivacyModule,
    NetworkOperationsModule,
    MonitoringLinksModule,
    TicketSupportModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
