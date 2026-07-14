'use client';

import type { ReactNode } from 'react';

export default function Panel({
  title,
  icon,
  right,
  children,
  className = '',
  bodyClass = '',
}: {
  title: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`glass ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h2>
        {right}
      </div>
      <div className={`p-4 ${bodyClass}`}>{children}</div>
    </section>
  );
}
