import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    SystemSettingsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const configuredSecret = cfg.get<string>('JWT_SECRET')?.trim();
        const production = cfg.get<string>('NODE_ENV') === 'production';
        if (production && (!configuredSecret || configuredSecret.includes('change-me'))) {
          throw new Error('JWT_SECRET must be explicitly configured for production.');
        }

        return {
          secret: configuredSecret || 'sportdata-dev-secret-change-me-please',
          signOptions: {
            expiresIn: (cfg.get<string>('JWT_EXPIRES_IN') || '7d') as SignOptions['expiresIn'],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [AuthService, JwtStrategy, JwtModule],
})
export class AuthModule {}
