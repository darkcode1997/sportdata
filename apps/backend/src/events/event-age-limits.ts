import { BadRequestException } from '@nestjs/common';
import { EventAgeLimitMode } from '@prisma/client';

type AgeLimits = { minAge: number | null; maxAge: number | null };
type EventAgeLimits = AgeLimits & { ageLimitMode: EventAgeLimitMode };

export function resolveEventAgeLimits(event: EventAgeLimits, category: AgeLimits): AgeLimits {
  if (event.ageLimitMode === EventAgeLimitMode.CATEGORY) return { minAge: category.minAge, maxAge: category.maxAge };
  if (event.ageLimitMode === EventAgeLimitMode.CUSTOM) return { minAge: event.minAge, maxAge: event.maxAge };
  return { minAge: null, maxAge: null };
}

export function validateEventAgeLimits(event: EventAgeLimits) {
  if (event.minAge !== null && event.maxAge !== null && event.minAge > event.maxAge) {
    throw new BadRequestException('Tuổi tối đa phải lớn hơn hoặc bằng tuổi tối thiểu');
  }
  if (event.ageLimitMode === EventAgeLimitMode.CUSTOM && event.minAge === null && event.maxAge === null) {
    throw new BadRequestException('Vui lòng nhập tuổi tối thiểu hoặc tuổi tối đa');
  }
}
