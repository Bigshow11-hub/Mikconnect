import { PaymentProvider } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreatePublicPaymentDto {
  @IsString()
  planId!: string;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsString()
  @Matches(/^\+?[0-9 ]{8,20}$/, { message: "Numéro de téléphone invalide." })
  customerPhone!: string;
}

export class CinetpayWebhookDto {
  @IsString()
  cpm_trans_id!: string;

  @IsString()
  cpm_site_id!: string;

  @IsOptional() @IsString() cpm_trans_date?: string;
  @IsOptional() @IsString() cpm_amount?: string;
  @IsOptional() @IsString() cpm_currency?: string;
  @IsOptional() @IsString() signature?: string;
  @IsOptional() @IsString() payment_method?: string;
  @IsOptional() @IsString() cel_phone_num?: string;
  @IsOptional() @IsString() cpm_phone_prefixe?: string;
  @IsOptional() @IsString() cpm_language?: string;
  @IsOptional() @IsString() cpm_version?: string;
  @IsOptional() @IsString() cpm_payment_config?: string;
  @IsOptional() @IsString() cpm_page_action?: string;
  @IsOptional() @IsString() @MaxLength(200) cpm_custom?: string;
  @IsOptional() @IsString() cpm_designation?: string;
  @IsOptional() @IsString() cpm_error_message?: string;
}
