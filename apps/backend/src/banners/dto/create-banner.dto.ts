import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBannerDto {
  @ApiPropertyOptional({ description: 'Tên nội bộ để quản trị banner' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiProperty({ description: 'Nội dung thay thế cho ảnh' })
  @IsString()
  @MinLength(2)
  @MaxLength(250)
  altText: string;

  @ApiPropertyOptional({ description: 'URL đầy đủ hoặc đường dẫn nội bộ bắt đầu bằng /' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  @Matches(/^(?:https?:\/\/|\/|$)/, { message: 'Liên kết phải bắt đầu bằng http://, https:// hoặc /' })
  linkUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isActive?: boolean;
}
