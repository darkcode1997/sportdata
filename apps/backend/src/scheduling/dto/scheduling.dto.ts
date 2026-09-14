import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) => value === true || value === 'true';

export class CreateVenueDto {
  @ApiProperty() @IsString() @MinLength(2) code: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() @Type(() => Number) capacity?: number;
  @ApiPropertyOptional({ default: 'Asia/Ho_Chi_Minh' }) @IsString() @IsOptional() timezone?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) @IsOptional() sportIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) @IsOptional() eventIds?: string[];
}

export class CreateSessionDto {
  @ApiProperty() @IsString() venueId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sportId?: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsDateString() startTime: string;
  @ApiProperty() @IsDateString() endTime: string;
  @ApiPropertyOptional({ enum: SessionStatus }) @IsEnum(SessionStatus) @IsOptional() status?: SessionStatus;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class GenerateTimeSlotsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) fopIds: string[];
  @ApiPropertyOptional({ default: 10 }) @IsInt() @Min(1) @Max(720) @Type(() => Number) @IsOptional() durationMinutes?: number;
  @ApiPropertyOptional({ default: 5 }) @IsInt() @Min(0) @Max(180) @Type(() => Number) @IsOptional() turnaroundMinutes?: number;
}

export class UpsertSchedulingRuleDto {
  @ApiPropertyOptional({ default: 10 }) @IsInt() @Min(1) @Max(720) @Type(() => Number) @IsOptional() matchDurationMinutes?: number;
  @ApiPropertyOptional({ default: 5 }) @IsInt() @Min(0) @Max(180) @Type(() => Number) @IsOptional() turnaroundMinutes?: number;
  @ApiPropertyOptional({ default: 60 }) @IsInt() @Min(0) @Max(10080) @Type(() => Number) @IsOptional() minRestMinutes?: number;
  @ApiPropertyOptional({ example: '08:00' }) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) @IsOptional() earliestStart?: string;
  @ApiPropertyOptional({ example: '22:00' }) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) @IsOptional() latestEnd?: string;
  @ApiPropertyOptional({ example: '18:00' }) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) @IsOptional() preferredStart?: string;
  @ApiPropertyOptional({ example: '21:30' }) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) @IsOptional() preferredEnd?: string;
  @ApiPropertyOptional({ default: false }) @IsBoolean() @Transform(toBoolean) @IsOptional() outdoor?: boolean;
}

export class AutoScheduleDto {
  @ApiPropertyOptional({ default: true }) @IsBoolean() @Transform(toBoolean) @IsOptional() dryRun?: boolean;
  @ApiPropertyOptional({ default: true }) @IsBoolean() @Transform(toBoolean) @IsOptional() onlyUnscheduled?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) @IsOptional() sportIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsArray() @ArrayUnique() @IsString({ each: true }) @IsOptional() categoryIds?: string[];
}

export class LockScheduleDto {
  @ApiProperty() @IsBoolean() @Transform(toBoolean) locked: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}
