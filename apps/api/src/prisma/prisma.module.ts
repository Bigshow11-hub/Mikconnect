import { Global, Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { PrismaService } from "./prisma.service";

/**
 * PrismaModule — mikconnect.
 *
 * Expose PrismaService globalement. ClsModule (AsyncLocalStorage) active
 * le contexte tenant propagé à travers toute la requête sans param threading.
 *
 * Le middleware ClsService est positionné par ClsModule.forRoot({ middleware: { mount: true } })
 * — chaque requête HTTP reçoit un store cls vide. L'AuthGuard remplit
 * cls.set('tenantId', ...) après vérification du JWT.
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
