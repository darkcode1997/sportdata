import { PrismaClient } from '@prisma/client';
import { seedOperationalDemoAccounts } from './demo-accounts.seed';

const prisma = new PrismaClient();

seedOperationalDemoAccounts(prisma)
  .then((accounts) => {
    console.log(`Operational demo accounts ready: ${accounts.length} roles.`);
    for (const account of accounts) {
      console.log(`- ${account.username} · ${account.role}`);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
