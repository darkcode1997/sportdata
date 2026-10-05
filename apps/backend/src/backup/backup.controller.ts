import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Request, Response } from 'express';
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

  @Post('import/uploads')
  createImportUpload(@Body() body: { filename?: string; size?: number }) {
    return this.backupService.createImportUpload(body?.filename, body?.size);
  }

  @Post('import/uploads/:uploadId/chunks/:index')
  uploadImportChunk(
    @Param('uploadId') uploadId: string,
    @Param('index', ParseIntPipe) index: number,
    @Req() request: Request,
  ) {
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new BadRequestException('Chunk backup không hợp lệ');
    }
    return this.backupService.storeImportChunk(uploadId, index, request.body);
  }

  @Post('import/uploads/:uploadId/complete')
  completeImportUpload(@Param('uploadId') uploadId: string) {
    return this.backupService.importUploadedBackup(uploadId);
  }

  @Delete('import/uploads/:uploadId')
  cancelImportUpload(@Param('uploadId') uploadId: string) {
    return this.backupService.deleteImportUpload(uploadId);
  }
}
