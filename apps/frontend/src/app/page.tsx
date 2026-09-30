'use client';

import Link from 'next/link';
import { Button } from 'antd';
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DatabaseBackup,
  Medal,
  Network,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { HomeBannerSlider } from '@/components/home/HomeBannerSlider';

const sportGroups = [
  'Điền kinh',
  'Võ thuật & đối kháng',
  'Khiêu vũ thể thao',
  'Thể dục',
  'Thể thao sức mạnh',
  'Môn đồng đội',
  'Thể thao dưới nước',
  'Các môn mục tiêu',
];

const expertiseItems = [
  {
    title: 'Quản lý sự kiện',
    description: 'Điều hành giải đấu theo từng bộ môn, bám sát điều lệ và thống nhất dữ liệu từ đăng ký đến công bố kết quả.',
    href: '/events',
    icon: CalendarDays,
    tone: 'blue',
  },
  {
    title: 'Liên đoàn & đơn vị tổ chức',
    description: 'Tập trung hồ sơ vận động viên, đơn vị, thành tích và bảng xếp hạng trên một nền tảng dùng chung.',
    href: '/organizations',
    icon: Users,
    tone: 'emerald',
  },
  {
    title: 'Đại hội thể thao đa môn',
    description: 'Phối hợp lịch thi đấu, địa điểm, hạng mục, kết quả và báo cáo cho những chương trình có quy mô lớn.',
    href: '/rankings',
    icon: Trophy,
    tone: 'violet',
  },
];

const solutionItems = [
  {
    title: 'Điều hành sự kiện trọn quy trình',
    description: 'Thiết lập sự kiện, môn thi, hạng đấu và toàn bộ dữ liệu vận hành trong một luồng thống nhất.',
    href: '/events',
    icon: Settings,
  },
  {
    title: 'Quản lý thi đấu & kết quả',
    description: 'Theo dõi trạng thái trận, cập nhật tỷ số và công bố kết quả nhanh chóng, chính xác.',
    href: '/events',
    icon: Swords,
  },
  {
    title: 'Xếp lịch & điều phối địa điểm',
    description: 'Sắp xếp thời gian, sân thi đấu và nguồn lực để hạn chế xung đột trong lịch trình.',
    href: '/events',
    icon: Clock3,
  },
  {
    title: 'Hồ sơ vận động viên',
    description: 'Quản lý thông tin cá nhân, đơn vị, hạng mục tham dự và lịch sử thi đấu tập trung.',
    href: '/rankings',
    icon: UserRound,
  },
  {
    title: 'Thành tích & bảng xếp hạng',
    description: 'Tổng hợp huy chương, tỷ lệ thắng và thứ hạng từ dữ liệu kết quả đã được xác nhận.',
    href: '/rankings',
    icon: Medal,
  },
  {
    title: 'Hỗ trợ vận hành',
    description: 'Kết nối đội ngũ quản trị, bàn thi đấu và bộ phận nội dung trong suốt thời gian diễn ra sự kiện.',
    href: '/contact',
    icon: ShieldCheck,
  },
];

const benefitItems = [
  {
    number: '01',
    title: 'Dữ liệu tập trung',
    description: 'Một nguồn dữ liệu thống nhất cho sự kiện, vận động viên, lịch đấu, kết quả và truyền thông.',
    icon: DatabaseBackup,
  },
  {
    number: '02',
    title: 'Quy trình toàn diện',
    description: 'Kết nối các bước chuẩn bị, vận hành, phê duyệt và công bố trên cùng một hệ thống.',
    icon: Network,
  },
  {
    number: '03',
    title: 'Tùy chỉnh linh hoạt',
    description: 'Thích ứng với nhiều bộ môn, thể thức và vai trò nghiệp vụ khác nhau.',
    icon: Settings,
  },
  {
    number: '04',
    title: 'Kiểm soát minh bạch',
    description: 'Phân quyền rõ ràng và duy trì luồng xác nhận dữ liệu trước khi công bố.',
    icon: ShieldCheck,
  },
  {
    number: '05',
    title: 'Cập nhật nhanh chóng',
    description: 'Đưa lịch thi đấu, tỷ số và thành tích mới nhất đến người xem kịp thời.',
    icon: CheckCircle2,
  },
  {
    number: '06',
    title: 'Ổn định & tin cậy',
    description: 'Thiết kế cho hoạt động liên tục và khả năng mở rộng theo quy mô sự kiện.',
    icon: Award,
  },
];

