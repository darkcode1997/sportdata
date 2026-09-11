'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Alert, Button, Card, Checkbox, Form, Input, Spin } from 'antd';
import { Eye, EyeOff, Lock, Trophy, UserRound } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Nhập email hoặc username'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('cms_token');

    if (!token) {
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }

    fetch('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Phiên đăng nhập đã hết hạn');
        if (!cancelled) router.replace('/cms');
      })
      .catch(() => {
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_user');
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setGlobalError(null);
    try {
      const response = await axios.post('/api/auth/login', data);
      const { user, accessToken } = response.data;
      localStorage.setItem('cms_token', accessToken);
      localStorage.setItem('cms_user', JSON.stringify(user));
      router.push('/cms');
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Đăng nhập thất bại, vui lòng thử lại';
      setGlobalError(Array.isArray(message) ? message.join('. ') : message);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sdark-950">
        <Spin size="large" tip="Đang tải" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sdark-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sblue-500 to-sblue-700 shadow-lg shadow-sblue-500/30">
            <Trophy className="h-9 w-9 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-slate-100">SportCMS</h1>
          <p className="text-sm text-slate-500">Hệ thống quản lý thể thao</p>
        </div>

        <Card className="border-sdark-700 bg-sdark-900 shadow-2xl shadow-black/20">
          <h2 className="mb-1 text-xl font-bold text-slate-100">Đăng nhập</h2>
          

          {globalError && (
            <Alert
              className="mb-5"
              type="error"
              showIcon
              message="Không thể đăng nhập"
              description={globalError}
            />
          )}

          <Form layout="vertical" requiredMark={false} onFinish={handleSubmit(onSubmit)}>
            <Form.Item
              label="Email hoặc username"
              required
              validateStatus={errors.identifier ? 'error' : undefined}
              help={errors.identifier?.message}
            >
              <Controller
                name="identifier"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="identifier"
                    size="large"
                    autoComplete="username"
                    placeholder="admin hoặc admin@sportdata.vn"
                    prefix={<UserRound className="h-4 w-4 text-slate-500" />}
                    status={errors.identifier ? 'error' : undefined}
                    aria-invalid={Boolean(errors.identifier)}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              required
              validateStatus={errors.password ? 'error' : undefined}
              help={errors.password?.message}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="password"
                    size="large"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    prefix={<Lock className="h-4 w-4 text-slate-500" />}
                    suffix={
                      <Button
                        type="text"
                        size="small"
                        htmlType="button"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        icon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        onClick={() => setShowPassword((current) => !current)}
                      />
                    }
                    status={errors.password ? 'error' : undefined}
                    aria-invalid={Boolean(errors.password)}
                  />
                )}
              />
            </Form.Item>

            <div className="flex items-center justify-between text-sm">
              <Checkbox>Ghi nhớ</Checkbox>
              <Link href="/cms/forgot-password" className="font-medium text-sblue-400 hover:text-sblue-300">
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
          </Form>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-600">
          © 2026 SportData. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
