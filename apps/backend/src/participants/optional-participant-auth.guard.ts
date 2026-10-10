import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantAuthGuard } from './participant-auth.guard';

@Injectable()
export class OptionalParticipantAuthGuard extends ParticipantAuthGuard {
  constructor(jwtService: JwtService, prisma: PrismaService) {
    super(jwtService, prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!context.switchToHttp().getRequest().headers.authorization) return true;
    return super.canActivate(context);
  }
}
