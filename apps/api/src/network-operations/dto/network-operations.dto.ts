import { IsIn } from "class-validator";

export class ConfirmTimezoneRepairDto {
  @IsIn(["CORRIGER L'HEURE"])
  confirmation!: "CORRIGER L'HEURE";
}
