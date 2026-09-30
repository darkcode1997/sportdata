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
  scrollBody?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  scrollBody = true,
}: ModalProps) {
  const sizes = {
    sm: 384,
    md: 448,
    lg: 512,
    xl: 960,
  };

  return (
    <AntModal
      open={isOpen}
      onCancel={onClose}
      title={title}
      footer={footer ?? null}
      width={sizes[size]}
      centered={scrollBody}
      destroyOnHidden
      styles={{
        body: scrollBody
          ? { maxHeight: '75vh', overflowY: 'auto' }
          : { maxHeight: 'none', overflow: 'visible' },
      }}
    >
      {children}
    </AntModal>
  );
}
