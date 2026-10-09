import { PrismaClient } from '@prisma/client';
import { seedCountries } from './countries.seed';

const prisma = new PrismaClient();
seedCountries(prisma)
  .then(count => console.log(`Countries ready: ${count}`))
  .catch(() => { console.error('Could not initialize countries. Check database connectivity.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
