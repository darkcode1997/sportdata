'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { BarChart3, CalendarDays, Menu, ShieldCheck, Trophy, Users, X } from 'lucide-react';

const navigation = [
  { href: '/', label: 'Tổng quan', icon: BarChart3 },
  { href: '/athletes', label: 'Vận động viên', icon: Users },
  { href: '/events', label: 'Lịch thi đấu', icon: CalendarDays },
  { href: '/rankings', label: 'Thành tích', icon: Trophy },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
            <div className="hidden sm:block">
              <Button
                href="/cms"
                type="primary"
                ghost
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                CMS quản trị
              </Button>
            </div>
            <Button
              type="text"
              onClick={() => setMenuOpen((value) => !value)}
              className="md:hidden"
              icon={menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            />
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" className="border-t border-white/10 px-4 py-3 md:hidden" aria-label="Điều hướng di động">
            <div className="mx-auto grid max-w-7xl gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10">
                    <Icon className="h-4 w-4 text-sblue-400" />
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/cms" className="mt-1 flex items-center gap-3 rounded-lg bg-sblue-500/15 px-3 py-2.5 text-sm font-bold text-sblue-300 sm:hidden">
                <ShieldCheck className="h-4 w-4" />
                CMS quản trị
              </Link>
            </div>
          </nav>
        )}
      </header>

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
