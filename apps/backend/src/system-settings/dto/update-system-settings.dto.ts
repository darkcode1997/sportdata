import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsBoolean()
  identityOcrEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  momoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  vnpayEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  bankQrEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  ticketEmailEnabled?: boolean;
}
