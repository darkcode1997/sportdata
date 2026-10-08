import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  avif: 'image/avif', svg: 'image/svg+xml',
};

@Controller('storage/public-images')
export class PublicImagesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':filename')
  async image(@Param('filename') filename: string, @Res() response: Response) {
    const match = /^([a-f0-9]{64})\.(jpg|png|webp|gif|avif|svg)$/.exec(filename);
    if (!match) throw new NotFoundException();
    const data = await this.storage.read(`r2:public/images/${filename}`);
    response.set({
      'Content-Type': MIME_TYPES[match[2]],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    response.send(data);
  }
}
