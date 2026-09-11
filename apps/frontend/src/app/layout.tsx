import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import { AntdProvider } from '@/components/AntdProvider';
import { PublicShell } from '@/components/PublicShell';

export const metadata: Metadata = {
  title: {
    default: 'SportData — Hồ sơ & thành tích vận động viên',
    template: '%s | SportData',
  },
  description:
    'Theo dõi hồ sơ vận động viên, lịch thi đấu, kết quả và bảng thành tích thể thao.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-screen bg-sdark-950 text-slate-100 antialiased">
        <AntdRegistry>
          <AntdProvider>
            <PublicShell>{children}</PublicShell>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
