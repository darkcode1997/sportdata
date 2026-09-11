import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BackupService, MAX_BACKUP_FILE_SIZE } from './backup.service';

const backupTempDirectory = join(tmpdir(), 'sportdata-backups');

@Controller('system-backup')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  exportDatabase(@Res() response: Response) {
    return this.backupService.exportDatabase(response);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          fs.mkdir(backupTempDirectory, { recursive: true })
            .then(() => callback(null, backupTempDirectory))
            .catch((error) => callback(error, backupTempDirectory));
        },
        filename: (_request, _file, callback) => {
          callback(null, `${Date.now()}-${randomUUID()}.jsonl.gz`);
        },
      }),
      limits: { fileSize: MAX_BACKUP_FILE_SIZE, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.jsonl.gz')) {
          callback(new BadRequestException('Chỉ chấp nhận file .jsonl.gz'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async importDatabase(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file backup .jsonl.gz');
    try {
      return await this.backupService.importDatabase(file.path, file.size);
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }
}
