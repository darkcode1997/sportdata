'use client';

import dynamic from 'next/dynamic';

const CmsShell = dynamic(() => import('./CmsShell'), {
  ssr: false,
  loading: () => <div role="status" className="flex min-h-screen items-center justify-center">Đang tải CMS…</div>,
});

export function CmsClientBoundary({ children }: { children: React.ReactNode }) {
  return <CmsShell>{children}</CmsShell>;
}
