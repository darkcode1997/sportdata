import { PickType } from '@nestjs/mapped-types';
import { CreateAthleteDto } from '../../athletes/dto/create-athlete.dto';

export class CheckAthleteIdentityDto extends PickType(CreateAthleteDto, [
  'fullName', 'birthDate', 'gender', 'countryId', 'federationId', 'phone',
  'identityType', 'documentNumber', 'address',
] as const) {}
