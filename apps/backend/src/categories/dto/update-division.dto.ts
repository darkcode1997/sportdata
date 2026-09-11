import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDivisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
