'use client';

import { Card, Spin } from 'antd';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <Spin size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'default'} className={className} />;
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded',
        className
      )}
    />
  );
}

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Loading({ text, fullScreen = false, size = 'md' }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-sdark/90 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={size} />
          {text && <p className="text-gray-400 text-sm">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Spinner size={size} />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <Card className="public-surface" styles={{ body: { padding: 16 } }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-10 rounded" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-5 w-32 mb-3 rounded" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex justify-center">
          <Skeleton className="h-4 w-10 rounded" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <Skeleton className="h-4 w-full mt-3 rounded" />
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="public-surface overflow-hidden" styles={{ body: { padding: 0 } }}>
      <Skeleton className="h-40 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full rounded mt-4" />
      </div>
    </Card>
  );
}
