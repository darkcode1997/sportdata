import { IsOptional, IsString } from 'class-validator';
import { CreateFederationDto } from './create-federation.dto';

export class UpdateFederationDto implements Partial<CreateFederationDto> {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  countryId?: string;
}
