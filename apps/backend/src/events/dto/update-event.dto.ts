import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsInt, Min, IsIn, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventLevel, PaymentMode, PaymentProvider } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sportIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  athleteIds?: string[];

  @ApiPropertyOptional({ enum: EventLevel })
  @IsOptional()
  @IsEnum(EventLevel)
  level?: EventLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizerId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participatingFederationIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowIndependentAthletes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationOpenAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  registrationFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationCurrency?: string;

  @ApiPropertyOptional({ enum: PaymentMode })
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({ enum: PaymentProvider, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentProvider, { each: true })
  paymentProviders?: PaymentProvider[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bankAccountNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  bankAccountName?: string | null;

  @ApiPropertyOptional({ enum: ['OCEAN', 'CRIMSON', 'EMERALD', 'ROYAL', 'CUSTOM'] })
  @IsOptional()
  @IsIn(['OCEAN', 'CRIMSON', 'EMERALD', 'ROYAL', 'CUSTOM'])
  ticketThemePreset?: string;

  @ApiPropertyOptional({ enum: ['CLASSIC', 'STRIPE', 'MINIMAL'] })
  @IsOptional()
  @IsIn(['CLASSIC', 'STRIPE', 'MINIMAL'])
  ticketLayout?: string;

  @ApiPropertyOptional({ example: '#0284C7' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  ticketPrimaryColor?: string;

  @ApiPropertyOptional({ example: '#075985' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  ticketSecondaryColor?: string;

  @ApiPropertyOptional({ example: '#059669' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  ticketAccentColor?: string;
}
