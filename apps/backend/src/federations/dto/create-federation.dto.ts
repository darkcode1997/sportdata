import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFederationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  countryId: string;
}
