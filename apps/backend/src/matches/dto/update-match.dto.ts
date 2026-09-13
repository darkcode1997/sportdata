import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { BracketSide, MatchStatus, MatchType, WinMethod } from '@prisma/client';
import { CreateMatchDto } from './create-match.dto';

export class UpdateMatchDto implements Partial<CreateMatchDto> {
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

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  matchDate?: string;

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

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  athlete1Score?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  athlete2Score?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  athlete1Advantages?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  athlete2Advantages?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  athlete1Penalties?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  athlete2Penalties?: number;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @ApiPropertyOptional({ enum: MatchType })
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
