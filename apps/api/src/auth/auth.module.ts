import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { CryptoService } from "../common/crypto.service";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_ACCESS_TTL") ?? "15m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CryptoService, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
