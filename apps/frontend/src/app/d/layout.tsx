import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sao lưu hệ thống',
  robots: { index: false, follow: false },
};

export default function BackupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
