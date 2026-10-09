import {
  BeltLevel,
  BracketSide,
  DrawType,
  Gender,
  JiuJitsuDiscipline,
  MatchStatus,
  MatchType,
  Prisma,
  PrismaClient,
  UniformType,
  WinMethod,
} from '@prisma/client';
import worldCountries from 'world-countries';
import { seedSeaGamesDemo } from './sea-games.seed';
import { seedOperationalDemoAccounts } from './demo-accounts.seed';
import { seedAdmin } from './admin.seed';

const prisma = new PrismaClient();

const DEMO_EVENT_ID = 'ev-jjau-001';
const DEMO_DAY_COUNTS = [298, 603, 477] as const;

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function vietnamTime(day: number, minutesFromMidnight: number) {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  return new Date(Date.UTC(2026, 7, day, hour - 7, minute, 0));
}

async function main() {
  console.log('Seeding SportData database...');

  await seedAdmin(prisma);

  if (process.env.SEED_DEMO_ACCOUNTS === 'true') {
    const demoAccounts = await seedOperationalDemoAccounts(prisma);
    console.log(`Operational demo accounts synchronized: ${demoAccounts.length}`);
  }

  const articleSeeds: Prisma.ArticleCreateInput[] = [
    {
      title: 'Dấu ấn 5th JJAU Regional Championship Southeast Asia',
      slug: 'dau-an-5th-jjau-regional-championship-southeast-asia',
      excerpt: 'Những màn tranh tài giàu cảm xúc và các cột mốc đáng nhớ tại giải Ju-Jitsu khu vực Đông Nam Á.',
      coverImageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1400&q=85',
      content: `## Một giải đấu giàu cảm xúc

Ba ngày thi đấu đã mang đến những cuộc so tài quyết liệt ở nhiều nhóm tuổi và hạng cân. Các vận động viên thể hiện kỹ thuật, bản lĩnh và tinh thần tôn trọng đối thủ trên từng thảm đấu.

## Những con số nổi bật

- Hơn 1.300 trận đấu được cập nhật trên hệ thống
- Nhiều nội dung từ Duo, Show đến Fighting và Newaza
- Các đoàn thể thao trong khu vực cùng góp mặt

SportData tiếp tục tổng hợp lịch đấu, kết quả và thành tích để người hâm mộ có thể theo dõi thuận tiện hơn.`,
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date('2026-09-10T02:00:00.000Z'),
    },
    {
      title: 'LE/TRONG NGHIA và hành trình chinh phục ngôi đầu',
      slug: 'le-trong-nghia-va-hanh-trinh-chinh-phuc-ngoi-dau',
      excerpt: 'Sự ổn định, kỷ luật và khả năng làm chủ áp lực đã tạo nên một hành trình thi đấu ấn tượng.',
      coverImageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1400&q=85',
      content: `## Chuẩn bị từ những điều nhỏ nhất

Thành tích trên sàn đấu là kết quả của một quá trình dài. Từ giáo án thể lực, kỹ thuật đến chế độ nghỉ ngơi, mọi chi tiết đều được đội ngũ huấn luyện theo dõi sát sao.

> Mỗi trận đấu là một cơ hội để hiểu rõ hơn điểm mạnh và điều cần cải thiện.

## Giữ nhịp thi đấu

Khả năng duy trì sự tập trung qua từng vòng đấu giúp vận động viên chủ động hơn trước những đối thủ có phong cách khác nhau. Đây cũng là nền tảng quan trọng cho các mục tiêu tiếp theo trong mùa giải.`,
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date('2026-09-09T03:30:00.000Z'),
    },
    {
      title: '5 nguyên tắc phục hồi dành cho vận động viên sau giải đấu',
      slug: '5-nguyen-tac-phuc-hoi-danh-cho-van-dong-vien-sau-giai-dau',
      excerpt: 'Phục hồi đúng cách giúp cơ thể tái tạo năng lượng và sẵn sàng cho chu kỳ tập luyện tiếp theo.',
      coverImageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=85',
      content: `## Phục hồi là một phần của tập luyện

Sau một giải đấu cường độ cao, cơ thể cần được chăm sóc có kế hoạch. Vận động viên không nên quay lại khối lượng tập nặng quá sớm.

1. Ngủ đủ và duy trì giờ nghỉ ổn định
2. Bổ sung nước cùng dinh dưỡng cân bằng
3. Vận động nhẹ để tăng tuần hoàn
4. Theo dõi các dấu hiệu đau kéo dài
5. Trao đổi thường xuyên với huấn luyện viên

Một kế hoạch phục hồi phù hợp cần dựa trên thể trạng và lịch thi đấu riêng của từng người.`,
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date('2026-09-08T01:15:00.000Z'),
    },
    {
      title: 'SportData nâng cấp trải nghiệm theo dõi lịch thi đấu trực tiếp',
      slug: 'sportdata-nang-cap-trai-nghiem-theo-doi-lich-thi-dau-truc-tiep',
      excerpt: 'Lịch đấu, trạng thái trận và kết quả được tập trung trong một giao diện rõ ràng trên cả máy tính lẫn điện thoại.',
      coverImageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=85',
      content: `## Theo dõi giải đấu dễ dàng hơn

Giao diện lịch thi đấu mới ưu tiên những thông tin quan trọng: thời gian, thảm đấu, vận động viên, tỷ số và trạng thái trực tiếp.

## Hoạt động tốt trên mọi thiết bị

- Tìm nhanh theo tên vận động viên
- Lọc theo ngày và nội dung thi đấu
- Nút Live đưa người xem đến ngay các trận đang diễn ra
- Chế độ sáng và tối phù hợp với nhiều môi trường sử dụng

Các dữ liệu được đồng bộ từ CMS để ban tổ chức có thể cập nhật trong cùng một quy trình.`,
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date('2026-09-07T04:00:00.000Z'),
    },
    {
      title: 'Bên trong công tác vận hành một giải đấu võ thuật',
      slug: 'ben-trong-cong-tac-van-hanh-mot-giai-dau-vo-thuat',
      excerpt: 'Từ xếp lịch đến cập nhật kết quả, mỗi bộ phận đều cần phối hợp chính xác để giải đấu diễn ra liền mạch.',
      coverImageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1400&q=85',
      content: `## Chuẩn bị trước ngày thi đấu

Danh sách vận động viên, hạng cân và sơ đồ thi đấu cần được kiểm tra qua nhiều bước. Một thay đổi nhỏ cũng có thể ảnh hưởng đến lịch của cả đoàn.

## Phối hợp trong thời gian thực

Ban trọng tài, bàn điều hành và đội ngũ nhập liệu liên tục đối chiếu thông tin. Khi kết quả được xác nhận, dữ liệu mới được công bố đến người xem.

Quy trình rõ ràng giúp giảm sai sót và đảm bảo mọi vận động viên được ghi nhận thành tích chính xác.`,
      isPublished: true,
      isFeatured: false,
      publishedAt: new Date('2026-09-06T02:45:00.000Z'),
    },
    {
      title: 'Tập luyện cân bằng: nền tảng cho phong độ bền vững',
      slug: 'tap-luyen-can-bang-nen-tang-cho-phong-do-ben-vung',
      excerpt: 'Kỹ thuật, thể lực và tinh thần cần được phát triển đồng đều để tạo nên phong độ ổn định.',
      coverImageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1400&q=85',
      content: `## Không chỉ là tập nặng

Một giáo án hiệu quả cần có sự cân bằng giữa buổi tập cường độ cao, kỹ thuật chuyên môn và thời gian hồi phục. Khối lượng tập nên được điều chỉnh theo từng giai đoạn của mùa giải.

## Theo dõi tiến bộ

Việc ghi lại thành tích tập luyện và thi đấu giúp vận động viên nhìn thấy xu hướng dài hạn thay vì chỉ tập trung vào một kết quả đơn lẻ.

Sự bền bỉ được hình thành từ những thói quen nhỏ, được duy trì đều đặn mỗi ngày.`,
      isPublished: true,
      isFeatured: false,
      publishedAt: new Date('2026-09-05T02:20:00.000Z'),
    },
    {
      title: 'Hậu trường đội tuyển trước giờ khai mạc',
      slug: 'hau-truong-doi-tuyen-truoc-gio-khai-mac',
      excerpt: 'Những bước chuẩn bị cuối cùng của các vận động viên và ban huấn luyện trước khi bước vào giải đấu.',
      coverImageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=1400&q=85',
      content: `## Không khí trước giờ thi đấu

Các vận động viên hoàn tất khởi động, kiểm tra trang phục và thống nhất chiến thuật cùng ban huấn luyện.

Nội dung hậu trường đầy đủ sẽ được cập nhật sau khi đội ngũ biên tập hoàn thiện hình ảnh và thông tin.`,
      isPublished: false,
      isFeatured: false,
      publishedAt: null,
    },
    {
      title: 'Các gương mặt trẻ đáng chú ý trong mùa giải mới',
      slug: 'cac-guong-mat-tre-dang-chu-y-trong-mua-giai-moi',
      excerpt: 'Lứa vận động viên trẻ đang tạo ra nguồn năng lượng mới bằng tinh thần thi đấu tự tin và tiến bộ rõ rệt.',
      coverImageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1400&q=85',
      content: `## Thế hệ tiếp nối

Nhiều vận động viên trẻ đã cho thấy khả năng thích nghi nhanh với áp lực thi đấu. Đây là tín hiệu tích cực cho sự phát triển lâu dài của phong trào.

Danh sách nhân vật và thành tích nổi bật đang được ban biên tập tổng hợp.`,
      isPublished: false,
      isFeatured: false,
      publishedAt: null,
    },
  ];

  const articles = await Promise.all(articleSeeds.map((article) => prisma.article.upsert({
    where: { slug: article.slug },
    // Nội dung do biên tập viên quản lý trong CMS không được ghi đè mỗi lần container khởi động.
    update: {},
    create: article,
  })));
  console.log(`Demo articles synchronized: ${articles.length}`);

  // Use the IOC code when available because this is a sports platform, then
  // fall back to ISO alpha-3 for territories that do not have an IOC code.
  // The complete ISO list also gives every country a stable flag image.
  const countrySeeds = worldCountries
    .map((country) => ({
      code: country.cioc || country.cca3,
      name: country.name.common,
      flag: country.cca2.toLowerCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Serverless PostgreSQL providers intentionally expose a small connection
  // pool. Seeding the complete country list in one Promise.all can exhaust it
  // before queued upserts get a connection, so keep this import sequential.
  const countries = [];
  for (const { code, name, flag } of countrySeeds) {
    countries.push(await prisma.country.upsert({
      where: { code },
      update: { name, flagUrl: `https://flagcdn.com/w40/${flag}.png` },
      create: { code, name, flagUrl: `https://flagcdn.com/w40/${flag}.png` },
    }));
  }
  console.log(`Countries synchronized: ${countries.length}`);
  const countryByCode = new Map(countries.map((country) => [country.code, country]));

  const federationSeed = [
    ['fed-vie', 'Vietnam Jujitsu Federation', 'VIE'],
    ['fed-cam', 'Ju-Jitsu Federation of Cambodia', 'CAM'],
    ['fed-ina', 'Indonesia Ju Jitsu Federation', 'INA'],
    ['fed-phi', 'Jiu-Jitsu Federation of the Philippines Inc.', 'PHI'],
    ['fed-mas', 'Malaysia Ju-Jitsu Federation', 'MAS'],
    ['fed-sgp', 'Ju-Jitsu Association Singapore', 'SGP'],
    ['fed-tha', 'Ju-Jitsu Association of Thailand', 'THA'],
    ['fed-lao', 'Lao Ju-Jitsu Federation', 'LAO'],
  ] as const;
  const federations = await Promise.all(federationSeed.map(([id, name, countryCode]) => {
    const country = countryByCode.get(countryCode)!;
    return prisma.federation.upsert({
      where: { id },
      update: { name, countryId: country.id },
      create: { id, name, countryId: country.id },
    });
  }));
  const federationByCountry = new Map(federationSeed.map(([, , code], index) => [code, federations[index]]));

  const sportJJ = await prisma.sport.upsert({
    where: { code: 'JJ' },
    update: {
      name: 'Ju-Jitsu',
      description: 'Ju-Jitsu International Federation (JJIF)',
    },
    create: {
      code: 'JJ',
      name: 'Ju-Jitsu',
      description: 'Ju-Jitsu International Federation (JJIF)',
    },
  });
  await Promise.all([
    ['KAR', 'Karate'],
    ['TKD', 'Taekwondo'],
    ['JUD', 'Judo'],
    ['BOX', 'Boxing'],
    ['WUS', 'Wushu'],
  ].map(([code, name]) => prisma.sport.upsert({
    where: { code },
    update: { name },
    create: { code, name },
  })));

  const event = await prisma.event.upsert({
    where: { id: DEMO_EVENT_ID },
    update: {
      name: '5TH JJAU REGIONAL CHAMPIONSHIP SOUTHEAST ASIA',
      sportId: sportJJ.id,
      description: 'Dữ liệu demo lịch thi đấu Ju-Jitsu Đông Nam Á trong 3 ngày.',
      startDate: new Date('2026-08-21T00:00:00.000Z'),
      endDate: new Date('2026-08-23T23:59:59.999Z'),
      location: 'Hà Nội, Việt Nam',
      bannerUrl: null,
      logoUrl: null,
      isPublished: true,
      sports: { set: [{ id: sportJJ.id }] },
    },
    create: {
      id: DEMO_EVENT_ID,
      name: '5TH JJAU REGIONAL CHAMPIONSHIP SOUTHEAST ASIA',
      sportId: sportJJ.id,
      description: 'Dữ liệu demo lịch thi đấu Ju-Jitsu Đông Nam Á trong 3 ngày.',
      startDate: new Date('2026-08-21T00:00:00.000Z'),
      endDate: new Date('2026-08-23T23:59:59.999Z'),
      location: 'Hà Nội, Việt Nam',
      isPublished: true,
      sports: { connect: [{ id: sportJJ.id }] },
    },
  });

  const eventsWithoutSports = await prisma.event.findMany({
    where: { sports: { none: {} } },
    select: { id: true, sportId: true },
  });
  await Promise.all(eventsWithoutSports.map((existingEvent) => prisma.event.update({
    where: { id: existingEvent.id },
    data: { sports: { connect: [{ id: existingEvent.sportId }] } },
  })));

  const categoriesSeed: Array<{
    name: string;
    gender: Gender;
    discipline?: JiuJitsuDiscipline;
    uniform?: UniformType;
    beltLevel?: BeltLevel;
    matchDurationSeconds?: number;
    minAge?: number;
    maxAge?: number;
    minWeight?: number;
    maxWeight?: number;
  }> = [
    { name: 'U21 JU-JITSU DUO MEN', gender: Gender.MALE, minAge: 18, maxAge: 21 },
    { name: 'U21 JU-JITSU FEMALE -48 KG', gender: Gender.FEMALE, minAge: 18, maxAge: 21, maxWeight: 48 },
    { name: 'U21 JU-JITSU MALE -56 KG', gender: Gender.MALE, minAge: 18, maxAge: 21, maxWeight: 56 },
    { name: 'U10 JU-JITSU MALE -28 KG', gender: Gender.MALE, minAge: 8, maxAge: 10, maxWeight: 28 },
    { name: 'U12 JU-JITSU MALE -40 KG', gender: Gender.MALE, minAge: 10, maxAge: 12, maxWeight: 40 },
    { name: 'U12 JU-JITSU FEMALE -25 KG', gender: Gender.FEMALE, minAge: 10, maxAge: 12, maxWeight: 25 },
    { name: 'U18 JU-JITSU DUO MEN', gender: Gender.MALE, minAge: 15, maxAge: 18 },
    { name: 'U18 JU-JITSU DUO WOMEN', gender: Gender.FEMALE, minAge: 15, maxAge: 18 },
    { name: 'U21 JU-JITSU SHOW MEN', gender: Gender.MALE, minAge: 18, maxAge: 21 },
    { name: 'U21 JU-JITSU SHOW WOMEN', gender: Gender.FEMALE, minAge: 18, maxAge: 21 },
    { name: 'ADULTS JU-JITSU SHOW MIXED', gender: Gender.MIXED, minAge: 18 },
    { name: 'U16 JU-JITSU NO-GI FEMALE -36 KG', gender: Gender.FEMALE, minAge: 13, maxAge: 16, maxWeight: 36 },
    { name: 'U18 JU-JITSU NO-GI MALE -48 KG', gender: Gender.MALE, minAge: 15, maxAge: 18, maxWeight: 48 },
    { name: 'U21 JU-JITSU NO-GI FEMALE -48 KG', gender: Gender.FEMALE, minAge: 18, maxAge: 21, maxWeight: 48 },
    { name: 'U18 JU-JITSU DUO MIXED', gender: Gender.MIXED, minAge: 15, maxAge: 18 },
    { name: 'ADULTS JU-JITSU NO-GI MALE -56 KG', gender: Gender.MALE, minAge: 18, maxWeight: 56 },
    { name: 'ADULTS NEWAZA GI MALE -69 KG WHITE BELT', gender: Gender.MALE, minAge: 18, maxWeight: 69, discipline: JiuJitsuDiscipline.NEWAZA, uniform: UniformType.GI, beltLevel: BeltLevel.WHITE, matchDurationSeconds: 300 },
    { name: 'ADULTS NEWAZA GI MALE -69 KG BLUE BELT', gender: Gender.MALE, minAge: 18, maxWeight: 69, discipline: JiuJitsuDiscipline.NEWAZA, uniform: UniformType.GI, beltLevel: BeltLevel.BLUE, matchDurationSeconds: 360 },
    { name: 'ADULTS NEWAZA NO-GI FEMALE -57 KG PURPLE BELT', gender: Gender.FEMALE, minAge: 18, maxWeight: 57, discipline: JiuJitsuDiscipline.NEWAZA, uniform: UniformType.NO_GI, beltLevel: BeltLevel.PURPLE, matchDurationSeconds: 420 },
    { name: 'ADULTS FIGHTING MALE -85 KG BLACK BELT', gender: Gender.MALE, minAge: 18, maxWeight: 85, discipline: JiuJitsuDiscipline.FIGHTING, uniform: UniformType.GI, beltLevel: BeltLevel.BLACK, matchDurationSeconds: 600 },
    { name: 'ADULTS FULL CONTACT MALE -77 KG OPEN', gender: Gender.MALE, minAge: 18, maxWeight: 77, discipline: JiuJitsuDiscipline.FULL_CONTACT, uniform: UniformType.GI, beltLevel: BeltLevel.OPEN, matchDurationSeconds: 300 },
  ];

  const categories = [];
  const mainDivisionByCategory = new Map<string, string>();
  for (const category of categoriesSeed) {
    const id = `cat-${slug(category.name)}`;
    const discipline = category.discipline
      || (category.name.includes('DUO')
        ? JiuJitsuDiscipline.DUO
        : category.name.includes('SHOW')
          ? JiuJitsuDiscipline.SHOW
          : category.name.includes('FIGHTING')
            ? JiuJitsuDiscipline.FIGHTING
            : JiuJitsuDiscipline.NEWAZA);
    const uniform = category.uniform
      || (category.name.includes('NO-GI') ? UniformType.NO_GI : UniformType.GI);
    const beltLevel = category.beltLevel || BeltLevel.OPEN;
    const matchDurationSeconds = category.matchDurationSeconds
      || (category.maxAge && category.maxAge <= 12 ? 180 : category.maxAge && category.maxAge <= 16 ? 240 : 300);
    const categoryData = { ...category, discipline, uniform, beltLevel, matchDurationSeconds };
    const saved = await prisma.category.upsert({
      where: { id },
      update: { sportId: sportJJ.id, ...categoryData },
      create: { id, sportId: sportJJ.id, ...categoryData },
    });
    categories.push(saved);

    for (const divisionName of ['POOL 1', 'MAIN TREE POOL 1', 'WORLD R2-G1']) {
      const divisionId = `div-${slug(category.name)}-${slug(divisionName)}`;
      const division = await prisma.division.upsert({
        where: { id: divisionId },
        update: { name: `${category.name} ${divisionName}`, categoryId: saved.id },
        create: { id: divisionId, name: `${category.name} ${divisionName}`, categoryId: saved.id },
      });
      if (divisionName === 'MAIN TREE POOL 1') {
        mainDivisionByCategory.set(saved.id, division.id);
      }
    }
  }

  // Remove unused categories created by the previous seed ID format, which
  // kept the minus sign in weight labels and produced IDs containing "--".
  const canonicalCategoryIds = new Set(categories.map((category) => category.id));
  const canonicalCategoryByName = new Map(categories.map((category) => [category.name, category]));
  const legacyCategoryIds = categoriesSeed
    .map((category) => `cat-${category.name
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')}`)
    .filter((id) => !canonicalCategoryIds.has(id));
  const legacyCategories = await prisma.category.findMany({
    where: { id: { in: legacyCategoryIds } },
    select: {
      id: true,
      name: true,
      _count: {
        select: { athletes: true, events: true, matches: true, draws: true },
      },
      divisions: {
        select: {
          _count: { select: { matches: true, draws: true } },
        },
      },
    },
  });

  for (const legacyCategory of legacyCategories) {
    const canonicalCategory = canonicalCategoryByName.get(legacyCategory.name);
    if (!canonicalCategory) continue;

    await prisma.statistic.updateMany({
      where: { categoryId: legacyCategory.id },
      data: { categoryId: canonicalCategory.id },
    });
    const isReferenced = Object.values(legacyCategory._count).some((count) => count > 0)
      || legacyCategory.divisions.some((division) =>
        division._count.matches > 0 || division._count.draws > 0);

    if (isReferenced) {
      console.warn(`Skipped referenced legacy category: ${legacyCategory.name} (${legacyCategory.id})`);
      continue;
    }

    await prisma.$transaction([
      prisma.division.deleteMany({ where: { categoryId: legacyCategory.id } }),
      prisma.category.delete({ where: { id: legacyCategory.id } }),
    ]);
    console.log(`Removed unused legacy category: ${legacyCategory.name} (${legacyCategory.id})`);
  }
  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  const athleteSeed = [
    ['LE', 'TRONG NGHIA', 'LE/TRONG NGHIA', Gender.MALE, 'VIE'],
    ['CHEV', 'Sreyneang', 'CHEV Sreyneang', Gender.FEMALE, 'CAM'],
    ['THU HA', 'Pham', 'THU HA Pham', Gender.FEMALE, 'VIE'],
    ['THENG', 'Khemrakboth', 'THENG Khemrakboth', Gender.MALE, 'CAM'],
    ['WICAKSONO', 'Moh Arief', 'WICAKSONO Moh Arief', Gender.MALE, 'INA'],
    ['KHENG', 'RIN', 'KHENG/RIN', Gender.MALE, 'CAM'],
    ['TIAN KAI', 'Fong', 'TIAN KAI Fong', Gender.MALE, 'SGP'],
    ['NORODOM', 'Pongchakrey', 'NORODOM Pongchakrey', Gender.MALE, 'CAM'],
    ['LIM JUN LONG', 'Kayen', 'LIM JUN LONG Kayen', Gender.MALE, 'SGP'],
    ['BALANZAT', 'Mateo Alonzo', 'BALANZAT Mateo Alonzo', Gender.MALE, 'PHI'],
    ['NGOC BAO', 'TUAN KIET', 'NGOC BAO/TUAN KIET', Gender.MALE, 'VIE'],
    ['CAI HONG', 'NHAT THIEN', 'CAI HONG/NHAT THIEN', Gender.MALE, 'VIE'],
    ['WONG FANG YI', 'Augustus', 'WONG FANG YI Augustus', Gender.MALE, 'SGP'],
    ['LEE HAO ZHE', 'Lucian', 'LEE HAO ZHE Lucian', Gender.MALE, 'SGP'],
    ['OAKLEY', 'REYES', 'OAKLEY/REYES', Gender.FEMALE, 'PHI'],
    ['BUI', 'DAO', 'BUI/DAO', Gender.FEMALE, 'VIE'],
    ['HENG', 'TIN', 'HENG/TIN', Gender.FEMALE, 'CAM'],
    ['NONG', 'Anh Tho', 'NONG Anh Tho', Gender.FEMALE, 'VIE'],
    ['SOVANN', 'Relinena', 'SOVANN Relinena', Gender.FEMALE, 'CAM'],
    ['BINTE MUHAMMAD SAID', 'SULAIMAN/BINTESAZALI', 'BINTE MUHAMMAD SAID SULAIMAN/BINTESAZALI', Gender.FEMALE, 'SGP'],
    ['HAI', 'TIN', 'HAI/TIN', Gender.MIXED, 'CAM'],
    ['CABREROS', 'Megan Louise', 'CABREROS Megan Louise', Gender.FEMALE, 'PHI'],
    ['DUONG GIA HAN', 'Cao', 'DUONG GIA HAN Cao', Gender.FEMALE, 'VIE'],
    ['JUATAN', 'Sean Khale', 'JUATAN Sean Khale', Gender.MALE, 'PHI'],
    ['LIM', 'Vireak', 'LIM Vireak', Gender.MALE, 'CAM'],
    ['THU THUY', 'Trieu', 'THU THUY Trieu', Gender.FEMALE, 'VIE'],
    ['MO Thi', 'Bao Han', 'MO Thi Bao Han', Gender.FEMALE, 'VIE'],
    ['NHIM', 'Aliza', 'NHIM Aliza', Gender.FEMALE, 'CAM'],
    ['LIEM', 'THI ANH THU', 'LIEM/THI ANH THU', Gender.MIXED, 'VIE'],
    ['NGUYEN', 'The Chuc Lam', 'NGUYEN The Chuc Lam', Gender.MALE, 'VIE'],
    ['CHUN', 'Vita', 'CHUN Vita', Gender.MALE, 'CAM'],
    ['TUONG VY', 'Pham', 'TUONG VY Pham', Gender.FEMALE, 'VIE'],
    ['HO HIEN', 'An', 'HO HIEN An', Gender.FEMALE, 'VIE'],
    ['NGUYEN DIEU', 'Linh', 'NGUYEN DIEU Linh', Gender.FEMALE, 'VIE'],
    ['DOMINGO', 'Oliver John', 'DOMINGO Oliver John', Gender.MALE, 'PHI'],
    ['KIM', 'Sovannareach', 'KIM Sovannareach', Gender.MALE, 'CAM'],
    ['DAO HONG', 'Son', 'DAO HONG Son', Gender.MALE, 'VIE'],
    ['HENDRA', 'Alfald', 'HENDRA Alfald', Gender.MALE, 'MAS'],
    ['HOANG LAM', 'DO', 'HOANG LAM DO', Gender.MALE, 'VIE'],
    ['CHIN', 'Sopheakdy', 'CHIN Sopheakdy', Gender.MALE, 'CAM'],
    ['DOAN ANH', 'TU', 'DOAN ANH TU', Gender.MALE, 'VIE'],
    ['TRAN TRIEU', 'VI', 'TRAN TRIEU VI', Gender.MALE, 'VIE'],
    ['CHEW ZHENG', 'HUI', 'CHEW ZHENG HUI', Gender.MALE, 'SGP'],
  ] as const;

  const athletes = [];
  for (let index = 0; index < athleteSeed.length; index += 1) {
    const [firstName, lastName, fullName, gender, countryCode] = athleteSeed[index];
    const country = countryByCode.get(countryCode)!;
    const federation = federationByCountry.get(countryCode)!;
    const id = `ath-${slug(fullName)}`;
    const saved = await prisma.athlete.upsert({
      where: { id },
      update: { firstName, lastName, fullName, gender, countryId: country.id, federationId: federation.id },
      create: {
        id,
        firstName,
        lastName,
        fullName,
        gender,
        birthDate: new Date(Date.UTC(1998 + (index % 12), index % 12, (index % 25) + 1)),
        weight: 25 + (index % 10) * 4,
        countryId: country.id,
        federationId: federation.id,
      },
    });
    athletes.push(saved);
  }
  const athleteByName = new Map(athletes.map((athlete) => [athlete.fullName, athlete]));

  await prisma.event.update({
    where: { id: event.id },
    data: {
      categories: { set: categories.map(({ id }) => ({ id })) },
      athletes: { set: athletes.map(({ id }) => ({ id })) },
    },
  });

  type ReferenceMatch = {
    day: number;
    category: string;
    number: number;
    fop: string;
    time: string;
    athlete1: string;
    athlete2?: string;
    score1: number;
    score2: number;
    status: MatchStatus;
    matchType: MatchType;
    winner?: string;
    winMethod?: WinMethod;
    advantages1?: number;
    advantages2?: number;
    penalties1?: number;
    penalties2?: number;
    elapsed?: string;
  };

  const referenceMatches: ReferenceMatch[] = [
    { day: 21, category: 'U21 JU-JITSU DUO MEN', number: 1, fop: 'FOP 1', time: '09:00', athlete1: 'LE/TRONG NGHIA', score1: 88, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.POOL, winner: 'LE/TRONG NGHIA' },
    { day: 21, category: 'U21 JU-JITSU FEMALE -48 KG', number: 19, fop: 'FOP 2', time: '09:00', athlete1: 'CHEV Sreyneang', athlete2: 'THU HA Pham', score1: 0, score2: 8, status: MatchStatus.FINISHED, matchType: MatchType.QUARTERFINAL, winner: 'THU HA Pham', winMethod: WinMethod.POINTS, advantages2: 3 },
    { day: 21, category: 'U21 JU-JITSU MALE -56 KG', number: 43, fop: 'FOP 3', time: '09:00', athlete1: 'THENG Khemrakboth', athlete2: 'WICAKSONO Moh Arief', score1: 0, score2: 50, status: MatchStatus.FINISHED, matchType: MatchType.ROUND_OF_16, winner: 'WICAKSONO Moh Arief', winMethod: WinMethod.SUBMISSION, advantages1: 1, penalties2: 1, elapsed: '0:18' },
    { day: 21, category: 'U21 JU-JITSU DUO MEN', number: 2, fop: 'FOP 1', time: '09:05', athlete1: 'KHENG/RIN', score1: 91, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.POOL, winner: 'KHENG/RIN' },
    { day: 22, category: 'U10 JU-JITSU MALE -28 KG', number: 488, fop: 'FOP 3', time: '09:00', athlete1: 'TIAN KAI Fong', athlete2: 'NORODOM Pongchakrey', score1: 50, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'TIAN KAI Fong', winMethod: WinMethod.SUBMISSION, advantages1: 1, elapsed: '0:41' },
    { day: 22, category: 'U12 JU-JITSU MALE -40 KG', number: 531, fop: 'FOP 4', time: '09:00', athlete1: 'LIM JUN LONG Kayen', athlete2: 'BALANZAT Mateo Alonzo', score1: 50, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'LIM JUN LONG Kayen', advantages1: 1, advantages2: 2, elapsed: '1:36' },
    { day: 22, category: 'U18 JU-JITSU DUO MEN', number: 867, fop: 'FOP 2', time: '09:00', athlete1: 'NGOC BAO/TUAN KIET', score1: 92, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U21 JU-JITSU SHOW MEN', number: 881, fop: 'FOP 1', time: '09:00', athlete1: 'LE/TRONG NGHIA', score1: 41.5, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U21 JU-JITSU SHOW MEN', number: 883, fop: 'FOP 1', time: '09:10', athlete1: 'CAI HONG/NHAT THIEN', score1: 43.5, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U12 JU-JITSU MALE -40 KG', number: 534, fop: 'FOP 4', time: '09:12', athlete1: 'LIM JUN LONG Kayen', athlete2: 'WONG FANG YI Augustus', score1: 0, score2: 11, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'WONG FANG YI Augustus', advantages1: 1, advantages2: 1, elapsed: '0:00' },
    { day: 22, category: 'U10 JU-JITSU MALE -28 KG', number: 491, fop: 'FOP 3', time: '09:14', athlete1: 'TIAN KAI Fong', athlete2: 'LEE HAO ZHE Lucian', score1: 0, score2: 50, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'LEE HAO ZHE Lucian', winMethod: WinMethod.SUBMISSION, advantages1: 1, advantages2: 1, elapsed: '0:45' },
    { day: 22, category: 'U18 JU-JITSU DUO WOMEN', number: 870, fop: 'FOP 2', time: '09:15', athlete1: 'OAKLEY/REYES', score1: 78, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U21 JU-JITSU SHOW WOMEN', number: 884, fop: 'FOP 1', time: '09:15', athlete1: 'BUI/DAO', score1: 34.5, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U21 JU-JITSU SHOW WOMEN', number: 885, fop: 'FOP 1', time: '09:20', athlete1: 'HENG/TIN', score1: 43, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'U12 JU-JITSU FEMALE -25 KG', number: 493, fop: 'FOP 3', time: '09:22', athlete1: 'NONG Anh Tho', athlete2: 'SOVANN Relinena', score1: 50, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'NONG Anh Tho', winMethod: WinMethod.SUBMISSION, elapsed: '2:48' },
    { day: 22, category: 'U12 JU-JITSU MALE -40 KG', number: 537, fop: 'FOP 4', time: '09:24', athlete1: 'BALANZAT Mateo Alonzo', athlete2: 'WONG FANG YI Augustus', score1: 0, score2: 50, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'WONG FANG YI Augustus', elapsed: '2:45' },
    { day: 22, category: 'U18 JU-JITSU DUO WOMEN', number: 872, fop: 'FOP 2', time: '09:25', athlete1: 'BINTE MUHAMMAD SAID SULAIMAN/BINTESAZALI', score1: 82, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 22, category: 'ADULTS JU-JITSU SHOW MIXED', number: 886, fop: 'FOP 1', time: '09:25', athlete1: 'HAI/TIN', score1: 42.5, score2: 0, status: MatchStatus.RUNNING, matchType: MatchType.POOL },
    { day: 23, category: 'U16 JU-JITSU NO-GI FEMALE -36 KG', number: 1200, fop: 'FOP 3', time: '09:00', athlete1: 'CABREROS Megan Louise', athlete2: 'DUONG GIA HAN Cao', score1: 2, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'CABREROS Megan Louise', winMethod: WinMethod.POINTS, advantages1: 1, advantages2: 1, elapsed: '0:00' },
    { day: 23, category: 'U18 JU-JITSU NO-GI MALE -48 KG', number: 1356, fop: 'FOP 1', time: '09:00', athlete1: 'JUATAN Sean Khale', athlete2: 'LIM Vireak', score1: 50, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'JUATAN Sean Khale', winMethod: WinMethod.SUBMISSION, advantages1: 2, penalties2: 1, elapsed: '1:25' },
    { day: 23, category: 'U21 JU-JITSU NO-GI FEMALE -48 KG', number: 1411, fop: 'FOP 4', time: '09:00', athlete1: 'THU THUY Trieu', athlete2: 'CHEV Sreyneang', score1: 3, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'THU THUY Trieu', winMethod: WinMethod.POINTS, advantages1: 1, elapsed: '0:00' },
    { day: 23, category: 'U16 JU-JITSU NO-GI FEMALE -36 KG', number: 1221, fop: 'FOP 3', time: '09:04', athlete1: 'MO Thi Bao Han', athlete2: 'NHIM Aliza', score1: 50, score2: 0, status: MatchStatus.FINISHED, matchType: MatchType.GROUP_STAGE, winner: 'MO Thi Bao Han', winMethod: WinMethod.SUBMISSION, elapsed: '1:41' },
  ];

  const matches: Prisma.MatchCreateManyInput[] = [];
  for (let dayIndex = 0; dayIndex < DEMO_DAY_COUNTS.length; dayIndex += 1) {
    const day = 21 + dayIndex;
    const dayReferences = referenceMatches.filter((match) => match.day === day);

    for (let index = 0; index < DEMO_DAY_COUNTS[dayIndex]; index += 1) {
      const reference = dayReferences[index];
      if (reference) {
        const [hour, minute] = reference.time.split(':').map(Number);
        const athlete1 = athleteByName.get(reference.athlete1)!;
        const athlete2 = reference.athlete2 ? athleteByName.get(reference.athlete2) : undefined;
        matches.push({
          id: `demo-jjau-d${dayIndex + 1}-${String(index + 1).padStart(4, '0')}`,
          eventId: event.id,
          categoryId: categoryByName.get(reference.category)!.id,
          matchNumber: reference.number,
          fop: reference.fop,
          matchDate: vietnamTime(day, hour * 60 + minute),
          startTime: vietnamTime(day, hour * 60 + minute),
          athlete1Id: athlete1.id,
          athlete2Id: athlete2?.id || null,
          athlete1Score: reference.score1,
          athlete2Score: reference.score2,
          athlete1Advantages: reference.advantages1 || 0,
          athlete2Advantages: reference.advantages2 || 0,
          athlete1Penalties: reference.penalties1 || 0,
          athlete2Penalties: reference.penalties2 || 0,
          status: reference.status,
          matchType: reference.matchType,
          winnerId: reference.winner ? athleteByName.get(reference.winner)!.id : null,
          winMethod: reference.winMethod || null,
          round: 1,
          pool: 'POOL 1',
          notes: reference.elapsed || null,
        });
        continue;
      }

      const fillerIndex = index - dayReferences.length;
      const category = categories[(fillerIndex + dayIndex * 5) % categories.length];
      const athlete1 = athletes[(fillerIndex * 2 + dayIndex) % athletes.length];
      const athlete2 = athletes[(fillerIndex * 2 + dayIndex + 7) % athletes.length];
      const minutes = 10 * 60 + Math.floor(fillerIndex / 4) * 2;
      const status = dayIndex === 1 && fillerIndex % 37 === 0
        ? MatchStatus.RUNNING
        : dayIndex === 2 && fillerIndex % 19 === 0
          ? MatchStatus.SCHEDULED
          : MatchStatus.FINISHED;
      const score1 = status === MatchStatus.SCHEDULED ? 0 : (fillerIndex * 7) % 13;
      const score2 = status === MatchStatus.SCHEDULED ? 0 : (fillerIndex * 11 + 2) % 13;
      const winner = status === MatchStatus.FINISHED ? (score1 >= score2 ? athlete1 : athlete2) : null;

      matches.push({
        id: `demo-jjau-d${dayIndex + 1}-${String(index + 1).padStart(4, '0')}`,
        eventId: event.id,
        categoryId: category.id,
        matchNumber: dayIndex * 500 + index + 1,
        fop: `FOP ${(fillerIndex % 4) + 1}`,
        matchDate: vietnamTime(day, minutes),
        startTime: vietnamTime(day, minutes),
        athlete1Id: athlete1.id,
        athlete2Id: athlete2.id,
        athlete1Score: score1,
        athlete2Score: score2,
        athlete1Advantages: fillerIndex % 9 === 0 ? 1 : 0,
        athlete2Advantages: fillerIndex % 13 === 0 ? 1 : 0,
        athlete1Penalties: 0,
        athlete2Penalties: fillerIndex % 31 === 0 ? 1 : 0,
        status,
        matchType: MatchType.GROUP_STAGE,
        winnerId: winner?.id || null,
        winMethod: status === MatchStatus.FINISHED
          ? (fillerIndex % 4 === 0 ? WinMethod.SUBMISSION : WinMethod.POINTS)
          : null,
        round: 1,
        pool: `POOL ${(fillerIndex % 8) + 1}`,
        notes: status === MatchStatus.FINISHED ? `${fillerIndex % 3}:${String((fillerIndex * 7) % 60).padStart(2, '0')}` : null,
      });
    }
  }

  // Sportdata-style draw graphs are stored independently from schedule grouping.
  // Pool matches stay outside the draw; only qualified matches belong to a tree.
  const drawSeeds: Prisma.DrawCreateManyInput[] = [];
  const progressionLinks: Array<{
    id: string;
    winnerToMatchId?: string;
    winnerToSide?: BracketSide;
    loserToMatchId?: string;
    loserToSide?: BracketSide;
  }> = [];

  for (const category of categories) {
    if ([JiuJitsuDiscipline.DUO, JiuJitsuDiscipline.SHOW].includes(category.discipline!)) {
      continue;
    }

    const bracketMatches = matches
      .filter((match) => (
        match.categoryId === category.id
        && match.status === MatchStatus.FINISHED
        && Boolean(match.athlete1Id)
        && Boolean(match.athlete2Id)
      ))
      .slice(-14);

    if (bracketMatches.length < 7) continue;

    const mainDrawId = `draw-${slug(category.name)}-main`;
    drawSeeds.push({
      id: mainDrawId,
      name: 'Main Tree Pool 1',
      type: DrawType.MAIN_TREE,
      eventId: event.id,
      categoryId: category.id,
      divisionId: mainDivisionByCategory.get(category.id),
      poolNumber: 1,
      bracketSize: 8,
      sortOrder: 10,
    });

    const mainMatches = bracketMatches.slice(0, 7);
    const quarterFinals = mainMatches.slice(0, 4);
    quarterFinals.forEach((match, index) => {
      match.drawId = mainDrawId;
      match.matchType = MatchType.QUARTERFINAL;
      match.round = 1;
      match.bracketPosition = index;
      match.pool = 'MAIN TREE POOL 1';
      match.divisionId = mainDivisionByCategory.get(category.id);
      if (Number(match.athlete1Score) === Number(match.athlete2Score)) {
        match.athlete1Score = Number(match.athlete1Score) + 2;
      }
      match.winnerId = Number(match.athlete1Score) > Number(match.athlete2Score)
        ? match.athlete1Id
        : match.athlete2Id;
      match.winMethod = index % 3 === 0 ? WinMethod.SUBMISSION : WinMethod.POINTS;
    });

    const semiFinals = mainMatches.slice(4, 6);
    semiFinals.forEach((match, index) => {
      match.drawId = mainDrawId;
      match.matchType = MatchType.SEMIFINAL;
      match.round = 2;
      match.bracketPosition = index;
      match.pool = 'MAIN TREE POOL 1';
      match.divisionId = mainDivisionByCategory.get(category.id);
      match.athlete1Id = quarterFinals[index * 2].winnerId;
      match.athlete2Id = quarterFinals[index * 2 + 1].winnerId;
      match.athlete1Score = 8 + index * 3;
      match.athlete2Score = 2;
      match.winnerId = match.athlete1Id;
      match.winMethod = WinMethod.POINTS;
    });

    const final = mainMatches[6];
    final.drawId = mainDrawId;
    final.matchType = MatchType.FINAL;
    final.round = 3;
    final.bracketPosition = 0;
    final.pool = 'MAIN TREE POOL 1';
    final.divisionId = mainDivisionByCategory.get(category.id);
    final.athlete1Id = semiFinals[0].winnerId;
    final.athlete2Id = semiFinals[1].winnerId;
    final.athlete1Score = 3;
    final.athlete2Score = 0;
    final.winnerId = final.athlete1Id;
    final.winMethod = WinMethod.POINTS;

    quarterFinals.forEach((match, index) => {
      progressionLinks.push({
        id: match.id!,
        winnerToMatchId: semiFinals[Math.floor(index / 2)].id!,
        winnerToSide: index % 2 === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2,
      });
    });
    semiFinals.forEach((match, index) => {
      progressionLinks.push({
        id: match.id!,
        winnerToMatchId: final.id!,
        winnerToSide: index === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2,
      });
    });

    if (bracketMatches.length < 14) continue;

    const loserDrawId = `draw-${slug(category.name)}-double-elimination`;
    drawSeeds.push({
      id: loserDrawId,
      name: 'Double-Elimination Tree',
      type: DrawType.DOUBLE_ELIMINATION,
      eventId: event.id,
      categoryId: category.id,
      divisionId: mainDivisionByCategory.get(category.id),
      bracketSize: 4,
      sortOrder: 20,
    });

    const loserOf = (match: Prisma.MatchCreateManyInput) => (
      match.winnerId === match.athlete1Id ? match.athlete2Id : match.athlete1Id
    );
    const loserMatches = bracketMatches.slice(7, 14);
    const loserRound1 = loserMatches.slice(0, 2);
    const loserRound2 = loserMatches.slice(2, 4);
    const loserRound3 = loserMatches[4];
    const loserRound4 = loserMatches[5];
    const grandFinal = loserMatches[6];
    const prepareLoserMatch = (
      match: Prisma.MatchCreateManyInput,
      round: number,
      position: number,
      athlete1Id: string | null | undefined,
      athlete2Id: string | null | undefined,
      matchType: MatchType = MatchType.ELIMINATION,
    ) => {
      match.drawId = loserDrawId;
      match.matchType = matchType;
      match.round = round;
      match.bracketPosition = position;
      match.pool = 'DOUBLE-ELIMINATION TREE';
      match.divisionId = mainDivisionByCategory.get(category.id);
      match.athlete1Id = athlete1Id;
      match.athlete2Id = athlete2Id;
      match.athlete1Score = 4 + round + position;
      match.athlete2Score = 2;
      match.winnerId = athlete1Id;
      match.winMethod = WinMethod.POINTS;
    };

    loserRound1.forEach((match, index) => {
      prepareLoserMatch(
        match,
        1,
        index,
        loserOf(quarterFinals[index * 2]),
        loserOf(quarterFinals[index * 2 + 1]),
      );
      progressionLinks.push({
        id: quarterFinals[index * 2].id!,
        loserToMatchId: match.id!,
        loserToSide: BracketSide.ATHLETE1,
      });
      progressionLinks.push({
        id: quarterFinals[index * 2 + 1].id!,
        loserToMatchId: match.id!,
        loserToSide: BracketSide.ATHLETE2,
      });
    });

    loserRound2.forEach((match, index) => {
      prepareLoserMatch(
        match,
        2,
        index,
        loserRound1[index].winnerId,
        loserOf(semiFinals[index]),
      );
      progressionLinks.push({
        id: loserRound1[index].id!,
        winnerToMatchId: match.id!,
        winnerToSide: BracketSide.ATHLETE1,
      });
      progressionLinks.push({
        id: semiFinals[index].id!,
        loserToMatchId: match.id!,
        loserToSide: BracketSide.ATHLETE2,
      });
    });

    prepareLoserMatch(loserRound3, 3, 0, loserRound2[0].winnerId, loserRound2[1].winnerId);
    loserRound2.forEach((match, index) => progressionLinks.push({
      id: match.id!,
      winnerToMatchId: loserRound3.id!,
      winnerToSide: index === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2,
    }));

    prepareLoserMatch(loserRound4, 4, 0, loserRound3.winnerId, loserOf(final));
    progressionLinks.push({
      id: loserRound3.id!,
      winnerToMatchId: loserRound4.id!,
      winnerToSide: BracketSide.ATHLETE1,
    });
    progressionLinks.push({
      id: final.id!,
      loserToMatchId: loserRound4.id!,
      loserToSide: BracketSide.ATHLETE2,
    });

    prepareLoserMatch(grandFinal, 5, 0, final.winnerId, loserRound4.winnerId, MatchType.FINAL);
    progressionLinks.push({
      id: final.id!,
      winnerToMatchId: grandFinal.id!,
      winnerToSide: BracketSide.ATHLETE1,
    });
    progressionLinks.push({
      id: loserRound4.id!,
      winnerToMatchId: grandFinal.id!,
      winnerToSide: BracketSide.ATHLETE2,
    });
  }

  const deleted = await prisma.match.deleteMany({
    // This event is seed-owned demo data. A full refresh keeps the three
    // reference dates and their match counts exact on every Docker start.
    where: { eventId: event.id },
  });
  await prisma.draw.deleteMany({ where: { eventId: event.id } });
  await prisma.draw.createMany({ data: drawSeeds });
  await prisma.match.createMany({ data: matches });
  await prisma.$transaction(
    progressionLinks.map(({ id, ...data }) => prisma.match.update({ where: { id }, data })),
  );
  console.log(`Demo schedule refreshed: removed ${deleted.count}, created ${matches.length} matches and ${drawSeeds.length} draw graphs (${DEMO_DAY_COUNTS.join('/')})`);

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const wins = 2 + (index * 3) % 11;
    const losses = index % 5;
    const draws = index % 7 === 0 ? 1 : 0;
    const statisticData = {
      categoryId: categories[index % categories.length].id,
      totalWins: wins,
      totalLosses: losses,
      totalDraws: draws,
      totalMatches: wins + losses + draws,
      goldMedals: index % 9 === 0 ? 1 : 0,
      silverMedals: index % 11 === 0 ? 1 : 0,
      bronzeMedals: index % 5 === 0 ? 1 : 0,
    };
    await prisma.statistic.upsert({
      where: {
        athleteId_eventId_sportId: {
          athleteId: athlete.id,
          eventId: event.id,
          sportId: sportJJ.id,
        },
      },
      update: statisticData,
      create: { athleteId: athlete.id, eventId: event.id, sportId: sportJJ.id, ...statisticData },
    });
  }

  if (process.env.SEED_SEA_GAMES_DEMO !== 'false') {
    await seedSeaGamesDemo(prisma);
  }

  console.log('Seed completed successfully.');
  console.log(`Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('Backend : http://localhost:4000/api');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
