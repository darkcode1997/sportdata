'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Tag } from 'antd';
import { Building2, ChevronRight, LockKeyhole, LogIn, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';

type LoginMode = 'ATHLETE' | 'FEDERATION' | 'EVENT_MANAGER';

const modes: Array<{ key: LoginMode; title: string; description: string; icon: React.ReactNode }> = [
  {
    key: 'ATHLETE',
    title: 'Cá nhân / Vận động viên',
    description: 'Hồ sơ cá nhân, giấy tờ, đăng ký thi đấu và vé tham dự.',
    icon: <UserRound className="h-5 w-5" />,
  },
  {
    key: 'FEDERATION',
    title: 'Liên đoàn / CLB',
    description: 'Đăng ký danh sách VĐV và quản lý bộ vé của đơn vị.',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    key: 'EVENT_MANAGER',
    title: 'Event Manager',
    description: 'Nhân sự SportData vận hành và kiểm duyệt sự kiện.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export default function SportDataLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('ATHLETE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (values: { email: string; password: string }) => {
    if (mode === 'EVENT_MANAGER') return;
    setLoading(true);
    setError('');
    try {
      const { data } = await participantApi.post('/participant-auth/login', { ...values, accountType: mode });
      setParticipantSession(data.accessToken, data.account);
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next || (data.account.accountType === 'FEDERATION' ? '/federation-account' : '/account'));
    } catch (requestError) {
      setError(participantError(requestError, 'Không thể đăng nhập'));
    } finally {
      setLoading(false);
    }
  };

  const selected = modes.find((item) => item.key === mode)!;

  return (
    <main className="account-gateway-page min-h-[calc(100vh-64px)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section>
          <Tag color="blue">SPORTDATA ACCOUNT</Tag>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Một cổng đăng nhập, đúng vai trò</h1>
          <p className="mt-3 max-w-xl text-slate-400">SportData là đơn vị tổ chức và vận hành sự kiện. Hãy chọn loại tài khoản để hệ thống đưa bạn đến đúng khu vực làm việc.</p>
          <div className="mt-7 space-y-3">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => { setMode(item.key); setError(''); }}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${mode === item.key ? 'border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-950/20' : 'border-white/10 bg-white/[0.03] hover:border-sky-400/50'}`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${mode === item.key ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-base text-slate-100">{item.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </button>
            ))}
          </div>
        </section>

        <Card className="h-fit" title={<span className="flex items-center gap-2">{selected.icon} {selected.title}</span>}>
          {mode === 'EVENT_MANAGER' ? (
            <div className="py-4">
              <Alert
                className="mb-6"
                showIcon
                type="info"
                message="Khu vực nội bộ SportData"
                description="Tài khoản Event Manager do quản trị viên SportData cấp, không đăng ký công khai. Quyền CMS được giới hạn theo nhiệm vụ vận hành."
              />
              <Link href="/cms/login"><Button block size="large" type="primary" icon={<ShieldCheck className="h-4 w-4" />}>Đăng nhập Event Manager</Button></Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-slate-400">{selected.description}</p>
              {error && <Alert className="mb-5" type="error" showIcon message={error} />}
              <Form layout="vertical" onFinish={submit} requiredMark={false}>
                <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
                  <Input size="large" prefix={<Mail className="h-4 w-4" />} autoComplete="email" />
                </Form.Item>
                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
                  <Input.Password size="large" prefix={<LockKeyhole className="h-4 w-4" />} autoComplete="current-password" />
                </Form.Item>
                <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<LogIn className="h-4 w-4" />}>Đăng nhập</Button>
              </Form>
              <p className="mt-6 text-center text-sm text-slate-400">
                Chưa có tài khoản?{' '}
                <Link className="font-semibold text-sky-400" href={mode === 'FEDERATION' ? '/account/register/federation' : '/account/register'}>
                  {mode === 'FEDERATION' ? 'Đăng ký đại diện đơn vị' : 'Tạo tài khoản cá nhân'}
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
