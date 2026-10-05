import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sportdata-dev-secret-change-me-please',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    username?: string;
    iat?: number;
    sessionIssuedAt?: number;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
        passwordChangedAt: true,
      },
    });
    if (!user) return null;
    if (!user.isActive) return null;
    if (user.passwordChangedAt) {
      const issuedAt = payload.sessionIssuedAt ?? (payload.iat ? payload.iat * 1000 : 0);
      if (issuedAt < user.passwordChangedAt.getTime()) return null;
    }
    const { passwordChangedAt, ...safeUser } = user;
    return safeUser;
  }
}
