'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Drawer, Flex, Menu as AntMenu, Tooltip } from 'antd';
import { BarChart3, CalendarDays, Mail, Menu, Moon, Newspaper, Sun, Trophy, Users, X } from 'lucide-react';
import { createSportdataTheme, type SportdataColorMode } from '@/components/AntdProvider';

const navigation = [
  { href: '/', label: 'Tổng quan', icon: BarChart3 },
  { href: '/athletes', label: 'Vận động viên', icon: Users },
  { href: '/events', label: 'Lịch thi đấu', icon: CalendarDays },
  { href: '/rankings', label: 'Thành tích', icon: Trophy },
  { href: '/news', label: 'Tin tức', icon: Newspaper },
  { href: '/contact', label: 'Liên hệ', icon: Mail },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorMode, setColorMode] = useState<SportdataColorMode>('dark');
  const isLight = colorMode === 'light';
  const publicTheme = useMemo(() => createSportdataTheme(colorMode), [colorMode]);
  const selectedKey = navigation.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  )?.href || '/';

  const mobileMenuItems = navigation.map(({ href, label, icon: Icon }) => ({
    key: href,
    label,
    icon: <Icon className="h-5 w-5" />,
  }));

  useEffect(() => {
    setMenuOpen(false);

    const savedTheme = localStorage.getItem('public_color_mode');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setColorMode(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setColorMode('light');
    }
  }, [pathname]);

  const toggleColorMode = () => {
    setColorMode((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('public_color_mode', next);
      return next;
    });
  };

  const themeToggle = (
    <Tooltip title={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}>
      <Button
        type="text"
        shape="circle"
        aria-label={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
        aria-pressed={isLight}
        icon={isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        onClick={toggleColorMode}
      />
    </Tooltip>
  );

  if (pathname.startsWith('/cms') || pathname === '/d') return <>{children}</>;
  if (/^\/events\/[^/]+(?:\/categories\/[^/]+)?\/?$/.test(pathname)) {
    return (
      <ConfigProvider theme={publicTheme}>
        <main className={isLight ? 'public-theme-light min-h-screen bg-[#f4f7fb]' : 'min-h-screen bg-sdark-950'}>
          {children}
        </main>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={publicTheme}>
    <div className={`min-h-screen ${isLight ? 'public-theme-light bg-[#f4f7fb]' : 'bg-sdark-950'}`}>
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isLight ? 'border-slate-200 bg-white/90' : 'border-white/10 bg-sdark-950/90'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="SportData - Trang chủ">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
              <Trophy className="h-5 w-5 text-white" />
            </span>
            <span>
              <span className={`block text-base font-black tracking-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>SPORTDATA</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-sblue-400">Athlete hub</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            {navigation.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? isLight ? 'bg-sblue-500/10 text-sblue-700' : 'bg-white/10 text-white'
                      : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {themeToggle}
            <Button
              type="text"
              onClick={() => setMenuOpen(true)}
              className="!inline-flex lg:!hidden"
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
        size="min(288px, calc(100vw - 24px))"
        closable={false}
        rootClassName="lg:hidden"
        styles={{ body: { padding: 0 } }}
      >
        <Flex id="mobile-navigation" vertical className={`h-full overflow-x-hidden ${isLight ? 'bg-white' : 'bg-[#0d1425]'}`}>
          <Flex
            align="center"
            justify="space-between"
            className={`h-[72px] min-h-[72px] shrink-0 border-b px-5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}
          >
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="SportData - Trang chủ" onClick={() => setMenuOpen(false)}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
                <Trophy className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-base font-black tracking-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>SPORTDATA</span>
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
            theme={isLight ? 'light' : 'dark'}
            mode="inline"
            selectedKeys={[selectedKey]}
            items={mobileMenuItems}
            className="flex-1 border-0 px-3 py-5"
            onClick={({ key }) => {
              router.push(key);
              setMenuOpen(false);
            }}
          />

        </Flex>
      </Drawer>

      <main>{children}</main>

      <footer className={`border-t ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-sdark-950'}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 SportData. Dữ liệu thi đấu tập trung, minh bạch.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {navigation.slice(2).map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={isLight ? 'hover:text-slate-950' : 'hover:text-slate-200'}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
    </ConfigProvider>
  );
}
