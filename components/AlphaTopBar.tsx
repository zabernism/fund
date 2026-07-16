'use client';

import { useEffect, useState } from 'react';
import FloatingThemeSwitch, { type AppTheme } from './FloatingThemeSwitch';

export default function AlphaTopBar({
  trading,
  onOpenSearch,
  onOpenSettings,
  activeNav = '行情',
  theme,
  onThemeChange,
}: {
  trading: boolean;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  activeNav?: string;
  /** 可选：传入后右上显示浮动主题切换胶囊（保持 page.tsx 调用兼容） */
  theme?: AppTheme;
  onThemeChange?: (t: AppTheme) => void;
}) {
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = ['行情', '基金', '分析', '组合'];

  return (
    <nav className="alpha-navbar sticky top-0 z-50 flex w-full items-center gap-6 border-b border-outline-variant px-6 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <span className="font-display-lg text-gradient-alpha font-black">
          智汇金融终端
        </span>
        <div className="hidden items-center gap-4 lg:flex">
          {navItems.map((n) => {
            const on = n === activeNav;
            return (
              <a
                key={n}
                href="#"
                onClick={(e) => e.preventDefault()}
                className={`flex h-16 items-center border-b-2 px-2 font-bold transition-colors ${
                  on
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {n}
              </a>
            );
          })}
        </div>
      </div>

      <div className="relative mx-8 flex max-w-md flex-1 items-center">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
          search
        </span>
        <button
          onClick={onOpenSearch}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-1.5 pl-10 pr-4 text-left font-body-md text-on-surface-variant transition-all hover:border-secondary focus:outline-none"
        >
          添加基金 / 代码…
        </button>
      </div>

      <div className="flex items-center gap-4">
        {theme && onThemeChange && (
          <FloatingThemeSwitch theme={theme} onThemeChange={onThemeChange} />
        )}

        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-bright px-3 py-1">
          <span className="pulse-indicator" />
          <span className="label-caps text-tertiary">{trading ? '交易中' : '已收盘'}</span>
          <span className="data-sm ml-2 text-on-surface">{clock}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            aria-label="通知"
            className="material-symbols-outlined text-on-surface-variant transition-colors hover:text-primary"
          >
            notifications
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="设置"
            className="material-symbols-outlined text-on-surface-variant transition-colors hover:text-primary"
          >
            settings
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-gradient-to-br from-secondary to-tertiary text-xs font-bold text-on-secondary">
            我
          </div>
        </div>
      </div>
    </nav>
  );
}
