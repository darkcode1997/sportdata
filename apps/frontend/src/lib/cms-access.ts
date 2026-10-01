export const CMS_ROLES = [
  'ADMIN',
  'CONTENT',
  'GAMES_ADMIN',
  'SPORT_MANAGER',
  'VENUE_OPERATOR',
  'SCOREKEEPER',
  'RESULT_APPROVER',
  'READ_ONLY',
] as const;

export type CmsRole = (typeof CMS_ROLES)[number];

export const ALL_CMS_ROLES: readonly CmsRole[] = CMS_ROLES;

export const CMS_ROLE_INFO: Record<CmsRole, {
  label: string;
  shortLabel: string;
  description: string;
  startPath: string;
  capabilities: string[];
  restrictions: string[];
}> = {
  ADMIN: {
    label: 'Quản trị hệ thống',
    shortLabel: 'Admin',
    description: 'Quản lý cấu hình nền tảng, tài khoản, dữ liệu và toàn bộ nghiệp vụ đại hội.',
    startPath: '/cms',
    capabilities: ['Toàn quyền CMS', 'Quản lý tài khoản và sao lưu', 'Mở lại kết quả đã duyệt'],
    restrictions: ['Chỉ dùng cho quản trị kỹ thuật; không dùng chung tại bàn thi đấu'],
  },
  CONTENT: {
    label: 'Biên tập nội dung',
    shortLabel: 'Nội dung',
    description: 'Quản lý banner, tin tức và dữ liệu danh mục phục vụ website công khai.',
    startPath: '/cms/news',
    capabilities: ['Banner, tin tức và liên hệ', 'Dữ liệu sự kiện/VĐV', 'Danh mục môn và hạng đấu'],
    restrictions: ['Không điều hành lịch', 'Không nhập hoặc phê duyệt kết quả'],
  },
  GAMES_ADMIN: {
    label: 'Quản trị đại hội',
    shortLabel: 'Đại hội',
    description: 'Điều phối toàn bộ quy trình thi đấu của một đại hội.',
    startPath: '/cms/events',
    capabilities: ['Địa điểm, ca và khung giờ', 'Đăng ký, thể thức và xếp lịch', 'Toàn bộ quy trình kết quả'],
    restrictions: ['Không quản lý tài khoản hệ thống hoặc bản sao lưu'],
  },
  SPORT_MANAGER: {
    label: 'Trưởng bộ môn',
    shortLabel: 'Trưởng môn',
    description: 'Quản lý chuyên môn, lượt đăng ký, thể thức, lịch và xác nhận trọng tài.',
    startPath: '/cms/events',
    capabilities: ['Quản lý VĐV/hạng mục', 'Sinh thể thức và xếp lịch', 'Nhập và xác nhận kết quả'],
    restrictions: ['Không phê duyệt/công bố kết quả cuối', 'Không tạo hoặc xóa venue'],
  },
  VENUE_OPERATOR: {
    label: 'Điều hành địa điểm',
    shortLabel: 'Địa điểm',
    description: 'Điều phối ca, sàn thi đấu và khóa lịch tại địa điểm.',
    startPath: '/cms/matches',
    capabilities: ['Quản lý ca và khung giờ', 'Cập nhật và khóa lịch trận', 'Theo dõi xung đột'],
    restrictions: ['Không thay đổi đăng ký/thể thức', 'Không nhập hoặc duyệt kết quả'],
  },
  SCOREKEEPER: {
    label: 'Nhập điểm',
    shortLabel: 'Nhập điểm',
    description: 'Nhập và hiệu chỉnh kết quả ở trạng thái bản nháp/đã nhập.',
    startPath: '/cms/matches',
    capabilities: ['Xem lịch và người thi đấu', 'Nhập tỷ số và người thắng', 'Xem lịch sử phiên bản'],
    restrictions: ['Không xác nhận trọng tài', 'Không phê duyệt, công bố hoặc khóa kết quả'],
  },
  RESULT_APPROVER: {
    label: 'Phê duyệt kết quả',
    shortLabel: 'Phê duyệt',
    description: 'Phê duyệt, công bố và khóa kết quả đã được trọng tài xác nhận.',
    startPath: '/cms/matches',
    capabilities: ['Phê duyệt kết quả', 'Công bố ra website', 'Khóa kết quả chính thức'],
    restrictions: ['Không tự nhập tỷ số', 'Không mở lại kết quả đã khóa'],
  },
  READ_ONLY: {
    label: 'Chỉ xem',
    shortLabel: 'Chỉ xem',
    description: 'Theo dõi dữ liệu, lịch, xung đột và kết quả mà không thay đổi hệ thống.',
    startPath: '/cms',
    capabilities: ['Xem dashboard và dữ liệu thi đấu', 'Xem báo cáo sẵn sàng/xung đột', 'Xem thống kê'],
    restrictions: ['Không được tạo, sửa, xóa, nhập điểm hoặc phê duyệt'],
  },
};

