import type { Metadata } from 'next';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  referrer: 'no-referrer',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
