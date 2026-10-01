import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryStatus, EntryType, Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TeamMemberDto {
  @ApiProperty() @IsString() athleteId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() role?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @Type(() => Number) @IsOptional() relayLeg?: number;
}

export class CreateTeamDto {
  @ApiProperty() @IsString() sportId: string;
  @ApiProperty() @IsString() countryId: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() code?: string;
  @ApiPropertyOptional({ enum: Gender }) @IsEnum(Gender) @IsOptional() gender?: Gender;
  @ApiProperty({ type: [TeamMemberDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TeamMemberDto)
  members: TeamMemberDto[];
}

export class CreateEntryDto {
  @ApiProperty({ enum: EntryType }) @IsEnum(EntryType) type: EntryType;
  @ApiPropertyOptional() @IsString() @IsOptional() athleteId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() teamId?: string;
  @ApiPropertyOptional({ enum: EntryStatus }) @IsEnum(EntryStatus) @IsOptional() status?: EntryStatus;
  @ApiPropertyOptional() @IsInt() @Min(1) @Type(() => Number) @IsOptional() seed?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() bib?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class UpdateEntrySeedDto {
  @ApiPropertyOptional({ nullable: true, description: 'Bỏ trống để xóa hạt giống' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  seed?: number | null;
}

export class GenerateHeatsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(2) @ArrayUnique() @IsString({ each: true }) entryIds: string[];
  @ApiPropertyOptional({ default: 8 }) @IsInt() @Min(2) @Max(16) @Type(() => Number) @IsOptional() laneCount?: number;
  @ApiPropertyOptional({ default: 1 }) @IsInt() @Min(1) @Type(() => Number) @IsOptional() round?: number;
  @ApiPropertyOptional({ default: 'Heat' }) @IsString() @IsOptional() namePrefix?: string;
}

export class GenerateRoundRobinDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(2) @ArrayUnique() @IsString({ each: true }) entryIds: string[];
  @ApiPropertyOptional({ default: 1 }) @IsInt() @Min(1) @Max(16) @Type(() => Number) @IsOptional() groupCount?: number;
  @ApiPropertyOptional({ default: 'Bảng' }) @IsString() @IsOptional() namePrefix?: string;
}
