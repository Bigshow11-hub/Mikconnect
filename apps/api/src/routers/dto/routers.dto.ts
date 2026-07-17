import { IsBoolean, IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max, Matches } from "class-validator";

export class RouterTestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(253)
  host!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  apiUser!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  apiPassword!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  apiPort?: number;

  @IsOptional()
  @IsBoolean()
  apiTls?: boolean;
}

export class CreateRouterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(253)
  host!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  apiUser!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  apiPassword!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  apiPort?: number;

  @IsOptional()
  @IsBoolean()
  apiTls?: boolean;

  @IsString()
  @MinLength(1)
  zoneId!: string;
}

export class RouterSessionActionDto {
  @IsString()
  @Matches(/^\*[A-Za-z0-9]+$/, { message: "Identifiant de session RouterOS invalide." })
  sessionId!: string;

  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: "Adresse MAC invalide." })
  macAddress!: string;
}
