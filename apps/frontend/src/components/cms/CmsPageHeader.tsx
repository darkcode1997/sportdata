'use client';

import { Button, Flex, Typography } from 'antd';
import { ArrowLeft, Plus } from 'lucide-react';

type CmsPageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};

export function CmsPageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  backHref,
  icon,
  action,
}: CmsPageHeaderProps) {
  return (
    <Flex vertical gap={14}>
      {backHref && (
        <Button type="link" href={backHref} className="w-fit px-0" icon={<ArrowLeft className="h-4 w-4" />}>
          Quay lại danh sách
        </Button>
      )}
      <Flex justify="space-between" align="flex-end" gap={20} wrap>
        <div>
          <Flex align="center" gap={10}>
            {icon && <span className="text-sblue-400">{icon}</span>}
            <Typography.Title level={2} className="!mb-0 !text-2xl sm:!text-3xl">
              {title}
            </Typography.Title>
          </Flex>
          {description && (
            <Typography.Paragraph type="secondary" className="!mb-0 !mt-2">
              {description}
            </Typography.Paragraph>
          )}
        </div>
        {action || (actionHref && actionLabel && (
          <Button type="primary" size="large" href={actionHref} icon={<Plus className="h-4 w-4" />}>
            {actionLabel}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
}
