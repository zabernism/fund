'use client';

import { IconCheck, IconClose } from './icons';

type ThemeMode = 'light' | 'dark' | 'system' | 'eye';

export default function SettingsSheet({
  open,
  onClose,
  theme,
  onThemeChange,
  lastUpdated,
  trading,
  refreshMs,
  onClearFunds,
  onClearCosts,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  lastUpdated: Date | null;
  trading: boolean;
  refreshMs: number;
  onClearFunds: () => void;
  onClearCosts: () => void;
  onClearAll: () => void;
}) {
  if (!open) return null;

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: '浅色' },
    { key: 'dark', label: '深色' },
    { key: 'system', label: '跟随系统' },
  ];

  return (
    <div
      className="overlay-fade fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="sheet-up mx-auto w-full max-w-md overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
          <h2 className="text-base font-semibold">设置</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
          >
            <IconClose width={20} height={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="状态" value={trading ? '交易中' : '已收盘'} tone={trading ? 'up' : 'muted'} />
            <Stat
              label="刷新间隔"
              value={`${(refreshMs / 1000).toFixed(0)}秒`}
              tone="primary"
            />
            <Stat
              label="最近更新"
              value={lastUpdated ? lastUpdated.toLocaleTimeString('zh-CN') : '—'}
              tone="muted"
            />
            <Stat label="数据存储" value="本地" tone="muted" />
          </div>

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              主题外观
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((o) => {
                const on = theme === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => onThemeChange(o.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${
                      on
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {on && <IconCheck width={16} height={16} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              数据来源
            </div>
            <ul className="space-y-1.5 text-sm text-[var(--muted)]">
              <li>· 基金实时估值：天天基金</li>
              <li>· 大盘指数：腾讯行情</li>
              <li>· 板块 / 贵金属 / 分时：东方财富</li>
            </ul>
            <p className="mt-2 text-[11px] text-[var(--muted)]/80">
              仅供学习参考，不构成投资建议。
            </p>
          </div>

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              清除数据
            </div>
            <div className="space-y-2">
              <ClearBtn label="清除自选基金" onClick={onClearFunds} />
              <ClearBtn label="清除持仓成本价" onClick={onClearCosts} />
              <ClearBtn label="清除全部本地数据" onClick={onClearAll} danger />
            </div>
          </div>

          <p className="pt-1 text-center text-[11px] text-[var(--muted)]">
            基金行情看板 · v7
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'up' | 'muted' | 'primary';
}) {
  const color =
    tone === 'up'
      ? 'text-up'
      : tone === 'primary'
        ? 'text-primary'
        : 'text-[var(--text)]';
  return (
    <div className="glass-soft px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className={`mt-0.5 font-mono-data text-sm font-semibold ${color}`}>
        {value}
      </div>
    </div>
  );
}

function ClearBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        danger
          ? 'border-up/30 text-up hover:bg-up/10'
          : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-hover)]'
      }`}
    >
      {label}
      <span className="text-xs">›</span>
    </button>
  );
}
