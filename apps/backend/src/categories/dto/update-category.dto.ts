import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BeltLevel, Gender, JiuJitsuDiscipline, UniformType } from '@prisma/client';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto implements Partial<CreateCategoryDto> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

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

  @ApiPropertyOptional()
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
