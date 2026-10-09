import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SportDataAccountType } from '@prisma/client';

export class MarketingPreferencesDto {
  @IsBoolean()
  marketingEnabled: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEvents?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingArticles?: boolean;
}

export class MarketingUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(SportDataAccountType)
  accountType?: SportDataAccountType;

  @IsOptional()
  @IsIn(['subscribed', 'unsubscribed'])
  subscription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class MarketingAccountStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class MarketingCampaignStatusDto {
  @IsBoolean()
  enabled: boolean;
}

export class MarketingUnsubscribeDto {
  @IsString()
  @MaxLength(128)
  token: string;
}
