'use client';

import { Pagination as AntPagination } from 'antd';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <AntPagination
      current={currentPage}
      total={totalPages}
      pageSize={1}
      showSizeChanger={false}
      onChange={onPageChange}
      className={cn('flex justify-center', className)}
    />
  );
}
