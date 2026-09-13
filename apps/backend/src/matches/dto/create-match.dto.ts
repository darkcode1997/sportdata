import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { BracketSide, MatchStatus, MatchType, WinMethod } from '@prisma/client';

export class CreateMatchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  drawId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  matchNumber?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fop?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fopId?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  matchDate: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  athlete1Id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  athlete2Id?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  athlete1Score?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  athlete2Score?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  athlete1Advantages?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  athlete2Advantages?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  athlete1Penalties?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  athlete2Penalties?: number;

  @ApiPropertyOptional({ enum: MatchStatus, default: MatchStatus.SCHEDULED })
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @ApiPropertyOptional({ enum: MatchType, default: MatchType.ELIMINATION })
  @IsEnum(MatchType)
  @IsOptional()
  matchType?: MatchType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  winnerId?: string;

  @ApiPropertyOptional({ enum: WinMethod })
  @IsEnum(WinMethod)
  @IsOptional()
  winMethod?: WinMethod;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  round?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  bracketPosition?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  winnerToMatchId?: string;

  @ApiPropertyOptional({ enum: BracketSide })
  @IsEnum(BracketSide)
  @IsOptional()
  winnerToSide?: BracketSide;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  loserToMatchId?: string;

  @ApiPropertyOptional({ enum: BracketSide })
  @IsEnum(BracketSide)
  @IsOptional()
  loserToSide?: BracketSide;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pool?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
