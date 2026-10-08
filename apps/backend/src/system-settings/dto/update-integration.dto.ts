import { IsObject } from 'class-validator';

export class UpdateIntegrationDto {
  // Values are validated against the allowlist in the service. Null removes an override.
  @IsObject()
  values!: Record<string, string | null>;
}
