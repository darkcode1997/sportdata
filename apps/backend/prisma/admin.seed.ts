import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient) {
  const email = (process.env.ADMIN_EMAIL || 'admin@sportdata.vn').trim().toLowerCase();
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const name = process.env.ADMIN_NAME || 'SportData Administrator';
  const configuredRole = process.env.ADMIN_ROLE?.trim().toUpperCase();
  const role = configuredRole === 'CONTENT' || configuredRole === 'EDITOR'
    ? UserRole.CONTENT
    : UserRole.ADMIN;
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'SportData@ChangeMe2026!', 12);
  const syncPassword = process.env.ADMIN_SYNC_PASSWORD === 'true';

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      name,
      role,
      ...(syncPassword ? { password, passwordChangedAt: new Date() } : {}),
    },
    create: { email, username, name, password, role },
    select: { username: true, email: true, role: true },
  });
  console.log(`Admin configured: ${admin.username} (${admin.email}) - ${admin.role}`);
  return admin;
}
