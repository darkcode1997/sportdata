import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class LookupAthleteDto {
  @IsString()
  eventId!: string;

  @IsIn(['CCCD', 'PASSPORT'])
  identityType!: 'CCCD' | 'PASSPORT';

  @IsString()
  @MaxLength(30)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
