import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { PublicImagesController } from './public-images.controller';

@Global()
@Module({ imports: [SystemSettingsModule], controllers: [PublicImagesController], providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
