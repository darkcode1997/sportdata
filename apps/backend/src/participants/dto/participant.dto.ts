import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  MinLength,
} from 'class-validator';
import {
  AccountVerificationStatus,
  DocumentVerificationStatus,
  Gender,
  RegistrationStatus,
  SportDataAccountType,
} from '@prisma/client';

export class ParticipantRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  birthDate: string;

  @IsString()
  countryId: string;

  @IsOptional()
  @IsString()
  federationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  weight?: number;
}

export class ParticipantLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(SportDataAccountType)
  accountType?: SportDataAccountType;
}

export class FederationAccountRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsString()
  @MinLength(8)
  phone: string;

  @IsString()
  federationId: string;

  @IsString()
  @MinLength(2)
  representativePosition: string;
}

export class UpdateParticipantProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  federationId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  weight?: number;
}

export class CreatePublicRegistrationDto {
  @IsString()
  eventId: string;

  @IsString()
  categoryId: string;
}

export class UpdateRegistrationStatusDto {
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;
}

export class UpdateDocumentVerificationDto {
  @IsEnum(DocumentVerificationStatus)
  status: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmIdentityOcrDto {
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  placeOfOrigin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @IsOptional()
  @IsBoolean()
  applyToProfile?: boolean;
}

export class DownloadSubmissionTicketsDto {
  @IsEmail()
  contactEmail: string;
}

export class UpdateAccountVerificationDto {
  @IsEnum(AccountVerificationStatus)
  status: AccountVerificationStatus;
}
