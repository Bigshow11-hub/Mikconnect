import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsNumber, Min, Max, IsBoolean, IsArray, ArrayMinSize, ArrayMaxSize } from "class-validator";

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent!: number;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AssignTicketsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ticketIds!: string[];
}
