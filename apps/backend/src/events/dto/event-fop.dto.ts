import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEventFopDto {
  @ApiProperty({ example: 'FOP 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ nullable: true, description: 'Địa điểm chứa sân/FOP' })
  @IsOptional()
  @IsString()
  venueId?: string | null;
}

export class UpdateEventFopDto {
  @ApiPropertyOptional({ example: 'FOP 1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Địa điểm chứa sân/FOP' })
  @IsOptional()
  @IsString()
  venueId?: string | null;
}
