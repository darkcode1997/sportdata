export const sportDataAccountTypeOptions = [
  { value: 'ATHLETE', label: 'VĐV' },
  { value: 'REFEREE', label: 'Trọng tài' },
  { value: 'COACH', label: 'Huấn luyện viên' },
  { value: 'TEAM_LEADER', label: 'Trưởng đoàn' },
  { value: 'MEDICAL_STAFF', label: 'Nhân viên y tế' },
] as const;

export type SportDataAccountType = typeof sportDataAccountTypeOptions[number]['value'];

export function accountTypeLabel(value: string) {
  return sportDataAccountTypeOptions.find((item) => item.value === value)?.label || value;
}
