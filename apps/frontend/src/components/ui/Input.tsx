'use client';

import { forwardRef } from 'react';
import { Input as AntInput, type InputProps as AntInputProps, type InputRef } from 'antd';
import { cn } from '@/lib/utils';

interface InputProps extends AntInputProps {
  label?: string;
  error?: string;
}

const Input = forwardRef<InputRef, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <AntInput
          ref={ref}
          id={inputId}
          status={error ? 'error' : undefined}
          className={cn('w-full', className)}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
