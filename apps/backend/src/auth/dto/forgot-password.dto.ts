import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(254)
  identifier: string;
}
