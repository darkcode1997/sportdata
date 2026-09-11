'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Drawer, Flex, Menu as AntMenu } from 'antd';
import { BarChart3, CalendarDays, Menu, ShieldCheck, Trophy, Users, X } from 'lucide-react';

const navigation = [
  { href: '/', label: 'Tổng quan', icon: BarChart3 },
  { href: '/athletes', label: 'Vận động viên', icon: Users },
  { href: '/events', label: 'Lịch thi đấu', icon: CalendarDays },
  { href: '/rankings', label: 'Thành tích', icon: Trophy },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedKey = navigation.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  )?.href || '/';

  const mobileMenuItems = navigation.map(({ href, label, icon: Icon }) => ({
    key: href,
    label,
    icon: <Icon className="h-5 w-5" />,
  }));

  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname.startsWith('/cms') || pathname === '/d') return <>{children}</>;
  if (/^\/events\/[^/]+(?:\/categories\/[^/]+)?\/?$/.test(pathname)) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-sdark-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-sdark-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="SportData - Trang chủ">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
              <Trophy className="h-5 w-5 text-white" />
            </span>
            <span>
              <span className="block text-base font-black tracking-tight text-white">SPORTDATA</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-sblue-400">Athlete hub</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            {navigation.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="text"
              onClick={() => setMenuOpen(true)}
              className="!inline-flex md:!hidden"
              icon={<Menu className="h-5 w-5" />}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label="Mở menu"
            />
          </div>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="left"
        width="min(288px, calc(100vw - 24px))"
        closable={false}
        rootClassName="md:hidden"
        styles={{ body: { padding: 0 } }}
      >
        <Flex id="mobile-navigation" vertical className="h-full overflow-x-hidden bg-[#0d1425]">
          <Flex
            align="center"
            justify="space-between"
            className="h-[72px] min-h-[72px] shrink-0 border-b border-white/10 px-5"
          >
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="SportData - Trang chủ" onClick={() => setMenuOpen(false)}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
                <Trophy className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black tracking-tight text-white">SPORTDATA</span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-sblue-400">Athlete hub</span>
              </span>
            </Link>
            <Button
              type="text"
              shape="circle"
              icon={<X className="h-5 w-5" />}
              aria-label="Đóng menu"
              onClick={() => setMenuOpen(false)}
            />
          </Flex>

          <AntMenu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={mobileMenuItems}
            className="flex-1 border-0 px-3 py-5"
            onClick={({ key }) => {
              router.push(key);
              setMenuOpen(false);
            }}
          />

          <div className="border-t border-white/10 p-4">
            <Link
              href="/cms"
              className="flex items-center gap-3 rounded-xl bg-sblue-500/15 px-4 py-3 text-sm font-bold text-sblue-300 transition-colors hover:bg-sblue-500/25 hover:text-sblue-200"
            >
              <ShieldCheck className="h-5 w-5 shrink-0" />
              CMS quản trị
            </Link>
          </div>
        </Flex>
      </Drawer>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-sdark-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 SportData. Dữ liệu thi đấu tập trung, minh bạch.</p>
          <div className="flex gap-5">
            <Link href="/events" className="hover:text-slate-200">Lịch thi đấu</Link>
            <Link href="/rankings" className="hover:text-slate-200">Bảng thành tích</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
