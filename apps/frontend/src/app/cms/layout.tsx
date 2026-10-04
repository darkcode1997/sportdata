import type { Metadata } from 'next';
import { CmsClientBoundary } from '@/components/cms/CmsClientBoundary';

export const metadata: Metadata = {
  title: 'CMS',
  robots: { index: false, follow: false },
};

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <CmsClientBoundary>{children}</CmsClientBoundary>;
}
