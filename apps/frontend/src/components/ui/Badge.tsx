'use client';

import { Tag } from 'antd';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const colors: Record<BadgeVariant, string | undefined> = {
  default: undefined,
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'processing',
  primary: 'blue',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <Tag
      color={colors[variant]}
      className={cn('m-0 rounded-full font-semibold', size === 'md' && 'px-3 py-1 text-sm', className)}
    >
      {children}
    </Tag>
  );
}

export function GoldMedalBadge({ count }: { count?: number }) {
  return <Tag color="gold" className="m-0 rounded-full font-bold">🥇 {count ?? 0}</Tag>;
}

export function SilverMedalBadge({ count }: { count?: number }) {
  return <Tag className="m-0 rounded-full font-bold">🥈 {count ?? 0}</Tag>;
}

export function BronzeMedalBadge({ count }: { count?: number }) {
  return <Tag color="orange" className="m-0 rounded-full font-bold">🥉 {count ?? 0}</Tag>;
}
