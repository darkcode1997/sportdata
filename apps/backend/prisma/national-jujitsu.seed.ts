import {
  BeltLevel,
  EntryStatus,
  EntryType,
  EventLevel,
  FederationType,
  Gender,
  JiuJitsuDiscipline,
  PaymentMode,
  PaymentStatus,
  PrismaClient,
  RegistrationStatus,
  RegistrationSubmissionType,
  UniformType,
} from '@prisma/client';

export const NATIONAL_JUJITSU_EVENT_ID = 'demo-jujitsu-national-2026';
const ATHLETE_PREFIX = 'demo-jjqg26-athlete-';

const delegationSeeds = [
  { code: 'HN', name: 'Đoàn Ju-Jitsu Thành phố Hà Nội' },
  { code: 'HCM', name: 'Đoàn Ju-Jitsu Thành phố Hồ Chí Minh' },
  { code: 'HP', name: 'Đoàn Ju-Jitsu Thành phố Hải Phòng' },
  { code: 'DN', name: 'Đoàn Ju-Jitsu Thành phố Đà Nẵng' },
  { code: 'HUE', name: 'Đoàn Ju-Jitsu Thành phố Huế' },
  { code: 'CT', name: 'Đoàn Ju-Jitsu Thành phố Cần Thơ' },
  { code: 'QN', name: 'Đoàn Ju-Jitsu tỉnh Quảng Ninh' },
  { code: 'TH', name: 'Đoàn Ju-Jitsu tỉnh Thanh Hóa' },
  { code: 'NA', name: 'Đoàn Ju-Jitsu tỉnh Nghệ An' },
  { code: 'BN', name: 'Đoàn Ju-Jitsu tỉnh Bắc Ninh' },
  { code: 'DNAI', name: 'Đoàn Ju-Jitsu tỉnh Đồng Nai' },
  { code: 'LD', name: 'Đoàn Ju-Jitsu tỉnh Lâm Đồng' },
] as const;

const categorySeeds = [
  { key: 'm56', name: 'Newaza Gi Nam - đến 56 kg', gender: Gender.MALE, minWeight: 46.1, maxWeight: 56 },
  { key: 'm62', name: 'Newaza Gi Nam - đến 62 kg', gender: Gender.MALE, minWeight: 56.1, maxWeight: 62 },
  { key: 'm69', name: 'Newaza Gi Nam - đến 69 kg', gender: Gender.MALE, minWeight: 62.1, maxWeight: 69 },
  { key: 'm77', name: 'Newaza Gi Nam - đến 77 kg', gender: Gender.MALE, minWeight: 69.1, maxWeight: 77 },
  { key: 'f48', name: 'Newaza Gi Nữ - đến 48 kg', gender: Gender.FEMALE, minWeight: 40, maxWeight: 48 },
  { key: 'f52', name: 'Newaza Gi Nữ - đến 52 kg', gender: Gender.FEMALE, minWeight: 48.1, maxWeight: 52 },
  { key: 'f57', name: 'Newaza Gi Nữ - đến 57 kg', gender: Gender.FEMALE, minWeight: 52.1, maxWeight: 57 },
  { key: 'f63', name: 'Newaza Gi Nữ - đến 63 kg', gender: Gender.FEMALE, minWeight: 57.1, maxWeight: 63 },
] as const;

const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Hồ'];
const maleNames = ['Minh Quân', 'Quang Huy', 'Tuấn Kiệt', 'Đức Anh', 'Gia Bảo', 'Hoàng Nam', 'Thanh Tùng', 'Trọng Nghĩa'];
const femaleNames = ['Minh Anh', 'Khánh Linh', 'Ngọc Hà', 'Phương Thảo', 'Quỳnh Anh', 'Thu Trang', 'Bảo Ngọc', 'Yến Nhi'];

