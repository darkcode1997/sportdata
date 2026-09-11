import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MedalCountsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupBy?: string = 'athlete';
}
