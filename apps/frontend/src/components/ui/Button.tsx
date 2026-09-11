'use client';

import { forwardRef } from 'react';
import { Button as AntButton, type ButtonProps as AntButtonProps } from 'antd';
import { cn } from '@/lib/utils';

interface ButtonProps
  extends Omit<AntButtonProps, 'type' | 'size' | 'danger' | 'htmlType' | 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const antType: AntButtonProps['type'] =
      variant === 'primary' || variant === 'danger'
        ? 'primary'
        : variant === 'ghost'
          ? 'text'
          : 'default';
    const antSize: AntButtonProps['size'] =
      size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle';

    return (
      <AntButton
        ref={ref}
        type={antType}
        size={antSize}
        htmlType={type}
        danger={variant === 'danger'}
        ghost={variant === 'outline'}
        className={cn('inline-flex items-center justify-center font-semibold', className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
