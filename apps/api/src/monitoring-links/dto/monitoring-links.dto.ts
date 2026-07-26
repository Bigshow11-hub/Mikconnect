import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateMonitoringLinkDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays = 30;

  @IsOptional()
  @IsBoolean()
  includeRevenue = true;

  @IsOptional()
  @IsBoolean()
  includeTicketStats = true;

  @IsOptional()
  @IsBoolean()
  includeNetwork = true;
}
