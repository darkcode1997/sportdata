import { PrismaClient } from '@prisma/client';
import { seedDomesticCentersDemo } from './domestic-centers.seed';

const prisma = new PrismaClient();

seedDomesticCentersDemo(prisma)
  .then((summary) => {
    console.log('Domestic sports-center demo ready:');
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

