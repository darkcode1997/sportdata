'use client';

import { isValidElement, useEffect, useId, useRef, type ReactNode } from 'react';
import { Button, type AlertProps } from 'antd';
import { useSportDataToast } from '@/hooks/useSportDataToast';

function noticeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(noticeText).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return noticeText(node.props.children);
  return '';
}

/** Render notifications through the current public/CMS toast provider. */
export function ToastNotice({ message, description, action, type = 'info' }: AlertProps) {
  const toast = useSportDataToast();
  const key = useId();
  const previous = useRef<string | null>(null);
  const signature = `${type}:${noticeText(message)}:${noticeText(description)}`;

  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    const detail = typeof description === 'string' && /^Request failed with status code \d+$/.test(description)
      ? 'Vui lòng thử lại sau.'
      : description;
    toast.open({
      key,
      type,
      duration: action ? 0 : type === 'success' ? 4 : 6,
      content: (
        <div className="max-w-lg text-left">
          <div className="font-medium">{message}</div>
          {detail && <div className="mt-1 text-sm opacity-80">{detail}</div>}
          {action && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {action}
              <Button size="small" type="text" onClick={() => toast.destroy(key)}>Đóng</Button>
            </div>
          )}
        </div>
      ),
    });
  }, [action, description, key, message, signature, toast, type]);

  useEffect(() => () => {
    toast.destroy(key);
    previous.current = null;
  }, [key, toast]);

  return null;
}
