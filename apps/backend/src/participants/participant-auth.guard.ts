import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập tài khoản SportData');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'sportdata-dev-secret-change-me-please',
      });
      if (payload.type !== 'participant') throw new Error('wrong token type');
      const account = await this.prisma.participantAccount.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isActive: true, accountType: true, verificationStatus: true, federationId: true },
      });
      if (!account?.isActive) throw new Error('inactive');
      request.participant = account;
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc không hợp lệ');
    }
  }
}
