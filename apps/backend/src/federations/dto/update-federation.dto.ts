import { FederationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFederationDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string | null;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsEnum(FederationType)
  type?: FederationType;
}
