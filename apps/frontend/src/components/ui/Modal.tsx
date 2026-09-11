'use client';

import { ReactNode } from 'react';
import { Modal as AntModal } from 'antd';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const sizes = {
    sm: 384,
    md: 448,
    lg: 512,
    xl: 672,
  };

  return (
    <AntModal
      open={isOpen}
      onCancel={onClose}
      title={title}
      footer={footer ?? null}
      width={sizes[size]}
      centered
      destroyOnHidden
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
    >
      {children}
    </AntModal>
  );
}
