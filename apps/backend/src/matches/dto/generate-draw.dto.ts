import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrawType } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const seedingModes = [
  'STANDARD',
  'ORDERED',
  'RANDOM',
  'COUNTRY_SEPARATED',
  'FEDERATION_SEPARATED',
] as const;

export type SeedingMode = (typeof seedingModes)[number];

export class GenerateDrawDto {
  @ApiProperty({ type: [String], description: 'Athlete IDs in seed order' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsString({ each: true })
  athleteIds: string[];

  @ApiPropertyOptional({ enum: [DrawType.MAIN_TREE, DrawType.DOUBLE_ELIMINATION] })
  @IsEnum(DrawType)
  @IsOptional()
  type?: DrawType = DrawType.MAIN_TREE;

  @ApiPropertyOptional({ enum: seedingModes, default: 'STANDARD' })
  @IsIn(seedingModes)
  @IsOptional()
  seedingMode?: SeedingMode = 'STANDARD';

  @ApiPropertyOptional({ example: 'MAIN TREE POOL 1' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  divisionId?: string;

  @ApiPropertyOptional({ example: 'FOP 1' })
  @IsString()
  @IsOptional()
  fop?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  startMatchNumber?: number;
}
