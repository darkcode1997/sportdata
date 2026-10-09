import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SportDataAccountType } from '@prisma/client';

export class AccountClassificationDto {
  @IsIn(['GENERAL', 'ATHLETE', 'REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL'])
  accountType: SportDataAccountType;
}

export class ProfessionalReviewDto {
  @IsDateString()
  expectedUpdatedAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
  @IsIn(['VERIFIED', 'REJECTED', 'PENDING'])
  status: 'VERIFIED' | 'REJECTED' | 'PENDING';
}

export class CreateStaffRegistrationDto {
  @IsString()
  eventId: string;

  @IsIn(['REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL'])
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ReviewStaffRegistrationDto {
  @IsOptional()
  @IsBoolean()
  qualificationVerified?: boolean;
  @IsIn(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}
