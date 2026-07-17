import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEnum,
  IsDateString,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { TicketStatus } from "@prisma/client";

export class GenerateBatchDto {
  @IsString()
  planId!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([4, 5, 6, 7, 8])
  codeLength?: 4 | 5 | 6 | 7 | 8;
}

export class TicketFiltersDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  /** Recherche par code (préfixe ou match partiel, insensible à la casse). */
  q?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ExportTicketsPdfDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ticketIds!: string[];

  @IsOptional()
  @IsIn(["A4_STANDARD", "A4_COMPACT"])
  layout?: "A4_STANDARD" | "A4_COMPACT";
}
