import { EventParticipationRole, RegistrationStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateEventParticipationDto {
  @IsString()
  @MinLength(1)
  eventId: string;

  @IsEnum(EventParticipationRole)
  role: EventParticipationRole;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ValidateIf((dto) => dto.role === EventParticipationRole.TEAM_LEADER || dto.federationId !== undefined)
  @IsString()
  @MinLength(1)
  federationId?: string;
}

export class UpdateEventParticipationStatusDto {
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason: string;
}
