import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParticipantsController } from './participants.controller';
import { ParticipantAuthGuard } from './participant-auth.guard';
import { ParticipantsService } from './participants.service';
import { IdentityOcrService } from './identity-ocr.service';
import { TicketPdfService } from './ticket-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantAuthGuard, IdentityOcrService, TicketPdfService],
})
export class ParticipantsModule {}
