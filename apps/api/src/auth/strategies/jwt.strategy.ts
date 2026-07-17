import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { type AuthUser } from "../../common/decorators/current-user.decorator";

/**
 * JwtStrategy — mikconnect.
 *
 * Vérifie le JWT access (court TTL ~15min).
 * Le payload contient : { sub, tenantId, role, email, tokenType }.
 *
 * `tokenType` est vérifié pour éviter qu'un refresh token soit accepté
 * comme access (rotation inverse).
 */
export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: "OWNER" | "AGENT" | "ADMIN";
  email: string;
  tokenType: "access" | "refresh";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.tokenType !== "access") {
      return undefined as unknown as AuthUser;
    }
    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };
  }
}
