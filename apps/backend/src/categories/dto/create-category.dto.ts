import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BeltLevel, Gender, JiuJitsuDiscipline, UniformType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  sportId: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ enum: JiuJitsuDiscipline })
  @IsOptional()
  @IsEnum(JiuJitsuDiscipline)
  discipline?: JiuJitsuDiscipline;

  @ApiPropertyOptional({ enum: UniformType })
  @IsOptional()
  @IsEnum(UniformType)
  uniform?: UniformType;

  @ApiPropertyOptional({ enum: BeltLevel })
  @IsOptional()
  @IsEnum(BeltLevel)
  beltLevel?: BeltLevel;

  @ApiPropertyOptional({ description: 'Thời lượng trận tính bằng giây' })
  @IsOptional()
  @IsNumber()
  matchDurationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  athleteIds?: string[];
}
