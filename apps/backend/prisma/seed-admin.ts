import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './admin.seed';

const prisma = new PrismaClient();

seedAdmin(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
