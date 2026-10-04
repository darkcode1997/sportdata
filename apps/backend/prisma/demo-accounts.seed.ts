import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const DEMO_ACCOUNT_PASSWORD = 'SportData@Demo2026!';

export const operationalDemoAccounts = [
  {
    username: 'demo.admin',
    email: 'demo-admin@sportdata.test',
    name: 'Demo · Quản trị hệ thống',
    role: UserRole.ADMIN,
  },
  {
    username: 'demo.content',
    email: 'demo-content@sportdata.test',
    name: 'Demo · Biên tập nội dung',
    role: UserRole.CONTENT,
  },
  {
    username: 'demo.games',
    email: 'demo-games@sportdata.test',
    name: 'Demo · Quản lý sự kiện',
    role: UserRole.GAMES_ADMIN,
  },
  {
    username: 'demo.viewer',
    email: 'demo-viewer@sportdata.test',
    name: 'Demo · Chỉ xem',
    role: UserRole.READ_ONLY,
  },
] as const;

export async function seedOperationalDemoAccounts(prisma: PrismaClient) {
  const production = process.env.NODE_ENV === 'production';
  if (production && process.env.ALLOW_DEMO_ACCOUNTS_IN_PRODUCTION !== 'true') {
    throw new Error(
      'Demo accounts are disabled in production. Set ALLOW_DEMO_ACCOUNTS_IN_PRODUCTION=true only for an isolated test environment.',
    );
  }

  const configuredPassword = process.env.DEMO_ACCOUNT_PASSWORD?.trim();
  const password = configuredPassword || DEMO_ACCOUNT_PASSWORD;
  if (production && !configuredPassword) {
    throw new Error('DEMO_ACCOUNT_PASSWORD must be explicitly configured in production.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(
    operationalDemoAccounts.map((account) => prisma.user.upsert({
      where: { email: account.email },
      update: {
        username: account.username,
        name: account.name,
        password: passwordHash,
        role: account.role,
        isActive: true,
        passwordChangedAt: new Date(),
      },
      create: {
        ...account,
        password: passwordHash,
        isActive: true,
      },
    })),
  );

  return operationalDemoAccounts;
}
