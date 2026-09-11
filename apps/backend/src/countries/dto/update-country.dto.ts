import { IsOptional, IsString } from 'class-validator';
import { CreateCountryDto } from './create-country.dto';

export class UpdateCountryDto implements Partial<CreateCountryDto> {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  flagUrl?: string;
}
