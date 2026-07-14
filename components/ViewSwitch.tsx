'use client';

export type ViewMode = 'auto' | 'desktop' | 'mobile';

const OPTS: { key: ViewMode; label: string }[] = [
  { key: 'desktop', label: '桌面版' },
  { key: 'mobile', label: '手机版' },
];

export default function ViewSwitch({
  value,
  onChange,
  variant = 'desktop',
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  variant?: 'desktop' | 'mobile';
}) {
  const cls =
    variant === 'desktop'
      ? {
          wrap: 'flex items-center gap-0.5 rounded-full border border-outline-variant bg-surface-container-low/80 p-0.5 shadow-lg backdrop-blur-md',
          on: 'bg-primary text-on-primary',
          off: 'text-on-surface-variant hover:bg-primary-container',
        }
      : {
          wrap: 'flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-0.5 shadow-lg backdrop-blur-md',
          on: 'bg-primary/15 text-primary',
          off: 'text-[var(--muted)] hover:bg-[var(--card-hover)]',
        };

  return (
    <div className={cls.wrap} role="group" aria-label="视图切换">
      {OPTS.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              on ? cls.on : cls.off
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
