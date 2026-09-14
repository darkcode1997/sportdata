export type StatusMeta = {
  label: string;
  shortLabel?: string;
  color: string;
};

export const MATCH_STATUS_META: Record<string, StatusMeta> = {
  SCHEDULED: { label: 'Sắp diễn ra', shortLabel: 'Sắp đấu', color: 'blue' },
  RUNNING: { label: 'Đang thi đấu', shortLabel: 'Đang đấu', color: 'error' },
  FINISHED: { label: 'Đã hoàn thành', shortLabel: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', shortLabel: 'Đã hủy', color: 'default' },
};

export const RESULT_STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { label: 'Bản nháp', shortLabel: 'Nháp', color: 'default' },
  ENTERED: { label: 'Đã nhập kết quả', shortLabel: 'Đã nhập', color: 'processing' },
  REFEREE_CONFIRMED: { label: 'Trọng tài đã xác nhận', shortLabel: 'Trọng tài duyệt', color: 'cyan' },
  APPROVED: { label: 'Đã phê duyệt', shortLabel: 'Phê duyệt', color: 'blue' },
  PUBLISHED: { label: 'Đã công bố', shortLabel: 'Công bố', color: 'green' },
  LOCKED: { label: 'Đã khóa kết quả', shortLabel: 'Đã khóa', color: 'gold' },
};

export const RESULT_ACTION_LABELS: Record<string, string> = {
  ENTER_RESULT: 'Nhập kết quả',
  REFEREE_CONFIRM: 'Trọng tài xác nhận',
  APPROVE_RESULT: 'Phê duyệt kết quả',
  PUBLISH_RESULT: 'Công bố kết quả',
  LOCK_RESULT: 'Khóa kết quả',
  REOPEN_RESULT: 'Mở lại để hiệu chỉnh',
};

export const ENTRY_STATUS_META: Record<string, StatusMeta> = {
  REGISTERED: { label: 'Đã đăng ký', color: 'blue' },
  VERIFIED: { label: 'Đã xác minh', color: 'green' },
  WITHDRAWN: { label: 'Đã rút', color: 'default' },
  DISQUALIFIED: { label: 'Bị loại', color: 'red' },
};

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Cá nhân',
  TEAM: 'Đội',
  RELAY: 'Tiếp sức',
};

export const SESSION_STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { label: 'Bản nháp', color: 'default' },
  PUBLISHED: { label: 'Đã công bố', color: 'green' },
  LOCKED: { label: 'Đã khóa', color: 'gold' },
};

export const HEAT_STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { label: 'Bản nháp', color: 'default' },
  SCHEDULED: { label: 'Đã xếp lịch', color: 'blue' },
  RUNNING: { label: 'Đang thi đấu', color: 'error' },
  FINISHED: { label: 'Đã hoàn thành', color: 'success' },
  PUBLISHED: { label: 'Đã công bố', color: 'green' },
};

export const MATCH_TYPE_LABELS: Record<string, string> = {
  POOL: 'Vòng tính điểm',
  GROUP_STAGE: 'Vòng bảng',
  QUALIFIER: 'Vòng loại',
  PRELIMINARY: 'Vòng sơ loại',
  ROUND_OF_32: 'Vòng 32',
  ROUND_OF_16: 'Vòng 16',
  QUARTERFINAL: 'Tứ kết',
  QUARTER_FINAL: 'Tứ kết',
  SEMIFINAL: 'Bán kết',
  SEMI_FINAL: 'Bán kết',
  FINAL: 'Chung kết',
  ELIMINATION: 'Loại trực tiếp',
  ROUND_ROBIN: 'Vòng tròn',
  HEAT: 'Lượt đấu phân làn',
};

export const WIN_METHOD_LABELS: Record<string, string> = {
  POINTS: 'Thắng điểm',
  SUBMISSION: 'Thắng bằng khóa/siết',
  IPPON: 'Thắng Ippon',
  KNOCKOUT: 'Thắng knock-out',
  KO: 'Thắng KO',
  TKO: 'Thắng TKO',
  DISQUALIFICATION: 'Thắng do đối thủ bị loại',
  WALKOVVER: 'Thắng do đối thủ bỏ cuộc',
  WITHDRAWAL: 'Thắng do đối thủ rút cuộc',
  DECISION: 'Thắng theo quyết định trọng tài',
  TECHNICAL: 'Thắng kỹ thuật',
};

export const CONFLICT_TYPE_LABELS: Record<string, string> = {
  FOP_OVERLAP: 'Trùng lịch trên cùng sân/sàn',
  SPORT_WINDOW: 'Ngoài khung giờ của bộ môn',
  PROGRESSION_ORDER: 'Sai thứ tự vòng đấu',
  PARTICIPANT_REST: 'Không đủ thời gian nghỉ',
};

export const CONFLICT_SEVERITY_META: Record<string, StatusMeta> = {
  ERROR: { label: 'Lỗi bắt buộc', color: 'red' },
  WARNING: { label: 'Cảnh báo', color: 'orange' },
};

export function statusMeta(
  collection: Record<string, StatusMeta>,
  value?: string | null,
  fallback = 'Chưa xác định',
): StatusMeta {
  return (value && collection[value]) || { label: fallback, color: 'default' };
}

export function labelOf(
  collection: Record<string, string>,
  value?: string | null,
  fallback = 'Chưa xác định',
): string {
  return (value && collection[value]) || fallback;
}
