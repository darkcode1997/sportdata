'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  ConfigProvider,
  Drawer,
  Flex,
  Layout,
  Menu as AntMenu,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Moon,
  Newspaper,
  Settings,
  Sun,
  Swords,
  Trophy,
  User,
  Users,
  Workflow,
} from 'lucide-react';
import {
  applyDocumentColorMode,
  createSportdataTheme,
  type SportdataColorMode,
} from '@/components/AntdProvider';
import {
  canAccessCmsPath,
  CMS_PAGE_ACCESS,
  CMS_ROLE_INFO,
  isCmsRole,
} from '@/lib/cms-access';

const navItems = [
  { label: 'Dashboard', key: '/cms', icon: <LayoutDashboard className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms'] },
  { label: 'Điều hành giải đấu', key: '/cms/operations', icon: <Workflow className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/operations'] },
  { label: 'Sự kiện', key: '/cms/events', icon: <CalendarDays className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/events'] },
  { label: 'Vận động viên', key: '/cms/athletes', icon: <Users className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/athletes'] },
  { label: 'Bộ môn & hạng đấu', key: '/cms/sports', icon: <Trophy className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/sports'] },
  { label: 'Trận đấu', key: '/cms/matches', icon: <Swords className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/matches'] },
  { label: 'Thống kê', key: '/cms/statistics', icon: <BarChart3 className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/statistics'] },
  { label: 'Tin tức', key: '/cms/news', icon: <Newspaper className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/news'] },
  { label: 'Liên hệ', key: '/cms/contacts', icon: <Mail className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/contacts'] },
  { label: 'Cài đặt', key: '/cms/settings', icon: <Settings className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/settings'] },
  { label: 'Hướng dẫn sử dụng', key: '/cms/help', icon: <BookOpen className="h-5 w-5" />, roles: CMS_PAGE_ACCESS['/cms/help'] },
];

const publicAuthPaths = ['/cms/login', '/cms/forgot-password', '/cms/reset-password'];

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<SportdataColorMode>('dark');
  const isPublicAuthPath = publicAuthPaths.includes(pathname);
  const isLight = colorMode === 'light';
  const cmsTheme = useMemo(() => createSportdataTheme(colorMode), [colorMode]);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem('cms_sidebar_collapsed') === 'true');

    const savedTheme = localStorage.getItem('cms_color_mode');
    let nextMode: SportdataColorMode = 'dark';
    if (savedTheme === 'light' || savedTheme === 'dark') {
      nextMode = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      nextMode = 'light';
    }
    applyDocumentColorMode(nextMode);
    setColorMode(nextMode);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isPublicAuthPath) {
      setAuthenticated(true);
      return () => {
        cancelled = true;
      };
    }

    const token = localStorage.getItem('cms_token');
    if (!token) {
      router.replace('/cms/login');
      return () => {
        cancelled = true;
      };
    }

    setAuthenticated(false);
    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Phiên đăng nhập không hợp lệ');
        return response.json();
      })
      .then((user) => {
        if (cancelled) return;
        setUserLabel(user.username || user.email || null);
        setUserRole(user.role || null);
        localStorage.setItem('cms_user', JSON.stringify(user));
        setAuthenticated(true);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_user');
        router.replace('/cms/login');
      });

    return () => {
      cancelled = true;
    };
  }, [isPublicAuthPath, router]);

  useEffect(() => {
    if (!authenticated || isPublicAuthPath || !userRole) return;
    if (!canAccessCmsPath(pathname, userRole)) router.replace('/cms/help');
  }, [authenticated, isPublicAuthPath, pathname, router, userRole]);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isCmsRole(userRole) && item.roles.includes(userRole)),
    [userRole],
  );

  const selectedKey = useMemo(() => {
    return [...visibleNavItems]
      .sort((left, right) => right.key.length - left.key.length)
      .find((item) => item.key === '/cms' ? pathname === '/cms' : pathname.startsWith(item.key))
      ?.key || '/cms';
  }, [pathname, visibleNavItems]);

  const handleLogout = () => {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_user');
    router.push('/cms/login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem('cms_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleColorMode = () => {
    setColorMode((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cms_color_mode', next);
      applyDocumentColorMode(next);
      return next;
    });
  };

  const renderThemeToggle = () => (
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

  const renderNavigation = (compact = false) => (
    <Flex vertical className={`h-full ${isLight ? 'bg-white' : 'bg-[#0d1425]'}`}>
      <Flex
        align="center"
        justify={compact ? 'center' : 'flex-start'}
        gap={11}
        className={`h-[72px] min-h-[72px] shrink-0 border-b ${isLight ? 'border-slate-200' : 'border-white/10'} ${compact ? 'px-3' : 'px-6'}`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
          <Trophy className="h-5 w-5 text-white" />
        </span>
        {!compact && <div>
          <Typography.Text strong className={`block text-base tracking-tight ${isLight ? '!text-slate-900' : '!text-white'}`}>SportCMS</Typography.Text>
          <Typography.Text type="secondary" className="text-[11px] uppercase tracking-[0.14em]">Control center</Typography.Text>
        </div>}
      </Flex>

      <AntMenu
        theme={isLight ? 'light' : 'dark'}
        mode="inline"
        inlineCollapsed={compact}
        selectedKeys={[selectedKey]}
        items={visibleNavItems.map(({ roles: _roles, ...item }) => item)}
        className={`flex-1 overflow-y-auto border-0 py-5 ${compact ? 'px-2' : 'px-3'}`}
        onClick={({ key }) => {
          router.push(key);
          setSidebarOpen(false);
        }}
      />

      <div className={`border-t p-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <Button
          type="text"
          danger
          block
          aria-label="Đăng xuất"
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
        >
          {!compact && 'Đăng xuất'}
        </Button>
      </div>
    </Flex>
  );

  if (!authenticated && !isPublicAuthPath) {
    return (
      <ConfigProvider theme={cmsTheme}>
        <Flex className={`min-h-screen ${isLight ? 'cms-theme-light bg-[#f4f7fb]' : 'bg-[#070b16]'}`} align="center" justify="center">
          <Spin size="large" tip="Đang tải" />
        </Flex>
      </ConfigProvider>
    );
  }

  if (isPublicAuthPath) {
    return (
      <ConfigProvider theme={cmsTheme}>
        <div className={`min-h-screen ${isLight ? 'cms-theme-light bg-[#f4f7fb]' : 'bg-[#070b16]'}`}>
          <div className="fixed right-4 top-4 z-50">{renderThemeToggle()}</div>
          {children}
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={cmsTheme}>
      <Layout
        hasSider
        className={isLight ? 'cms-theme-light bg-[#f4f7fb]' : 'bg-[#070b16]'}
        style={{ minHeight: '100vh' }}
      >
        <Layout.Sider
          width={264}
          collapsedWidth={80}
          collapsed={sidebarCollapsed}
          trigger={null}
          theme={isLight ? 'light' : 'dark'}
          className={`!fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r lg:!block ${isLight ? 'border-slate-200' : 'border-white/10'}`}
        >
          {renderNavigation(sidebarCollapsed)}
        </Layout.Sider>

        <Drawer
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          placement="left"
          width={264}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          {renderNavigation(false)}
        </Drawer>

        <Layout
          className={`cms-layout-main min-w-0 ${isLight ? 'bg-[#f4f7fb]' : 'bg-[#070b16]'}`}
          style={{
            '--cms-sidebar-width': `${sidebarCollapsed ? 80 : 264}px`,
            minHeight: '100vh',
          } as React.CSSProperties}
        >
          <header className={`sticky top-0 z-30 flex h-[72px] min-h-[72px] shrink-0 items-center justify-between border-b px-4 leading-normal backdrop-blur-xl sm:px-7 ${isLight ? 'border-slate-200 bg-white/95' : 'border-white/10 bg-[#0d1425]/95'}`}>
            <Flex align="center" gap={14}>
              <Button
                type="text"
                className="!inline-flex lg:!hidden"
                aria-label="Mở điều hướng"
                icon={<MenuIcon className="h-5 w-5" />}
                onClick={() => setSidebarOpen(true)}
              />
              <Button
                type="text"
                className="!hidden lg:!inline-flex"
                aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                icon={sidebarCollapsed
                  ? <ChevronsRight className="h-5 w-5" />
                  : <ChevronsLeft className="h-5 w-5" />}
                onClick={toggleSidebar}
              />
              <div>
                <Typography.Text strong className={`block text-sm ${isLight ? '!text-slate-900' : '!text-slate-200'}`}>Trung tâm quản trị</Typography.Text>
                <Typography.Text type="secondary" className="hidden text-xs sm:block">Dữ liệu vận động viên và giải đấu</Typography.Text>
              </div>
            </Flex>

            <Flex align="center" gap={8} className="h-full">
              <Link href="/cms/help" aria-label="Mở hướng dẫn sử dụng CMS">
                <Button type="text" icon={<BookOpen className="h-5 w-5" />}>
                  <span className="hidden xl:inline">Hướng dẫn</span>
                </Button>
              </Link>
              {renderThemeToggle()}
              <Link
                href="/cms/settings"
                className={`group h-full rounded-l-xl transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.03]'}`}
                aria-label="Mở cài đặt tài khoản"
              >
                <Flex align="center" gap={12} className={`h-full pl-4 pr-2 ${isLight ? '' : ''}`}>
                  <Avatar size={38} icon={<User className="h-4 w-4" />} className="bg-sblue-500/20 text-sblue-300" />
                  <div className="hidden sm:block">
                    <Typography.Text strong className="block text-sm group-hover:text-sblue-500">{userLabel || 'Admin'}</Typography.Text>
                    <Typography.Text type="secondary" className="block text-xs">
                      {isCmsRole(userRole) ? CMS_ROLE_INFO[userRole].shortLabel : 'Người dùng'}
                    </Typography.Text>
                  </div>
                </Flex>
              </Link>
            </Flex>
          </header>

          <Layout.Content className="flex-1 p-4 sm:p-7 lg:p-8">{children}</Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
