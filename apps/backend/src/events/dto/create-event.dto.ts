import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventLevel, PaymentMode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Bộ môn chính, giữ tương thích với API cũ' })
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách bộ môn thuộc sự kiện' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sportIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

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

  @ApiPropertyOptional({ enum: EventLevel, default: EventLevel.INTERNATIONAL })
  @IsOptional()
  @IsEnum(EventLevel)
  level?: EventLevel;

  @ApiPropertyOptional({ description: 'Liên đoàn, trung tâm hoặc CLB đứng ra tổ chức' })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Các đơn vị/CLB được tham gia sự kiện' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participatingFederationIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowIndependentAthletes?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationOpenAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string;

  @ApiPropertyOptional({ default: 0, description: 'Lệ phí theo đơn vị tiền tệ nhỏ nhất, với VND là số đồng' })
  @IsOptional()
  @IsInt()
  @Min(0)
  registrationFee?: number;

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  registrationCurrency?: string;

  @ApiPropertyOptional({ enum: PaymentMode, default: PaymentMode.FREE })
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;
}