export async function purgeForeignAthletes(prisma: PrismaClient) {
  const foreignAthletes = await prisma.athlete.findMany({
    where: { country: { code: { notIn: ['VIE', 'VN', 'VNM'] } } },
    select: { id: true, participantAccountId: true },
  });
  const athleteIds = foreignAthletes.map(({ id }) => id);
  const accountIds = foreignAthletes
    .map(({ participantAccountId }) => participantAccountId)
    .filter((id): id is string => Boolean(id));

  if (!athleteIds.length) return { athletes: 0, matches: 0, accounts: 0 };

  const registrationSubmissions = await prisma.eventRegistration.findMany({
    where: { athleteId: { in: athleteIds }, submissionId: { not: null } },
    select: { submissionId: true },
    distinct: ['submissionId'],
  });
  const submissionIds = registrationSubmissions
    .map(({ submissionId }) => submissionId)
    .filter((id): id is string => Boolean(id));

  const deleted = await prisma.$transaction(async (transaction) => {
    const matches = await transaction.match.deleteMany({
      where: {
        OR: [
          { athlete1Id: { in: athleteIds } },
          { athlete2Id: { in: athleteIds } },
          { winnerId: { in: athleteIds } },
          { participants: { some: { athleteId: { in: athleteIds } } } },
        ],
      },
    });
    await transaction.statistic.deleteMany({ where: { athleteId: { in: athleteIds } } });
    await transaction.teamMember.deleteMany({ where: { athleteId: { in: athleteIds } } });
    await transaction.competitionEntry.deleteMany({ where: { athleteId: { in: athleteIds } } });
    await transaction.matchParticipant.deleteMany({ where: { athleteId: { in: athleteIds } } });
    const athletes = await transaction.athlete.deleteMany({ where: { id: { in: athleteIds } } });
    const accounts = accountIds.length
      ? await transaction.participantAccount.deleteMany({ where: { id: { in: accountIds } } })
      : { count: 0 };
    if (submissionIds.length) {
      await transaction.registrationSubmission.deleteMany({
        where: { id: { in: submissionIds }, registrations: { none: {} } },
      });
    }
    return { athletes: athletes.count, matches: matches.count, accounts: accounts.count };
  });

  return deleted;
}

