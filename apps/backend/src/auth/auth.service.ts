import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../common/enums/user-role.enum';

const FORGOT_PASSWORD_MESSAGE =
  'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email đã đăng ký.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyPasswordHash = bcrypt.hash(
    randomBytes(24).toString('hex'),
    12,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const username = registerDto.username.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { username: { equals: username, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Email hoặc username đã tồn tại');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: registerDto.name,
        password: await this.hashPassword(registerDto.password),
        role: registerDto.role || UserRole.CONTENT,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      user,
      accessToken: this.generateToken(user.id, user.email, user.username),
    };
  }

  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim();
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      await this.comparePasswords(loginDto.password, await this.dummyPasswordHash);
      throw new UnauthorizedException('Email/username hoặc mật khẩu không đúng');
    }

    const passwordValid = await this.comparePasswords(loginDto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Email/username hoặc mật khẩu không đúng');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên');
    }

    const {
      password,
      resetPasswordTokenHash,
      resetPasswordExpiresAt,
      resetPasswordRequestedAt,
      passwordChangedAt,
      ...safeUser
    } = user;

    return {
      user: safeUser,
      accessToken: this.generateToken(user.id, user.email, user.username),
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.findUserByIdentifier(forgotPasswordDto.identifier.trim());
    let resetUrl: string | undefined;

    if (user?.isActive) {
      const cooldownMs = 60 * 1000;
      const requestedRecently =
        user.resetPasswordRequestedAt &&
        Date.now() - user.resetPasswordRequestedAt.getTime() < cooldownMs;

      if (!requestedRecently) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashResetToken(token);
        const ttlMinutes = Math.max(
          5,
          Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30),
        );
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: expiresAt,
            resetPasswordRequestedAt: new Date(),
          },
        });

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
          /\/$/,
          '',
        );
        resetUrl = `${frontendUrl}/cms/reset-password?token=${encodeURIComponent(token)}`;

        try {
          await this.sendResetEmail(user.email, resetUrl, ttlMinutes);
        } catch (error: any) {
          this.logger.warn(`Không thể gửi email đặt lại mật khẩu: ${error?.message || error}`);
        }
      }
    }

    return {
      message: FORGOT_PASSWORD_MESSAGE,
      ...(process.env.NODE_ENV !== 'production' && resetUrl ? { resetUrl } : {}),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(resetPasswordDto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const now = new Date();
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { gt: now },
        isActive: true,
      },
      data: {
        password: await this.hashPassword(resetPasswordDto.password),
        passwordChangedAt: now,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        resetPasswordRequestedAt: null,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    return { message: 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay.' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('Không tìm thấy tài khoản');
    return user;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Không tìm thấy tài khoản');

    const passwordValid = await this.comparePasswords(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!passwordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (
      await this.comparePasswords(changePasswordDto.newPassword, user.password)
    ) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await this.hashPassword(changePasswordDto.newPassword),
        passwordChangedAt: new Date(),
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        resetPasswordRequestedAt: null,
      },
    });

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  private findUserByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendResetEmail(email: string, resetUrl: string, ttlMinutes: number) {
    if (!process.env.SMTP_HOST) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD || '',
            },
          }
        : {}),
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'SportData CMS <no-reply@sportdata.local>',
      to: email,
      subject: 'Đặt lại mật khẩu SportCMS',
      text: `Mở liên kết sau để đặt lại mật khẩu SportCMS. Liên kết hết hạn sau ${ttlMinutes} phút và chỉ dùng được một lần:\n\n${resetUrl}`,
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu SportCMS.</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết hết hạn sau ${ttlMinutes} phút và chỉ dùng được một lần.</p>`,
    });
  }

  private generateToken(userId: string, email: string, username?: string | null): string {
    return this.jwtService.sign(
      { sub: userId, email, username, sessionIssuedAt: Date.now() },
      {
        secret: process.env.JWT_SECRET || 'sportdata-dev-secret-change-me-please',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    );
  }
}
