import { IsString, MinLength, MaxLength, IsOptional } from "class-validator";

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}
