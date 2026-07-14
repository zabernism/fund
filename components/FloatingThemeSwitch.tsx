'use client';

export type AppTheme = 'light' | 'dark' | 'system' | 'eye';

const OPTIONS: { key: AppTheme; label: string; icon: string }[] = [
  { key: 'dark', label: '深蓝', icon: 'dark_mode' },
  { key: 'light', label: '明亮', icon: 'light_mode' },
  { key: 'eye', label: '护眼', icon: 'visibility' },
];

/**
 * 桌面端浮动主题切换胶囊（参考「智汇金融终端」样式）。
 * 三档：深蓝 / 明亮 / 护眼（eye-care），调用已有的主题设置函数。
 * 颜色全部走 Material 3 角色令牌，随主题翻转。
 */
export default function FloatingThemeSwitch({
  theme,
  onThemeChange,
}: {
  theme: AppTheme;
  onThemeChange: (t: AppTheme) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-outline-variant bg-surface-container-low p-1 shadow-lg backdrop-blur-md">
      {OPTIONS.map((o) => {
        const on = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            title={o.label}
            aria-label={o.label}
            aria-pressed={on}
            onClick={() => onThemeChange(o.key)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              on
                ? 'bg-primary-container text-primary'
                : 'text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{o.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
