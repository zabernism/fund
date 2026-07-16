'use client';

import type { ReactNode } from 'react';
import { IconGrid, IconSettings, IconWallet, IconSparkles } from './icons';

export type TabKey = 'markets' | 'holdings' | 'ai' | 'settings';

const ITEMS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'markets', label: '行情', icon: <IconGrid width={22} height={22} /> },
  { key: 'holdings', label: '持仓', icon: <IconWallet width={22} height={22} /> },
  { key: 'ai', label: '智能', icon: <IconSparkles width={22} height={22} /> },
  { key: 'settings', label: '设置', icon: <IconSettings width={22} height={22} /> },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 glass border-x-0 border-b-0 rounded-none">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {ITEMS.map((it) => {
          const on = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                on ? 'text-primary' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              aria-current={on ? 'page' : undefined}
            >
              {on && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
              {it.icon}
              <span className="text-[10px] font-medium tracking-wide">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
