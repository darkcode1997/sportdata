import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ParticipantResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  referrer: 'no-referrer',
};

export default function ParticipantResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantResetPasswordForm />
    </Suspense>
  );
}
