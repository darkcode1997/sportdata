import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsIn,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '@prisma/client';

export class QueryMatchDto {
  @ApiPropertyOptional({ description: 'Tìm theo vận động viên hoặc tên sự kiện' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sportId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo FOP cụ thể' })
  @IsString()
  @IsOptional()
  fopId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên địa điểm, sàn hoặc FOP' })
  @IsString()
  @IsOptional()
  venue?: string;

  @ApiPropertyOptional({ description: 'Lọc các trận có vận động viên này' })
  @IsString()
  @IsOptional()
  athleteId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ enum: ['page', 'cursor'], default: 'page' })
  @IsIn(['page', 'cursor'])
  @IsOptional()
  pagination?: 'page' | 'cursor';

  @ApiPropertyOptional({ description: 'ID trận cuối của trang trước' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
