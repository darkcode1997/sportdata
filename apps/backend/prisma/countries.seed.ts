import { PrismaClient } from '@prisma/client';
import worldCountries from 'world-countries';

export async function seedCountries(prisma: PrismaClient) {
  const names = new Intl.DisplayNames(['vi'], { type: 'region' });
  const data = worldCountries.map(country => ({
    code: country.cioc || country.cca3,
    name: names.of(country.cca2) || country.name.common,
    flagUrl: `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`,
  }));
  await prisma.country.createMany({ data, skipDuplicates: true });
  return prisma.country.count();
}
