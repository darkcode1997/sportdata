import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Global()
@Module({ imports: [SystemSettingsModule], providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
