'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 数值变化时闪烁一下（涨红跌绿），营造实时行情终端感。
 * 始终带极小的内边距，避免闪烁时布局抖动。
 */
export default function FlashNum({
  value,
  className = '',
  children,
}: {
  value: number | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const prev = useRef<number | null | undefined>(value);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (
      value != null &&
      prev.current != null &&
      value !== prev.current
    ) {
      const up = value > prev.current;
      setFlash(up ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlash(''), 650);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <span className={`flash-cell ${flash} ${className}`}>{children}</span>
  );
}
