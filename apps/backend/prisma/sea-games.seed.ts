import {
  BracketSide,
  DrawType,
  EntryStatus,
  EntryType,
  Gender,
  MatchStatus,
  MatchType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const SEA_GAMES_EVENT_ID = 'event-sea-games-2026-demo';
const SEA_GAMES_ATHLETE_PREFIX = 'sea26-ath-';
const SEA_GAMES_ATHLETE_COUNT = 5_000;
const SEA_GAMES_TIMEZONE_OFFSET_HOURS = 7;
const SEA_GAMES_DURATION_DAYS = 15;

type DelegationSeed = {
  code: string;
  name: string;
  federationName: string;
  familyNames: string[];
  maleNames: string[];
  femaleNames: string[];
};

type SportSeed = {
  code: string;
  name: string;
  venue: string;
  surface: string;
  fopCount: number;
  matchDurationSeconds: number;
  slotMinutes: number;
  maleWeights: Array<number | null>;
  femaleWeights: Array<number | null>;
};

type SeedCategory = {
  id: string;
  name: string;
  sportCode: string;
  sportId: string;
  sportIndex: number;
  categoryIndexInSport: number;
  gender: Gender;
  minWeight: number;
  maxWeight: number | null;
  matchDurationSeconds: number;
  slotMinutes: number;
};

type SeedAthlete = Prisma.AthleteCreateManyInput & {
  categoryId: string;
  sportId: string;
};

type BracketSlot = {
  athleteId?: string;
  sourceMatchId?: string;
};

type PendingMatch = Omit<
  Prisma.MatchCreateManyInput,
  'id' | 'categoryId' | 'fopId' | 'matchDate' | 'startTime' | 'endTime'
> & {
  id: string;
  categoryId: string;
  fopId: string;
  matchDate: Date;
  startTime?: Date;
  endTime?: Date;
  seedRound: number;
  seedPosition: number;
  slotMinutes: number;
};

const DELEGATIONS: DelegationSeed[] = [
  {
    code: 'BRU',
    name: 'Brunei Darussalam',
    federationName: 'Brunei Darussalam SEA Games Delegation',
    familyNames: ['Abdullah', 'Ahmad', 'Hassan', 'Ibrahim', 'Ismail', 'Mahmud', 'Omar', 'Rahman', 'Salleh', 'Yusof'],
    maleNames: ['Adib', 'Aiman', 'Danish', 'Fahmi', 'Hakim', 'Haziq', 'Irfan', 'Nabil', 'Rafiq', 'Syafiq'],
    femaleNames: ['Alya', 'Amirah', 'Farah', 'Hana', 'Izzah', 'Nadia', 'Nurul', 'Qistina', 'Sofia', 'Zahra'],
  },
  {
    code: 'CAM',
    name: 'Campuchia',
    federationName: 'Cambodia SEA Games Delegation',
    familyNames: ['Chan', 'Chea', 'Chhim', 'Heng', 'Khim', 'Lim', 'Long', 'Nhim', 'Sok', 'Vann'],
    maleNames: ['Borey', 'Dara', 'Kosal', 'Makara', 'Piseth', 'Ratha', 'Sambath', 'Sovann', 'Vichea', 'Vireak'],
    femaleNames: ['Bopha', 'Chantrea', 'Davy', 'Kanika', 'Malis', 'Mony', 'Neary', 'Sophea', 'Sreyneang', 'Thida'],
  },
  {
    code: 'INA',
    name: 'Indonesia',
    federationName: 'Indonesia SEA Games Delegation',
    familyNames: ['Aditya', 'Gunawan', 'Halim', 'Hidayat', 'Kurniawan', 'Nugroho', 'Pratama', 'Santoso', 'Saputra', 'Wijaya'],
    maleNames: ['Agus', 'Arif', 'Bagus', 'Bima', 'Dimas', 'Eko', 'Fajar', 'Rizky', 'Surya', 'Yoga'],
    femaleNames: ['Aisyah', 'Ayu', 'Citra', 'Dewi', 'Fitri', 'Intan', 'Lestari', 'Nabila', 'Putri', 'Sari'],
  },
  {
    code: 'LAO',
    name: 'Lào',
    federationName: 'Lao PDR SEA Games Delegation',
    familyNames: ['Chanthavong', 'Inthavong', 'Keobounphanh', 'Khampheng', 'Khamvongsa', 'Phommasone', 'Saysana', 'Sisavath', 'Souliyavong', 'Vongdala'],
    maleNames: ['Anousone', 'Bounmy', 'Khamla', 'Khamphanh', 'Kongkeo', 'Noy', 'Sengdao', 'Somchai', 'Thongsavanh', 'Vieng'],
    femaleNames: ['Bounthavy', 'Chansamone', 'Dao', 'Khamphou', 'Ketsana', 'Manivanh', 'Noyvanh', 'Phonethip', 'Sengmany', 'Vilay'],
  },
  {
    code: 'MAS',
    name: 'Malaysia',
    federationName: 'Malaysia SEA Games Delegation',
    familyNames: ['Abdullah', 'Aziz', 'Chong', 'Hamid', 'Ibrahim', 'Ismail', 'Lee', 'Lim', 'Rahman', 'Tan'],
    maleNames: ['Adam', 'Amir', 'Danish', 'Farid', 'Hafiz', 'Hakim', 'Irfan', 'Rayyan', 'Syafiq', 'Zikri'],
    femaleNames: ['Aina', 'Alya', 'Farah', 'Hannah', 'Izzati', 'Mei Ling', 'Nadia', 'Nur', 'Siti', 'Yasmin'],
  },
  {
    code: 'MYA',
    name: 'Myanmar',
    federationName: 'Myanmar SEA Games Delegation',
    familyNames: ['Aung', 'Htet', 'Khant', 'Kyaw', 'Linn', 'Min', 'Naing', 'Phyo', 'Thein', 'Zaw'],
    maleNames: ['Arkar', 'Hein', 'Kaung', 'Myo', 'Nay', 'Paing', 'Sithu', 'Thant', 'Wai', 'Ye'],
    femaleNames: ['Ei', 'Hnin', 'May', 'Moe', 'Nandar', 'Nwe', 'Phyu', 'Su', 'Thiri', 'Yoon'],
  },
  {
    code: 'PHI',
    name: 'Philippines',
    federationName: 'Philippines SEA Games Delegation',
    familyNames: ['Bautista', 'Cruz', 'Dela Rosa', 'Garcia', 'Mendoza', 'Navarro', 'Reyes', 'Santos', 'Torres', 'Villanueva'],
    maleNames: ['Angelo', 'Carlo', 'Diego', 'Gabriel', 'Joaquin', 'Luis', 'Marco', 'Mateo', 'Paolo', 'Rafael'],
    femaleNames: ['Angela', 'Bianca', 'Camila', 'Isabella', 'Julia', 'Maria', 'Mikaela', 'Patricia', 'Sofia', 'Teresa'],
  },
  {
    code: 'SGP',
    name: 'Singapore',
    federationName: 'Singapore SEA Games Delegation',
    familyNames: ['Chua', 'Goh', 'Koh', 'Lee', 'Lim', 'Ng', 'Ong', 'Tan', 'Teo', 'Wong'],
    maleNames: ['Benjamin', 'Darren', 'Ethan', 'Jia Wei', 'Jun Hao', 'Kai', 'Marcus', 'Ryan', 'Wei Ming', 'Zhi Hao'],
    femaleNames: ['Cheryl', 'Hui Min', 'Jia Yi', 'Jolene', 'Mei', 'Rachel', 'Shi Hui', 'Xin Yi', 'Ying', 'Zoe'],
  },
  {
    code: 'THA',
    name: 'Thái Lan',
    federationName: 'Thailand SEA Games Delegation',
    familyNames: ['Boonmee', 'Chaiyaporn', 'Kittisak', 'Pongpanich', 'Rattanakorn', 'Sae-Tang', 'Srisai', 'Sukjai', 'Thongchai', 'Wattanakul'],
    maleNames: ['Anan', 'Arthit', 'Chanon', 'Kittipong', 'Narin', 'Nattapong', 'Preecha', 'Sakda', 'Somchai', 'Thanawat'],
    femaleNames: ['Achara', 'Busaba', 'Kanya', 'Lalita', 'Malee', 'Nicha', 'Pimchanok', 'Siriporn', 'Suchada', 'Waranya'],
  },
  {
    code: 'TLS',
    name: 'Timor-Leste',
    federationName: 'Timor-Leste SEA Games Delegation',
    familyNames: ['Almeida', 'Belo', 'Correia', 'Costa', 'Da Silva', 'Fernandes', 'Guterres', 'Martins', 'Pereira', 'Soares'],
    maleNames: ['Adelino', 'Carlos', 'Domingos', 'Eusebio', 'Joao', 'Jose', 'Mateus', 'Miguel', 'Paulo', 'Tomas'],
    femaleNames: ['Adriana', 'Ana', 'Beatriz', 'Cristina', 'Elisa', 'Filomena', 'Isabel', 'Lucia', 'Maria', 'Rita'],
  },
  {
    code: 'VIE',
    name: 'Việt Nam',
    federationName: 'Đoàn Thể thao Việt Nam',
    familyNames: ['Bùi', 'Đặng', 'Đỗ', 'Hoàng', 'Lê', 'Ngô', 'Nguyễn', 'Phạm', 'Trần', 'Vũ'],
    maleNames: ['Anh Dũng', 'Đức Anh', 'Gia Huy', 'Hoàng Nam', 'Minh Khang', 'Quang Huy', 'Thanh Tùng', 'Trọng Nghĩa', 'Tuấn Anh', 'Việt Hoàng'],
    femaleNames: ['Bảo Anh', 'Diệu Linh', 'Hà My', 'Khánh Linh', 'Minh Anh', 'Ngọc Hà', 'Phương Thảo', 'Quỳnh Anh', 'Thu Trang', 'Yến Nhi'],
  },
];

const SPORTS: SportSeed[] = [
  { code: 'BOX', name: 'Boxing', venue: 'Nhà thi đấu Tây Hồ', surface: 'Ring', fopCount: 5, matchDurationSeconds: 540, slotMinutes: 15, maleWeights: [48, 51, 54, 57, 60, 63.5, 67, 71, 75, 80, 86, 92, null], femaleWeights: [48, 50, 52, 54, 57, 60, 63, 66, 70, 75, 81, null] },
  { code: 'TKD', name: 'Taekwondo', venue: 'Cung thể thao Quần Ngựa', surface: 'Thảm', fopCount: 5, matchDurationSeconds: 360, slotMinutes: 12, maleWeights: [54, 58, 63, 68, 74, 80, 87, null], femaleWeights: [46, 49, 53, 57, 62, 67, 73, null] },
  { code: 'JUD', name: 'Judo', venue: 'Nhà thi đấu Cầu Giấy', surface: 'Tatami', fopCount: 5, matchDurationSeconds: 240, slotMinutes: 10, maleWeights: [60, 66, 73, 81, 90, 100, null], femaleWeights: [48, 52, 57, 63, 70, 78, null] },
  { code: 'KAR', name: 'Karate Kumite', venue: 'Nhà thi đấu Hà Đông', surface: 'Tatami', fopCount: 5, matchDurationSeconds: 180, slotMinutes: 10, maleWeights: [60, 67, 75, 84, null], femaleWeights: [50, 55, 61, 68, null] },
  { code: 'JJ', name: 'Ju-Jitsu', venue: 'Nhà thi đấu Bắc Từ Liêm', surface: 'FOP', fopCount: 5, matchDurationSeconds: 300, slotMinutes: 10, maleWeights: [56, 62, 69, 77, 85, 94, 110, null], femaleWeights: [45, 48, 52, 57, 63, 70, 85, null] },
  { code: 'WUS', name: 'Wushu Sanda', venue: 'Nhà thi đấu Trịnh Hoài Đức', surface: 'Đài', fopCount: 5, matchDurationSeconds: 360, slotMinutes: 12, maleWeights: [48, 52, 56, 60, 65], femaleWeights: [48, 52, 56] },
  { code: 'MUA', name: 'Muay', venue: 'Nhà thi đấu Hai Bà Trưng', surface: 'Ring', fopCount: 5, matchDurationSeconds: 540, slotMinutes: 15, maleWeights: [51, 54, 57, 60, 63.5, 67, 71], femaleWeights: [48, 51, 54, 57, 60, 63.5, 67] },
  { code: 'PEN', name: 'Pencak Silat', venue: 'Nhà thi đấu Hoàng Mai', surface: 'Thảm', fopCount: 5, matchDurationSeconds: 540, slotMinutes: 15, maleWeights: [50, 55, 60, 65, 70, 75, 80, 85, null], femaleWeights: [45, 50, 55, 60, 65, 70, 75, 80, null] },
  { code: 'WRE', name: 'Vật tự do', venue: 'Nhà thi đấu Gia Lâm', surface: 'Thảm', fopCount: 5, matchDurationSeconds: 360, slotMinutes: 12, maleWeights: [57, 65, 74, 86, 97, 125], femaleWeights: [50, 53, 57, 62, 68, 76] },
  { code: 'KIC', name: 'Kickboxing', venue: 'Nhà thi đấu Long Biên', surface: 'Ring', fopCount: 5, matchDurationSeconds: 540, slotMinutes: 15, maleWeights: [51, 57, 63.5, 71, 81, 91, null], femaleWeights: [48, 52, 56, 60, 65, 70, null] },
];

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function localDateTime(dayOffset: number, minutesFromMidnight: number) {
  const localMidnightUtc = Date.UTC(2026, 11, 1 + dayOffset, -SEA_GAMES_TIMEZONE_OFFSET_HOURS);
  return new Date(localMidnightUtc + minutesFromMidnight * 60_000);
}

function nextPowerOfTwo(value: number) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function matchTypeForRemainingMatches(matchCount: number, isPreliminary: boolean) {
  if (isPreliminary) return MatchType.ELIMINATION;
  if (matchCount === 1) return MatchType.FINAL;
  if (matchCount === 2) return MatchType.SEMIFINAL;
  if (matchCount === 4) return MatchType.QUARTERFINAL;
  if (matchCount === 8) return MatchType.ROUND_OF_16;
  if (matchCount === 16) return MatchType.ROUND_OF_32;
  return MatchType.ELIMINATION;
}

function categoryWeight(weight: number | null, previousWeight?: number) {
  if (weight === null) {
    return {
      label: `trên ${previousWeight} kg`,
      minWeight: Number((previousWeight + 0.1).toFixed(1)),
      maxWeight: null,
    };
  }

  return {
    label: `đến ${weight} kg`,
    minWeight: previousWeight === undefined
      ? Math.max(35, Number((weight - 10).toFixed(1)))
      : Number((previousWeight + 0.1).toFixed(1)),
    maxWeight: weight,
  };
}

function buildCategories(sportIds: Map<string, string>) {
  const categories: SeedCategory[] = [];

  SPORTS.forEach((sport, sportIndex) => {
    const sportId = sportIds.get(sport.code)!;
    const appendGender = (gender: Gender, weights: Array<number | null>) => {
      let previousWeight: number | undefined;
      weights.forEach((weight, categoryIndex) => {
        const range = categoryWeight(weight, previousWeight);
        const genderCode = gender === Gender.MALE ? 'm' : 'f';
        categories.push({
          id: `sea26-cat-${sport.code.toLowerCase()}-${genderCode}-${slug(range.label)}-${categoryIndex + 1}`,
          name: `${sport.name} ${gender === Gender.MALE ? 'Nam' : 'Nữ'} - ${range.label}`,
          sportCode: sport.code,
          sportId,
          sportIndex,
          categoryIndexInSport: categoryIndex,
          gender,
          minWeight: range.minWeight,
          maxWeight: range.maxWeight,
          matchDurationSeconds: sport.matchDurationSeconds,
          slotMinutes: sport.slotMinutes,
        });
        if (weight !== null) previousWeight = weight;
      });
    };

    appendGender(Gender.MALE, sport.maleWeights);
    appendGender(Gender.FEMALE, sport.femaleWeights);
  });

  return categories;
}

function athleteName(delegation: DelegationSeed, gender: Gender, localIndex: number) {
  const givenNames = gender === Gender.MALE ? delegation.maleNames : delegation.femaleNames;
  const familyName = delegation.familyNames[localIndex % delegation.familyNames.length];
  const givenIndex = Math.floor(localIndex / delegation.familyNames.length) % givenNames.length;
  const variant = Math.floor(localIndex / (delegation.familyNames.length * givenNames.length));
  const firstGivenName = givenNames[givenIndex];
  const secondGivenName = givenNames[(givenIndex + variant + 3) % givenNames.length];
  const firstName = firstGivenName === secondGivenName
    ? firstGivenName
    : `${firstGivenName} ${secondGivenName}`;

  return {
    firstName,
    lastName: familyName,
    fullName: `${familyName} ${firstName}`,
  };
}

function athleteWeight(category: SeedCategory, index: number) {
  const lower = category.minWeight;
  const upper = category.maxWeight ?? lower + 12;
  const range = Math.max(0.5, upper - lower);
  return Number((lower + 0.2 + ((index * 37) % 100) / 100 * Math.max(0.2, range - 0.4)).toFixed(1));
}

function buildAthletes(
  categories: SeedCategory[],
  countryIds: Map<string, string>,
  federationIds: Map<string, string>,
) {
  const maleCategories = categories.filter((category) => category.gender === Gender.MALE);
  const femaleCategories = categories.filter((category) => category.gender === Gender.FEMALE);
  const countryCounters = new Map<string, number>();
  const athletes: SeedAthlete[] = [];

  for (let index = 0; index < SEA_GAMES_ATHLETE_COUNT; index += 1) {
    const delegation = DELEGATIONS[index % DELEGATIONS.length];
    const gender = index % 2 === 0 ? Gender.MALE : Gender.FEMALE;
    const compatibleCategories = gender === Gender.MALE ? maleCategories : femaleCategories;
    const categoryIndex = (Math.floor(index / 2) * 17) % compatibleCategories.length;
    const category = compatibleCategories[categoryIndex];
    const localIndex = countryCounters.get(delegation.code) || 0;
    countryCounters.set(delegation.code, localIndex + 1);
    const name = athleteName(delegation, gender, localIndex);
    const year = 1993 + (index % 14);

    athletes.push({
      id: `${SEA_GAMES_ATHLETE_PREFIX}${delegation.code.toLowerCase()}-${String(localIndex + 1).padStart(4, '0')}`,
      ...name,
      gender,
      birthDate: new Date(Date.UTC(year, index % 12, (index % 27) + 1)),
      weight: athleteWeight(category, index),
      height: Number((1.55 + ((index * 13) % 38) / 100).toFixed(2)),
      countryId: countryIds.get(delegation.code)!,
      federationId: federationIds.get(delegation.code)!,
      categoryId: category.id,
      sportId: category.sportId,
    });
  }

  return athletes;
}

function buildBracket(
  category: SeedCategory,
  participants: SeedAthlete[],
  drawId: string,
  fop: { id: string; name: string },
  globalMatchNumber: { value: number },
) {
  const participantsByCountry = new Map<string, SeedAthlete[]>();
  for (const participant of participants) {
    const group = participantsByCountry.get(participant.countryId) || [];
    group.push(participant);
    participantsByCountry.set(participant.countryId, group);
  }
  const countryGroups = [...participantsByCountry.values()]
    .map((group) => group.sort((left, right) => String(left.id).localeCompare(String(right.id))))
    .sort((left, right) => left[0].countryId.localeCompare(right[0].countryId));
  const participantIds: string[] = [];
  const largestDelegation = Math.max(...countryGroups.map((group) => group.length));
  for (let seed = 0; seed < largestDelegation; seed += 1) {
    for (const group of countryGroups) {
      if (group[seed]) participantIds.push(group[seed].id as string);
    }
  }
  const bracketSize = nextPowerOfTwo(participantIds.length);
  const preliminaryMatchCount = participantIds.length - bracketSize / 2;
  const matches: PendingMatch[] = [];
  const matchById = new Map<string, PendingMatch>();
  let round = 1;
  let entrantCursor = 0;
  let currentSlots: BracketSlot[] = [];

  const appendMatch = (
    athlete1Id: string | undefined,
    athlete2Id: string | undefined,
    matchType: MatchType,
    position: number,
  ) => {
    const id = `sea26-match-${slug(category.id)}-r${round}-p${position + 1}`;
    const match: PendingMatch = {
      id,
      eventId: SEA_GAMES_EVENT_ID,
      categoryId: category.id,
      drawId,
      matchNumber: globalMatchNumber.value++,
      fop: fop.name,
      fopId: fop.id,
      matchDate: localDateTime(0, 0),
      athlete1Id,
      athlete2Id,
      status: MatchStatus.SCHEDULED,
      matchType,
      round,
      bracketPosition: position,
      notes: 'Lịch SEA Games mô phỏng - kết quả chưa được nhập',
      seedRound: round,
      seedPosition: position,
      slotMinutes: category.slotMinutes,
    };
    matches.push(match);
    matchById.set(id, match);
    return match;
  };

  for (let position = 0; position < preliminaryMatchCount; position += 1) {
    const match = appendMatch(
      participantIds[entrantCursor++],
      participantIds[entrantCursor++],
      MatchType.ELIMINATION,
      position,
    );
    currentSlots.push({ sourceMatchId: match.id });
  }

  while (entrantCursor < participantIds.length) {
    currentSlots.push({ athleteId: participantIds[entrantCursor++] });
  }

  // Spread preliminary winners among direct seeds instead of placing all of
  // them next to each other in the following round.
  currentSlots.sort((left, right) => Number(Boolean(right.sourceMatchId)) - Number(Boolean(left.sourceMatchId)));

  while (currentSlots.length > 1) {
    round += 1;
    const nextSlots: BracketSlot[] = [];
    const matchCount = currentSlots.length / 2;

    for (let position = 0; position < matchCount; position += 1) {
      const left = currentSlots[position];
      const right = currentSlots[position + matchCount];
      const match = appendMatch(
        left.athleteId,
        right.athleteId,
        matchTypeForRemainingMatches(matchCount, false),
        position,
      );

      if (left.sourceMatchId) {
        const source = matchById.get(left.sourceMatchId)!;
        source.winnerToMatchId = match.id as string;
        source.winnerToSide = BracketSide.ATHLETE1;
      }
      if (right.sourceMatchId) {
        const source = matchById.get(right.sourceMatchId)!;
        source.winnerToMatchId = match.id as string;
        source.winnerToSide = BracketSide.ATHLETE2;
      }

      nextSlots.push({ sourceMatchId: match.id });
    }

    currentSlots = nextSlots;
  }

  return { bracketSize, matches };
}

function scheduleMatches(matches: PendingMatch[], categoryStartDays: Map<string, number>) {
  const groups = new Map<string, PendingMatch[]>();

  for (const match of matches) {
    const dayOffset = categoryStartDays.get(match.categoryId)! + match.seedRound - 1;
    if (dayOffset >= SEA_GAMES_DURATION_DAYS) {
      throw new Error(`Schedule exceeds SEA Games window for category ${match.categoryId}`);
    }
    const key = `${match.fopId}:${dayOffset}`;
    const group = groups.get(key) || [];
    group.push(match);
    groups.set(key, group);
    match.matchDate = localDateTime(dayOffset, 0);
  }

  for (const [key, group] of groups) {
    const [, dayText] = key.split(':');
    const dayOffset = Number(dayText);
    const regular = group
      .filter((match) => match.matchType !== MatchType.FINAL)
      .sort((left, right) => left.categoryId.localeCompare(right.categoryId)
        || left.seedPosition - right.seedPosition);
    const finals = group
      .filter((match) => match.matchType === MatchType.FINAL)
      .sort((left, right) => left.categoryId.localeCompare(right.categoryId));
    let regularCursor = 8 * 60;

    for (const match of regular) {
      match.startTime = localDateTime(dayOffset, regularCursor);
      match.endTime = new Date(match.startTime.getTime() + (SPORTS.find((sport) => sport.code === categoriesSportCode(match.categoryId))?.matchDurationSeconds || 300) * 1_000);
      regularCursor += match.slotMinutes;
    }

    if (regularCursor > 18 * 60) {
      throw new Error(`FOP capacity exceeded before prime time: ${key}`);
    }

    let finalCursor = 18 * 60;
    for (const match of finals) {
      match.startTime = localDateTime(dayOffset, finalCursor);
      match.endTime = new Date(match.startTime.getTime() + (SPORTS.find((sport) => sport.code === categoriesSportCode(match.categoryId))?.matchDurationSeconds || 300) * 1_000);
      finalCursor += match.slotMinutes;
    }

    if (finalCursor > 21 * 60 + 30) {
      throw new Error(`Prime-time capacity exceeded: ${key}`);
    }
  }
}

function categoriesSportCode(categoryId: string) {
  return categoryId.split('-')[2]?.toUpperCase();
}

function validateSeed(
  categories: SeedCategory[],
  athletes: SeedAthlete[],
  matches: PendingMatch[],
) {
  if (athletes.length !== SEA_GAMES_ATHLETE_COUNT) {
    throw new Error(`Expected ${SEA_GAMES_ATHLETE_COUNT} athletes, received ${athletes.length}`);
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  for (const athlete of athletes) {
    const category = categoryById.get(athlete.categoryId)!;
    if (athlete.gender !== category.gender) {
      throw new Error(`Gender mismatch for athlete ${athlete.id}`);
    }
    const weight = athlete.weight as number;
    if (weight < category.minWeight || (category.maxWeight !== null && weight > category.maxWeight)) {
      throw new Error(`Weight mismatch for athlete ${athlete.id}`);
    }
  }

  const resourceIntervals = new Map<string, Array<{ start: number; end: number; id: string }>>();
  const knownAthleteMatches = new Map<string, number>();
  const startByMatchId = new Map(matches.map((match) => [match.id, match.startTime!.getTime()]));

  for (const match of matches) {
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new Error(`Seeded match is not scheduled: ${match.id}`);
    }
    const key = `${match.fopId}:${match.matchDate.toISOString()}`;
    const interval = {
      start: match.startTime!.getTime(),
      end: match.endTime!.getTime(),
      id: match.id,
    };
    const existing = resourceIntervals.get(key) || [];
    if (existing.some((item) => interval.start < item.end && interval.end > item.start)) {
      throw new Error(`FOP conflict detected for match ${match.id}`);
    }
    existing.push(interval);
    resourceIntervals.set(key, existing);

    for (const athleteId of [match.athlete1Id, match.athlete2Id]) {
      if (!athleteId) continue;
      knownAthleteMatches.set(athleteId, (knownAthleteMatches.get(athleteId) || 0) + 1);
    }

    if (match.winnerToMatchId) {
      const parentStart = startByMatchId.get(match.winnerToMatchId);
      if (!parentStart || parentStart <= match.startTime!.getTime()) {
        throw new Error(`Invalid progression time for match ${match.id}`);
      }
    }
  }

  if (knownAthleteMatches.size !== athletes.length
    || Array.from(knownAthleteMatches.values()).some((count) => count !== 1)) {
    throw new Error('Every athlete must occupy exactly one known bracket slot');
  }
}

export async function seedSeaGamesDemo(prisma: PrismaClient) {
  console.log('Seeding SEA Games simulation...');

  const countries = await prisma.country.findMany({
    where: { code: { in: DELEGATIONS.map((delegation) => delegation.code) } },
  });
  const countryIds = new Map(countries.map((country) => [country.code, country.id]));
  const missingCountries = DELEGATIONS.filter((delegation) => !countryIds.has(delegation.code));
  if (missingCountries.length) {
    throw new Error(`Missing SEA Games countries: ${missingCountries.map((country) => country.code).join(', ')}`);
  }

  const federationIds = new Map<string, string>();
  for (const delegation of DELEGATIONS) {
    const federation = await prisma.federation.upsert({
      where: { id: `sea26-fed-${delegation.code.toLowerCase()}` },
      update: {
        name: delegation.federationName,
        countryId: countryIds.get(delegation.code)!,
      },
      create: {
        id: `sea26-fed-${delegation.code.toLowerCase()}`,
        name: delegation.federationName,
        countryId: countryIds.get(delegation.code)!,
      },
    });
    federationIds.set(delegation.code, federation.id);
  }

  const sportIds = new Map<string, string>();
  for (const sport of SPORTS) {
    const saved = await prisma.sport.upsert({
      where: { code: sport.code },
      update: {
        name: sport.name,
        description: `Bộ môn ${sport.name} trong bộ dữ liệu SEA Games mô phỏng`,
      },
      create: {
        code: sport.code,
        name: sport.name,
        description: `Bộ môn ${sport.name} trong bộ dữ liệu SEA Games mô phỏng`,
      },
    });
    sportIds.set(sport.code, saved.id);
  }

  const categories = buildCategories(sportIds);
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        sportId: category.sportId,
        gender: category.gender,
        matchDurationSeconds: category.matchDurationSeconds,
        minAge: 18,
        maxAge: 35,
        minWeight: category.minWeight,
        maxWeight: category.maxWeight,
      },
      create: {
        id: category.id,
        name: category.name,
        sportId: category.sportId,
        gender: category.gender,
        matchDurationSeconds: category.matchDurationSeconds,
        minAge: 18,
        maxAge: 35,
        minWeight: category.minWeight,
        maxWeight: category.maxWeight,
      },
    });
  }

  const primarySportId = sportIds.get(SPORTS[0].code)!;
  const event = await prisma.event.upsert({
    where: { id: SEA_GAMES_EVENT_ID },
    update: {
      name: 'SEA Games 2026 - Dữ liệu mô phỏng',
      sportId: primarySportId,
      description: 'Bộ dữ liệu kiểm thử quy mô lớn: 11 quốc gia Đông Nam Á, 5.000 VĐV và lịch thi đấu tự động không trùng sàn.',
      startDate: localDateTime(0, 0),
      endDate: localDateTime(SEA_GAMES_DURATION_DAYS - 1, 23 * 60 + 59),
      location: 'Hà Nội, Việt Nam (mô phỏng)',
      isPublished: true,
      sports: { set: SPORTS.map((sport) => ({ id: sportIds.get(sport.code)! })) },
      categories: { set: categories.map((category) => ({ id: category.id })) },
    },
    create: {
      id: SEA_GAMES_EVENT_ID,
      name: 'SEA Games 2026 - Dữ liệu mô phỏng',
      sportId: primarySportId,
      description: 'Bộ dữ liệu kiểm thử quy mô lớn: 11 quốc gia Đông Nam Á, 5.000 VĐV và lịch thi đấu tự động không trùng sàn.',
      startDate: localDateTime(0, 0),
      endDate: localDateTime(SEA_GAMES_DURATION_DAYS - 1, 23 * 60 + 59),
      location: 'Hà Nội, Việt Nam (mô phỏng)',
      isPublished: true,
      sports: { connect: SPORTS.map((sport) => ({ id: sportIds.get(sport.code)! })) },
      categories: { connect: categories.map((category) => ({ id: category.id })) },
    },
  });

  const athletes = buildAthletes(categories, countryIds, federationIds);
  for (let offset = 0; offset < athletes.length; offset += 1_000) {
    const chunk = athletes.slice(offset, offset + 1_000).map(({ categoryId, sportId, ...athlete }) => athlete);
    await prisma.athlete.createMany({ data: chunk, skipDuplicates: true });
  }

  const athleteIdsByCategory = new Map<string, string[]>();
  for (const athlete of athletes) {
    const ids = athleteIdsByCategory.get(athlete.categoryId) || [];
    ids.push(athlete.id as string);
    athleteIdsByCategory.set(athlete.categoryId, ids);
  }

  for (const category of categories) {
    await prisma.category.update({
      where: { id: category.id },
      data: {
        athletes: {
          set: (athleteIdsByCategory.get(category.id) || []).map((id) => ({ id })),
        },
      },
    });
  }

  await prisma.event.update({
    where: { id: event.id },
    data: {
      athletes: { set: athletes.map((athlete) => ({ id: athlete.id as string })) },
    },
  });

  const entrySeeds: Prisma.CompetitionEntryCreateManyInput[] = athletes.map((athlete) => ({
    eventId: event.id,
    categoryId: athlete.categoryId,
    countryId: athlete.countryId,
    type: EntryType.INDIVIDUAL,
    status: EntryStatus.VERIFIED,
    athleteId: athlete.id as string,
  }));
  for (let offset = 0; offset < entrySeeds.length; offset += 1_000) {
    await prisma.competitionEntry.createMany({
      data: entrySeeds.slice(offset, offset + 1_000),
      skipDuplicates: true,
    });
  }

  const statistics: Prisma.StatisticCreateManyInput[] = athletes.map((athlete) => ({
    athleteId: athlete.id as string,
    eventId: event.id,
    sportId: athlete.sportId,
    categoryId: athlete.categoryId,
  }));

  const fopSeeds = SPORTS.flatMap((sport) => Array.from({ length: sport.fopCount }, (_, index) => ({
    id: `sea26-fop-${sport.code.toLowerCase()}-${index + 1}`,
    eventId: event.id,
    name: `${sport.venue} - ${sport.surface} ${index + 1}`,
  })));
  const fops = fopSeeds;
  const fopsBySport = new Map<string, Array<{ id: string; name: string }>>();
  for (const sport of SPORTS) {
    fopsBySport.set(
      sport.code,
      fops
        .filter((fop) => fop.id.startsWith(`sea26-fop-${sport.code.toLowerCase()}-`))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  const drawSeeds: Prisma.DrawCreateManyInput[] = [];
  const allMatches: PendingMatch[] = [];
  const categoryStartDays = new Map<string, number>();
  const globalMatchNumber = { value: 1 };

  for (const category of categories) {
    const drawId = `sea26-draw-${slug(category.id)}`;
    const participants = athletes.filter((athlete) => athlete.categoryId === category.id);
    const sportFops = fopsBySport.get(category.sportCode)!;
    const fop = sportFops[category.categoryIndexInSport % sportFops.length];
    const genderOffset = category.gender === Gender.FEMALE ? 5 : 0;
    const startWave = (
      category.sportIndex * 3
      + category.categoryIndexInSport * 2
      + Math.floor(category.categoryIndexInSport / sportFops.length) * 3
      + genderOffset
    ) % 10;
    categoryStartDays.set(category.id, startWave);
    const bracket = buildBracket(category, participants, drawId, fop, globalMatchNumber);

    drawSeeds.push({
      id: drawId,
      name: `${category.name} - Nhánh chính`,
      type: DrawType.MAIN_TREE,
      eventId: event.id,
      categoryId: category.id,
      bracketSize: bracket.bracketSize,
      sortOrder: category.sportIndex * 100 + category.categoryIndexInSport,
    });
    allMatches.push(...bracket.matches);
  }

  scheduleMatches(allMatches, categoryStartDays);
  validateSeed(categories, athletes, allMatches);

  // Only replace the seed-owned schedule after the complete in-memory plan
  // passes all eligibility, progression and resource-conflict checks.
  await prisma.statistic.deleteMany({ where: { eventId: event.id } });
  await prisma.match.deleteMany({ where: { eventId: event.id } });
  await prisma.draw.deleteMany({ where: { eventId: event.id } });
  await prisma.fop.deleteMany({ where: { eventId: event.id } });
  for (let offset = 0; offset < statistics.length; offset += 1_000) {
    await prisma.statistic.createMany({ data: statistics.slice(offset, offset + 1_000) });
  }
  await prisma.fop.createMany({ data: fopSeeds });
  await prisma.draw.createMany({ data: drawSeeds });
  for (const category of categories) {
    await prisma.draw.update({
      where: {
        eventId_categoryId_name: {
          eventId: event.id,
          categoryId: category.id,
          name: `${category.name} - Nhánh chính`,
        },
      },
      data: {
        fops: {
          set: fopsBySport.get(category.sportCode)!.map((fop) => ({ id: fop.id })),
        },
      },
    });
  }

  const databaseMatches = allMatches
    .slice()
    .sort((left, right) => (right.round || 0) - (left.round || 0))
    .map(({ seedRound, seedPosition, slotMinutes, ...match }) => match);
  for (let offset = 0; offset < databaseMatches.length; offset += 500) {
    await prisma.match.createMany({ data: databaseMatches.slice(offset, offset + 500) });
  }

  const countrySummary = DELEGATIONS.map((delegation) => {
    const count = athletes.filter((athlete) => athlete.countryId === countryIds.get(delegation.code)).length;
    return `${delegation.code}:${count}`;
  }).join(', ');

  console.log(
    `SEA Games simulation ready: ${SPORTS.length} sports, ${categories.length} categories, `
      + `${athletes.length} athletes, ${fops.length} FOPs, ${allMatches.length} scheduled matches.`,
  );
  console.log(`Delegations: ${countrySummary}`);
}
