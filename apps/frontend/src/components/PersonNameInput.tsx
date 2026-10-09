'use client';

import { forwardRef, useRef, type ChangeEvent, type SyntheticEvent } from 'react';
import { Input, type InputProps, type InputRef } from 'antd';
import { capitalizePersonName } from '@/lib/person-name';

export const PersonNameInput = forwardRef<InputRef, InputProps>(function PersonNameInput({
  onChange, onBlur, onCompositionStart, onCompositionEnd, ...props
}, ref) {
  const composing = useRef(false);
  const inputRef = useRef<InputRef | null>(null);

  const normalize = (event: SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const previous = input.value;
    const next = capitalizePersonName(previous);
    if (previous === next) return false;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const field = inputRef.current?.input;
    input.value = next;
    // Both Ant Design Form and react-hook-form receive the normalized value.
    onChange?.(event as ChangeEvent<HTMLInputElement>);
    requestAnimationFrame(() => {
      if (field && document.activeElement === field && start !== null && end !== null) {
        field.setSelectionRange(start, end);
      }
    });
    return true;
  };

  return <Input
    {...props}
    ref={value => {
      inputRef.current = value;
      if (typeof ref === 'function') ref(value);
      else if (ref) ref.current = value;
    }}
    autoCapitalize="words"
    onChange={event => {
      const isComposing = 'isComposing' in event.nativeEvent && event.nativeEvent.isComposing;
      if (composing.current || isComposing || !normalize(event)) onChange?.(event);
    }}
    onCompositionStart={event => {
      composing.current = true;
      onCompositionStart?.(event);
    }}
    onCompositionEnd={event => {
      composing.current = false;
      normalize(event);
      onCompositionEnd?.(event);
    }}
    onBlur={event => {
      composing.current = false;
      normalize(event);
      onBlur?.(event);
    }}
  />;
});
