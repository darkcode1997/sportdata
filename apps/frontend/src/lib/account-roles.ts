export const PERSONAL_ACCOUNT_OPTIONS = [
  { value: 'GENERAL', label: 'Tài khoản thường' },
  { value: 'ATHLETE', label: 'Vận động viên' },
  { value: 'REFEREE', label: 'Trọng tài' },
  { value: 'TEAM_LEADER', label: 'Trưởng đoàn' },
  { value: 'COACH', label: 'Huấn luyện viên' },
  { value: 'MEDICAL', label: 'Nhân viên y tế' },
] as const;

export type PersonalAccountType = typeof PERSONAL_ACCOUNT_OPTIONS[number]['value'];
export type SportDataAccountType = PersonalAccountType | 'FEDERATION';
export const STAFF_ROLE_OPTIONS = PERSONAL_ACCOUNT_OPTIONS.filter(option => !['GENERAL', 'ATHLETE'].includes(option.value));
export function accountRoleLabel(type: string) {
  return type === 'FEDERATION' ? 'Đại diện đơn vị' : PERSONAL_ACCOUNT_OPTIONS.find(option => option.value === type)?.label || type;
}
export const PARTICIPATION_STATUS: Record<string, string> = {
  PENDING: 'Chờ ban tổ chức duyệt', APPROVED: 'Đã được duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
};
