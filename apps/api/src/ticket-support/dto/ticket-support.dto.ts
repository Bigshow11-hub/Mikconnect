import { IsString, MaxLength, MinLength } from "class-validator";

export class TicketSupportLookupDto {
  @IsString()
  @MinLength(4)
  @MaxLength(80)
  reference!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  phone!: string;
}
