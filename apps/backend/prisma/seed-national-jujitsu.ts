import { DrawType } from '@prisma/client';
import { MatchesService } from '../src/matches/matches.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedNationalJujitsuDemo } from './national-jujitsu.seed';

const prisma = new PrismaService();
const matches = new MatchesService(prisma);

async function main() {
  await prisma.$connect();
  const summary = await seedNationalJujitsuDemo(prisma);
  let generatedMatches = 0;

  for (let index = 0; index < summary.categoryAthletes.length; index += 1) {
    const item = summary.categoryAthletes[index];
    const draw = await matches.generateDraw(summary.eventId, item.categoryId, {
      athleteIds: item.athleteIds,
      type: DrawType.MAIN_TREE,
      seedingMode: 'FEDERATION_SEPARATED',
      name: `Nhánh đấu toàn quốc ${index + 1}`,
      fops: ['Thảm 1', 'Thảm 2', 'Thảm 3', 'Thảm 4'],
    });
    generatedMatches += draw.draws.reduce((total, current) => total + current.matches.length, 0);
  }

  const competitionDays = [
    new Date('2026-11-15T01:00:00.000Z'),
    new Date('2026-11-16T01:00:00.000Z'),
    new Date('2026-11-17T01:00:00.000Z'),
  ];
  await prisma.match.updateMany({
    where: { eventId: summary.eventId, round: 1 },
    data: { matchDate: competitionDays[0], notes: 'Nhánh thắng · Vòng loại' },
  });
  await prisma.match.updateMany({
    where: { eventId: summary.eventId, round: 2 },
    data: { matchDate: competitionDays[1], notes: 'Nhánh thắng · Tứ kết' },
  });
  await prisma.match.updateMany({
    where: { eventId: summary.eventId, round: { gte: 3 } },
    data: { matchDate: competitionDays[2], notes: 'Nhánh thắng · Bán kết và chung kết' },
  });

  const { categoryAthletes: _categoryAthletes, ...report } = summary;
  console.log('National Ju-Jitsu demo ready:');
  console.log(JSON.stringify({ ...report, draws: summary.categoryAthletes.length, matches: generatedMatches }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
