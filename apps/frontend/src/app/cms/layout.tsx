'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  Drawer,
  Flex,
  Layout,
  Menu as AntMenu,
  Spin,
  Typography,
} from 'antd';
import {
  BarChart3,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', key: '/cms', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Sự kiện', key: '/cms/events', icon: <CalendarDays className="h-5 w-5" /> },
  { label: 'Vận động viên', key: '/cms/athletes', icon: <Users className="h-5 w-5" /> },
  { label: 'Bộ môn & hạng đấu', key: '/cms/sports', icon: <Trophy className="h-5 w-5" /> },
  { label: 'Trận đấu', key: '/cms/matches', icon: <Swords className="h-5 w-5" /> },
  { label: 'Thống kê', key: '/cms/statistics', icon: <BarChart3 className="h-5 w-5" /> },
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
  const isPublicAuthPath = publicAuthPaths.includes(pathname);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem('cms_sidebar_collapsed') === 'true');
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

  const selectedKey = useMemo(() => {
    return [...navItems]
      .sort((left, right) => right.key.length - left.key.length)
      .find((item) => item.key === '/cms' ? pathname === '/cms' : pathname.startsWith(item.key))
      ?.key || '/cms';
  }, [pathname]);

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

  const renderNavigation = (compact = false) => (
    <Flex vertical className="h-full bg-[#0d1425]">
      <Flex
        align="center"
        justify={compact ? 'center' : 'flex-start'}
        gap={11}
        className={`h-[72px] border-b border-white/10 ${compact ? 'px-3' : 'px-6'}`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sblue-400 to-sblue-700 shadow-lg shadow-sblue-500/20">
          <Trophy className="h-5 w-5 text-white" />
        </span>
        {!compact && <div>
          <Typography.Text strong className="block text-base tracking-tight text-white">SportCMS</Typography.Text>
          <Typography.Text type="secondary" className="text-[11px] uppercase tracking-[0.14em]">Control center</Typography.Text>
        </div>}
      </Flex>

      <AntMenu
        theme="dark"
        mode="inline"
        inlineCollapsed={compact}
        selectedKeys={[selectedKey]}
        items={navItems}
        className={`flex-1 border-0 py-5 ${compact ? 'px-2' : 'px-3'}`}
        onClick={({ key }) => {
          router.push(key);
          setSidebarOpen(false);
        }}
      />

      <div className="border-t border-white/10 p-4">
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
      <Flex className="min-h-screen bg-[#070b16]" align="center" justify="center">
        <Spin size="large" tip="Đang xác thực" />
      </Flex>
    );
  }

  if (isPublicAuthPath) return children;

  return (
    <Layout hasSider className="min-h-screen bg-[#070b16]">
      <Layout.Sider
        width={264}
        collapsedWidth={80}
        collapsed={sidebarCollapsed}
        trigger={null}
        theme="dark"
        className="!fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-white/10 lg:!block"
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
        className="cms-layout-main min-h-screen min-w-0 bg-[#070b16]"
        style={{ '--cms-sidebar-width': `${sidebarCollapsed ? 80 : 264}px` } as React.CSSProperties}
      >
        <Layout.Header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/10 bg-[#0d1425]/95 px-4 backdrop-blur-xl sm:px-7">
          <Flex align="center" gap={14}>
            <Button
              type="text"
              className="lg:hidden"
              aria-label="Mở điều hướng"
              icon={<MenuIcon className="h-5 w-5" />}
              onClick={() => setSidebarOpen(true)}
            />
            <Button
              type="text"
              className="hidden lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              icon={sidebarCollapsed
                ? <ChevronsRight className="h-5 w-5" />
                : <ChevronsLeft className="h-5 w-5" />}
              onClick={toggleSidebar}
            />
            <div>
              <Typography.Text strong className="block text-sm text-slate-200">Trung tâm quản trị</Typography.Text>
              <Typography.Text type="secondary" className="hidden text-xs sm:block">Dữ liệu vận động viên và giải đấu</Typography.Text>
            </div>
          </Flex>

          <Flex align="center" gap={12} className="border-l border-white/10 pl-4">
            <Avatar size={38} icon={<User className="h-4 w-4" />} className="bg-sblue-500/20 text-sblue-300" />
            <div className="hidden sm:block">
              <Typography.Text strong className="block text-sm">{userLabel || 'Admin'}</Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                {userRole === 'ADMIN' ? 'Quản trị viên' : userRole || 'Người dùng'}
              </Typography.Text>
            </div>
          </Flex>
        </Layout.Header>

        <Layout.Content className="p-4 sm:p-7 lg:p-8">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