export default function HomePage() {
  return (
    <div className="home-page min-h-screen">
      <HomeBannerSlider />

      <div className="home-content mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SportCoverage />
        <ExpertiseSection />
        <SolutionsSection />
        <BenefitsSection />
        <HomeCallToAction />
      </div>
    </div>
  );
}

function SportCoverage() {
  return (
    <section className="home-sport-coverage" aria-labelledby="sport-coverage-heading">
      <div className="home-sport-coverage-copy">
        <p className="home-marketing-eyebrow">Hệ sinh thái đa môn</p>
        <h2 id="sport-coverage-heading">Một nền tảng cho nhiều loại hình thể thao</h2>
      </div>
      <div className="home-sport-groups" aria-label="Các nhóm môn thể thao">
        {sportGroups.map((group) => <span key={group}>{group}</span>)}
      </div>
    </section>
  );
}

function ExpertiseSection() {
  return (
    <section aria-labelledby="expertise-heading">
      <MarketingHeading
        eyebrow="Năng lực triển khai"
        title="Công nghệ đồng hành cùng mọi quy mô tổ chức"
        description="Từ một giải đấu đơn lẻ đến đại hội đa môn, SportData giúp đội ngũ vận hành làm chủ dữ liệu và phối hợp hiệu quả."
        headingId="expertise-heading"
      />
      <div className="home-expertise-grid">
        {expertiseItems.map(({ title, description, href, icon: Icon, tone }, index) => (
          <Link key={title} href={href} className={`home-expertise-card home-expertise-card-${tone}`}>
            <span className="home-expertise-number">0{index + 1}</span>
            <span className="home-expertise-icon"><Icon className="h-7 w-7" /></span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <span className="home-card-action">Tìm hiểu thêm <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SolutionsSection() {
  return (
    <section className="home-solutions" aria-labelledby="solutions-heading">
      <MarketingHeading
        eyebrow="Giải pháp"
        title="Phần mềm và nghiệp vụ vận hành trong một hệ thống"
        description="Các mô-đun được kết nối xuyên suốt để giảm thao tác lặp lại, hạn chế sai lệch và đưa thông tin đến đúng người vào đúng thời điểm."
        headingId="solutions-heading"
      />
      <div className="home-solutions-grid">
        {solutionItems.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} href={href} className="home-solution-card">
            <span className="home-solution-icon"><Icon className="h-6 w-6" /></span>
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="home-card-action">Khám phá <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="home-benefits" aria-labelledby="benefits-heading">
      <div className="home-benefits-intro">
        <p className="home-marketing-eyebrow">Giá trị khác biệt</p>
        <h2 id="benefits-heading">Nền tảng được xây dựng cho vận hành thể thao thực tế</h2>
        <p>
          SportData kết nối con người, quy trình và dữ liệu để sự kiện được tổ chức nhất quán trước,
          trong và sau thi đấu.
        </p>
        <Button type="primary" size="large" href="/contact">Trao đổi với chúng tôi</Button>
      </div>
      <div className="home-benefits-grid">
        {benefitItems.map(({ number, title, description, icon: Icon }) => (
          <article key={number} className="home-benefit-card">
            <div className="home-benefit-topline">
              <span>{number}</span>
              <Icon className="h-5 w-5" />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HomeCallToAction() {
  return (
    <section className="home-final-cta" aria-labelledby="home-cta-heading">
      <div>
        <p className="home-marketing-eyebrow">Sẵn sàng bắt đầu?</p>
        <h2 id="home-cta-heading">Nâng tầm công tác tổ chức sự kiện thể thao</h2>
        <p>Khám phá dữ liệu đang được vận hành hoặc liên hệ để cùng xây dựng giải pháp phù hợp với đơn vị của bạn.</p>
      </div>
      <div className="home-final-cta-actions">
        <Button type="primary" size="large" href="/events">Khám phá sự kiện</Button>
        <Button size="large" href="/contact">Liên hệ</Button>
      </div>
    </section>
  );
}

function MarketingHeading({ eyebrow, title, description, headingId }: { eyebrow: string; title: string; description: string; headingId: string }) {
  return (
    <div className="home-marketing-heading">
      <p className="home-marketing-eyebrow">{eyebrow}</p>
      <h2 id={headingId}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
