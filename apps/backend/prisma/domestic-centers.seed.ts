import {
  EntryStatus,
  EntryType,
  EventLevel,
  FederationType,
  Gender,
  PrismaClient,
} from '@prisma/client';

const EVENT_ID = 'demo-domestic-sports-centers-2026';

const centerSeeds = [
  { id: 'demo-center-hanoi', code: 'TT-HN', name: 'Trung tâm Huấn luyện và Thi đấu TDTT Hà Nội' },
  { id: 'demo-center-hcm', code: 'TT-HCM', name: 'Trung tâm Huấn luyện và Thi đấu TDTT TP.HCM' },
  { id: 'demo-center-danang', code: 'TT-DN', name: 'Trung tâm Huấn luyện và Thi đấu TDTT Đà Nẵng' },
  { id: 'demo-club-cantho', code: 'CLB-CT', name: 'Câu lạc bộ Thể thao thành tích cao Cần Thơ', type: FederationType.CLUB },
];

const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ'];
const givenNames = ['Minh Anh', 'Quang Huy', 'Gia Bảo', 'Thanh Hà', 'Đức Anh', 'Khánh Linh', 'Tuấn Kiệt', 'Ngọc Mai'];

export async function seedDomesticCentersDemo(prisma: PrismaClient) {
  const vietnam = await prisma.country.findFirst({
    where: { code: { in: ['VIE', 'VN', 'VNM'] } },
  });
  if (!vietnam) {
    throw new Error('Không tìm thấy Việt Nam. Hãy chạy seed dữ liệu nền trước.');
  }

  const sport = await prisma.sport.findFirst({
    where: { OR: [{ code: 'BOX' }, { name: { contains: 'Boxing', mode: 'insensitive' } }] },
    include: { categories: { orderBy: { name: 'asc' }, take: 5 } },
  });
  if (!sport || !sport.categories.length) {
    throw new Error('Không tìm thấy Boxing và hạng thi đấu. Hãy chạy seed dữ liệu nền trước.');
  }

  const centers = [];
  for (const seed of centerSeeds) {
    centers.push(await prisma.federation.upsert({
      where: { id: seed.id },
      update: {
        code: seed.code,
        name: seed.name,
        type: seed.type || FederationType.SPORTS_CENTER,
        countryId: vietnam.id,
      },
      create: {
        ...seed,
        type: seed.type || FederationType.SPORTS_CENTER,
        countryId: vietnam.id,
      },
    }));
  }

  const athletes = [];
  for (let index = 0; index < 40; index += 1) {
    const category = sport.categories[index % sport.categories.length];
    const center = centers[index % centers.length];
    const fullName = `${familyNames[index % familyNames.length]} ${givenNames[index % givenNames.length]} ${String(index + 1).padStart(2, '0')}`;
    const athleteId = `demo-domestic-athlete-${String(index + 1).padStart(3, '0')}`;
    const gender = category.gender === Gender.MIXED
      ? (index % 2 === 0 ? Gender.MALE : Gender.FEMALE)
      : category.gender;
    const weight = category.minWeight != null && category.maxWeight != null
      ? (category.minWeight + category.maxWeight) / 2
      : category.maxWeight != null
        ? Math.max(35, category.maxWeight - 1)
        : category.minWeight != null
          ? category.minWeight + 1
          : 60;

    athletes.push(await prisma.athlete.upsert({
      where: { id: athleteId },
      update: {
        firstName: familyNames[index % familyNames.length],
        lastName: `${givenNames[index % givenNames.length]} ${String(index + 1).padStart(2, '0')}`,
        fullName,
        gender,
        birthDate: new Date(Date.UTC(1998 + (index % 8), index % 12, 1 + (index % 25))),
        weight,
        countryId: vietnam.id,
        federationId: center.id,
        categories: { set: [{ id: category.id }] },
      },
      create: {
        id: athleteId,
        firstName: familyNames[index % familyNames.length],
        lastName: `${givenNames[index % givenNames.length]} ${String(index + 1).padStart(2, '0')}`,
        fullName,
        gender,
        birthDate: new Date(Date.UTC(1998 + (index % 8), index % 12, 1 + (index % 25))),
        weight,
        countryId: vietnam.id,
        federationId: center.id,
        categories: { connect: [{ id: category.id }] },
      },
    }));
  }

  const event = await prisma.event.upsert({
    where: { id: EVENT_ID },
    update: {
      name: 'Giải giao hữu các Trung tâm Thể thao Việt Nam 2026',
      level: EventLevel.NATIONAL,
      sportId: sport.id,
      organizerId: centers[0].id,
      startDate: new Date('2026-10-02T01:00:00.000Z'),
      endDate: new Date('2026-10-04T14:00:00.000Z'),
      location: 'Nhà thi đấu Hà Nội, Việt Nam',
      description: 'Dữ liệu mẫu cho giải trong nước giữa các trung tâm và câu lạc bộ thể thao.',
      isPublished: true,
      allowIndependentAthletes: false,
      sports: { set: [{ id: sport.id }] },
      categories: { set: sport.categories.map(({ id }) => ({ id })) },
      participatingFederations: { set: centers.map(({ id }) => ({ id })) },
      athletes: { set: athletes.map(({ id }) => ({ id })) },
    },
    create: {
      id: EVENT_ID,
      name: 'Giải giao hữu các Trung tâm Thể thao Việt Nam 2026',
      level: EventLevel.NATIONAL,
      sportId: sport.id,
      organizerId: centers[0].id,
      startDate: new Date('2026-10-02T01:00:00.000Z'),
      endDate: new Date('2026-10-04T14:00:00.000Z'),
      location: 'Nhà thi đấu Hà Nội, Việt Nam',
      description: 'Dữ liệu mẫu cho giải trong nước giữa các trung tâm và câu lạc bộ thể thao.',
      isPublished: true,
      allowIndependentAthletes: false,
      sports: { connect: [{ id: sport.id }] },
      categories: { connect: sport.categories.map(({ id }) => ({ id })) },
      participatingFederations: { connect: centers.map(({ id }) => ({ id })) },
      athletes: { connect: athletes.map(({ id }) => ({ id })) },
    },
  });

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const category = sport.categories[index % sport.categories.length];
    await prisma.competitionEntry.upsert({
      where: {
        eventId_categoryId_athleteId: {
          eventId: event.id,
          categoryId: category.id,
          athleteId: athlete.id,
        },
      },
      update: { status: EntryStatus.VERIFIED, seed: index + 1 },
      create: {
        id: `demo-domestic-entry-${String(index + 1).padStart(3, '0')}`,
        eventId: event.id,
        categoryId: category.id,
        countryId: vietnam.id,
        athleteId: athlete.id,
        type: EntryType.INDIVIDUAL,
        status: EntryStatus.VERIFIED,
        seed: index + 1,
      },
    });
  }

  return {
    eventId: event.id,
    eventName: event.name,
    organizer: centers[0].name,
    centers: centers.length,
    athletes: athletes.length,
    categories: sport.categories.length,
    entries: athletes.length,
  };
}

