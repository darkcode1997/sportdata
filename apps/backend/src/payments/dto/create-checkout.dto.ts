import { PaymentProvider } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{6,80}$/)
  ticketCode: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
