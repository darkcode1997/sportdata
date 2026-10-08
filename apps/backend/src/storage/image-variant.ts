import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const IMAGE_VARIANTS = {
  avatar: { width: 96, height: 96, crop: 'fill', gravity: 'face' },
  portrait: { width: 320, height: 480, crop: 'limit' },
  logo: { width: 240, height: 240, crop: 'limit' },
  card: { width: 640, height: 480, crop: 'limit' },
  preview: { width: 1600, height: 1600, crop: 'limit' },
  hero: { width: 1600, height: 900, crop: 'limit' },
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

@Injectable()
export class ImageVariantPipe implements PipeTransform {
  transform(value: unknown): ImageVariant | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(IMAGE_VARIANTS, value)) {
      throw new BadRequestException('Kích thước ảnh không hợp lệ');
    }
    return value as ImageVariant;
  }
}
