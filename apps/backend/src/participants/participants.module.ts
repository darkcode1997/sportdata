import { Module } from '@nestjs/common';
import { AccountRolesService } from './account-roles.service';
import { AccountRolesController } from './account-roles.controller';
import { AuthModule } from '../auth/auth.module';
import { ParticipantsController } from './participants.controller';
import { ParticipantAuthGuard } from './participant-auth.guard';
import { ParticipantsService } from './participants.service';
import { IdentityOcrService } from './identity-ocr.service';
import { TicketPdfService } from './ticket-pdf.service';
import { TicketEmailService } from './ticket-email.service';
import { TicketEmailQueueService } from './ticket-email-queue.service';
import { TicketEmailWorkerService } from './ticket-email-worker.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AthletesModule } from '../athletes/athletes.module';

@Module({
  imports: [AuthModule, SystemSettingsModule, NotificationsModule, AthletesModule],
  controllers: [ParticipantsController, AccountRolesController],
  providers: [ParticipantsService, ParticipantAuthGuard, IdentityOcrService, TicketPdfService, TicketEmailService, TicketEmailQueueService, TicketEmailWorkerService, AccountRolesService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
