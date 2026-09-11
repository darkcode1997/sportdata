import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BeltLevel, Gender, JiuJitsuDiscipline, UniformType } from '@prisma/client';

export class QueryCategoriesDto {
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
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
