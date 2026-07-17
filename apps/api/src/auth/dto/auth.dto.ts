import { IsEmail, IsEnum, IsString, MinLength, MaxLength, IsOptional } from "class-validator";

import { Country, Currency } from "@prisma/client";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsEnum(Country)
  country!: Country;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  tenantName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  tenantName?: string;
}

/**
 * Currency est déduite du country côté service, pas saisie par l'utilisateur.
 * Mais on expose la valeur pour les tests.
 */
export { Currency };
