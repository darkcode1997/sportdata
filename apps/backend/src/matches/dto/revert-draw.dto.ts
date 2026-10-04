import { IsNotEmpty, IsString } from 'class-validator';

export class RevertDrawDto {
  @IsString()
  @IsNotEmpty()
  version: string;
}