export const CMS_PAGE_ACCESS: Record<string, readonly CmsRole[]> = {
  '/cms': ALL_CMS_ROLES,
  '/cms/operations': ['ADMIN', 'GAMES_ADMIN', 'SPORT_MANAGER', 'VENUE_OPERATOR', 'SCOREKEEPER', 'RESULT_APPROVER', 'READ_ONLY'],
  '/cms/events': ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'READ_ONLY'],
  '/cms/registrations': ['ADMIN', 'GAMES_ADMIN', 'SPORT_MANAGER', 'READ_ONLY'],
  '/cms/athletes': ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'READ_ONLY'],
  '/cms/sports': ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'READ_ONLY'],
  '/cms/organizations': ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'READ_ONLY'],
  '/cms/accounts': ['ADMIN', 'GAMES_ADMIN', 'READ_ONLY'],
  '/cms/users': ['ADMIN'],
  '/cms/account': ALL_CMS_ROLES,
  '/cms/matches': ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'VENUE_OPERATOR', 'READ_ONLY'],
  '/cms/statistics': ALL_CMS_ROLES,
  '/cms/banners': ['ADMIN', 'CONTENT'],
  '/cms/news': ['ADMIN', 'CONTENT'],
  '/cms/contacts': ['ADMIN', 'CONTENT'],
  '/cms/settings': ['ADMIN'],
};

export const DEMO_ROLE_USERNAMES: Record<CmsRole, string> = {
  ADMIN: 'demo.admin',
  CONTENT: 'demo.content',
  GAMES_ADMIN: 'demo.games',
  SPORT_MANAGER: 'demo.sport',
  VENUE_OPERATOR: 'demo.venue',
  SCOREKEEPER: 'demo.score',
  RESULT_APPROVER: 'demo.approver',
  READ_ONLY: 'demo.viewer',
};

export function isCmsRole(role?: string | null): role is CmsRole {
  return Boolean(role && CMS_ROLES.includes(role as CmsRole));
}

export function canAccessCmsPath(pathname: string, role?: string | null) {
  if (!isCmsRole(role)) return false;
  if (pathname === '/cms') return true;

  const mutationRouteRoles: Array<{ matches: boolean; roles: readonly CmsRole[] }> = [
    {
      matches: pathname === '/cms/events/new' || /^\/cms\/events\/[^/]+\/edit$/.test(pathname),
      roles: ['ADMIN', 'CONTENT', 'GAMES_ADMIN'],
    },
    {
      matches: pathname === '/cms/athletes/new' || /^\/cms\/athletes\/[^/]+\/edit$/.test(pathname),
      roles: ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER'],
    },
    {
      matches: pathname === '/cms/matches/new' || /^\/cms\/matches\/[^/]+\/edit$/.test(pathname),
      roles: ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER', 'VENUE_OPERATOR'],
    },
  ];
  const mutationRoute = mutationRouteRoles.find((rule) => rule.matches);
  if (mutationRoute) return mutationRoute.roles.includes(role);

  const route = Object.keys(CMS_PAGE_ACCESS)
    .filter((key) => key !== '/cms')
    .sort((left, right) => right.length - left.length)
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));

  return route ? CMS_PAGE_ACCESS[route].includes(role) : false;
}