export async function seedNationalJujitsuDemo(prisma: PrismaClient) {
  const cleanup = await purgeForeignAthletes(prisma);
  const vietnam = await prisma.country.findFirst({
    where: { code: { in: ['VIE', 'VN', 'VNM'] } },
  });
  if (!vietnam) throw new Error('Không tìm thấy quốc gia Việt Nam. Hãy chạy seed dữ liệu nền trước.');

  const sport = await prisma.sport.upsert({
    where: { code: 'JJ' },
    update: {
      name: 'Ju-Jitsu',
      displayName: 'Ju-Jitsu Việt Nam',
      subtitle: 'Thi đấu Newaza và Fighting',
      isVisible: true,
    },
    create: {
      id: 'sport-jj',
      code: 'JJ',
      name: 'Ju-Jitsu',
      description: 'Ju-Jitsu International Federation (JJIF)',
      displayName: 'Ju-Jitsu Việt Nam',
      subtitle: 'Thi đấu Newaza và Fighting',
      isVisible: true,
    },
  });

  const existingOrganizer = await prisma.federation.findFirst({
    where: {
      countryId: vietnam.id,
      OR: [
        { code: 'VJF' },
        { name: { contains: 'Jujitsu Federation', mode: 'insensitive' } },
        { name: { contains: 'Ju-Jitsu Việt Nam', mode: 'insensitive' } },
      ],
    },
  });
  const organizer = existingOrganizer
    ? await prisma.federation.update({
      where: { id: existingOrganizer.id },
      data: { name: 'Liên đoàn Ju-Jitsu Việt Nam', type: FederationType.NATIONAL_FEDERATION },
    })
    : await prisma.federation.create({
      data: {
        id: 'demo-jjqg26-organizer',
        code: 'VJF',
        name: 'Liên đoàn Ju-Jitsu Việt Nam',
        type: FederationType.NATIONAL_FEDERATION,
        countryId: vietnam.id,
      },
    });

  const delegations = [];
  for (const seed of delegationSeeds) {
    delegations.push(await prisma.federation.upsert({
      where: { id: `demo-jjqg26-delegation-${seed.code.toLowerCase()}` },
      update: {
        code: `JJ-${seed.code}`,
        name: seed.name,
        type: FederationType.SPORTS_CENTER,
        countryId: vietnam.id,
      },
      create: {
        id: `demo-jjqg26-delegation-${seed.code.toLowerCase()}`,
        code: `JJ-${seed.code}`,
        name: seed.name,
        type: FederationType.SPORTS_CENTER,
        countryId: vietnam.id,
      },
    }));
  }

  const categories = [];
  for (const seed of categorySeeds) {
    categories.push(await prisma.category.upsert({
      where: { id: `demo-jjqg26-category-${seed.key}` },
      update: {
        name: seed.name,
        sportId: sport.id,
        gender: seed.gender,
        discipline: JiuJitsuDiscipline.NEWAZA,
        uniform: UniformType.GI,
        beltLevel: BeltLevel.OPEN,
        matchDurationSeconds: 300,
        minAge: 18,
        maxAge: 35,
        minWeight: seed.minWeight,
        maxWeight: seed.maxWeight,
        maxEntriesPerCountry: 99,
      },
      create: {
        id: `demo-jjqg26-category-${seed.key}`,
        name: seed.name,
        sportId: sport.id,
        gender: seed.gender,
        discipline: JiuJitsuDiscipline.NEWAZA,
        uniform: UniformType.GI,
        beltLevel: BeltLevel.OPEN,
        matchDurationSeconds: 300,
        minAge: 18,
        maxAge: 35,
        minWeight: seed.minWeight,
        maxWeight: seed.maxWeight,
        maxEntriesPerCountry: 99,
      },
    }));
  }

  await prisma.match.deleteMany({ where: { eventId: NATIONAL_JUJITSU_EVENT_ID } });
  await prisma.event.deleteMany({ where: { id: NATIONAL_JUJITSU_EVENT_ID } });
  await prisma.athlete.deleteMany({ where: { id: { startsWith: ATHLETE_PREFIX } } });

  const event = await prisma.event.create({
    data: {
      id: NATIONAL_JUJITSU_EVENT_ID,
      name: 'GIẢI VÔ ĐỊCH JU-JITSU TOÀN QUỐC 2026',
      level: EventLevel.NATIONAL,
      sportId: sport.id,
      organizerId: organizer.id,
      startDate: new Date('2026-11-15T01:00:00.000Z'),
      endDate: new Date('2026-11-17T10:00:00.000Z'),
      location: 'Nhà thi đấu Bắc Từ Liêm, Hà Nội',
      description: 'Dữ liệu demo giải Ju-Jitsu toàn quốc với các đoàn thể thao tỉnh, thành phố; có đăng ký đã duyệt, hạt giống và cây đấu tự động.',
      isPublished: true,
      allowIndependentAthletes: false,
      registrationEnabled: true,
      registrationOpenAt: new Date('2026-09-15T00:00:00.000Z'),
      registrationCloseAt: new Date('2026-11-05T16:59:00.000Z'),
      registrationFee: 0,
      registrationCurrency: 'VND',
      paymentMode: PaymentMode.FREE,
      ticketThemePreset: 'OCEAN',
      ticketLayout: 'CLASSIC',
      ticketPrimaryColor: '#075985',
      ticketSecondaryColor: '#0C4A6E',
      ticketAccentColor: '#DC2626',
      sports: { connect: [{ id: sport.id }] },
      categories: { connect: categories.map(({ id }) => ({ id })) },
      participatingFederations: { connect: delegations.map(({ id }) => ({ id })) },
    },
  });

  const categoryAthletes = new Map<string, string[]>();
  categories.forEach(({ id }) => categoryAthletes.set(id, []));
  let athleteSequence = 0;

  for (let delegationIndex = 0; delegationIndex < delegations.length; delegationIndex += 1) {
    const delegation = delegations[delegationIndex];
    const submissionId = `demo-jjqg26-submission-${String(delegationIndex + 1).padStart(2, '0')}`;
    await prisma.registrationSubmission.create({
      data: {
        id: submissionId,
        eventId: event.id,
        type: RegistrationSubmissionType.GROUP,
        contactName: `Trưởng đoàn ${delegationSeeds[delegationIndex].code}`,
        contactEmail: `jj.${delegationSeeds[delegationIndex].code.toLowerCase()}@demo.sportdata.vn`,
        contactPhone: `090100${String(delegationIndex + 1).padStart(4, '0')}`,
        organizationName: delegation.name,
        referenceCode: `JJQG26-${delegationSeeds[delegationIndex].code}-TEAM`,
      },
    });

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      athleteSequence += 1;
      const category = categories[categoryIndex];
      const categorySeed = categorySeeds[categoryIndex];
      const athleteId = `${ATHLETE_PREFIX}${String(athleteSequence).padStart(3, '0')}`;
      const names = categorySeed.gender === Gender.FEMALE ? femaleNames : maleNames;
      const familyName = familyNames[(delegationIndex + categoryIndex) % familyNames.length];
      const givenName = names[(delegationIndex * 3 + categoryIndex) % names.length];
      const fullName = `${familyName} ${givenName} ${String(delegationIndex + 1).padStart(2, '0')}`;
      const weight = Number((categorySeed.maxWeight - 0.6 - (delegationIndex % 3) * 0.2).toFixed(1));
      const athlete = await prisma.athlete.create({
        data: {
          id: athleteId,
          firstName: familyName,
          lastName: `${givenName} ${String(delegationIndex + 1).padStart(2, '0')}`,
          fullName,
          gender: categorySeed.gender,
          birthDate: new Date(Date.UTC(1995 + ((delegationIndex + categoryIndex) % 10), (categoryIndex * 2) % 12, 5 + (delegationIndex % 20))),
          weight,
          height: categorySeed.gender === Gender.FEMALE ? 158 + (delegationIndex % 10) : 166 + (delegationIndex % 12),
          countryId: vietnam.id,
          federationId: delegation.id,
          events: { connect: [{ id: event.id }] },
          categories: { connect: [{ id: category.id }] },
        },
      });
      categoryAthletes.get(category.id)!.push(athlete.id);

      const registrationId = `demo-jjqg26-registration-${String(athleteSequence).padStart(3, '0')}`;
      await prisma.eventRegistration.create({
        data: {
          id: registrationId,
          eventId: event.id,
          athleteId: athlete.id,
          submissionId,
          categoryId: category.id,
          federationId: delegation.id,
          status: RegistrationStatus.CONFIRMED,
          statusReason: 'Dữ liệu demo đã được Ban tổ chức duyệt.',
          statusChangedAt: new Date(),
          statusChangedBy: 'SYSTEM:DEMO_SEED',
          paymentStatus: PaymentStatus.NOT_REQUIRED,
          paymentStatusReason: 'Giải demo miễn lệ phí đăng ký.',
          paymentStatusChangedAt: new Date(),
          paymentStatusChangedBy: 'SYSTEM:DEMO_SEED',
          feeAmount: 0,
          currency: 'VND',
          ticketCode: `SD-JJQG26-${String(athleteSequence).padStart(3, '0')}`,
          statusHistory: {
            create: {
              fromStatus: RegistrationStatus.SUBMITTED,
              toStatus: RegistrationStatus.CONFIRMED,
              reason: 'Dữ liệu demo đã được Ban tổ chức duyệt.',
              changedBy: 'SYSTEM:DEMO_SEED',
            },
          },
        },
      });

      await prisma.competitionEntry.create({
        data: {
          id: `demo-jjqg26-entry-${String(athleteSequence).padStart(3, '0')}`,
          eventId: event.id,
          categoryId: category.id,
          countryId: vietnam.id,
          athleteId: athlete.id,
          type: EntryType.INDIVIDUAL,
          status: EntryStatus.VERIFIED,
          seed: delegationIndex < 4 ? delegationIndex + 1 : null,
          bib: `JJ26-${String(athleteSequence).padStart(3, '0')}`,
          notes: delegationIndex < 4 ? `Hạt giống số ${delegationIndex + 1}` : 'Vận động viên chính thức',
        },
      });
    }
  }

  return {
    cleanup,
    eventId: event.id,
    eventName: event.name,
    organizer: organizer.name,
    delegations: delegations.length,
    categories: categories.length,
    athletes: athleteSequence,
    registrations: athleteSequence,
    entries: athleteSequence,
    categoryAthletes: categories.map((category) => ({
      categoryId: category.id,
      athleteIds: categoryAthletes.get(category.id) || [],
    })),
  };
}
