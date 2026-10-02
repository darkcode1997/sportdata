import { IsString, Length } from 'class-validator';

export class ScoreboardLeaseDto {
  @IsString() @Length(20, 100) clientId: string;
}
