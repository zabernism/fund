'use client';

const THEME_CYCLE = ['light', 'dark', 'eye'] as const;
type ThemeName = (typeof THEME_CYCLE)[number];

/** PC 端三个导航页面 */
export type DesktopNavTab = 'holdings' | 'ranking' | 'markets';

const NAV_ITEMS: { key: DesktopNavTab; icon: string; label: string }[] = [
  { key: 'holdings', icon: 'account_balance_wallet', label: '我的持仓' },
  { key: 'ranking', icon: 'show_chart', label: '行情' },
  { key: 'markets', icon: 'explore', label: '发现' },
];

/** 桌面端左侧 76px 垂直导航栏（ViewSwitch 已移至右上角 Header） */
export default function DesktopNavRail({
  theme,
  onThemeChange,
  onOpenSettings,
  activeNav,
  onNavChange,
}: {
  theme: string;
  onThemeChange: (t: ThemeName) => void;
  onOpenSettings: () => void;
  activeNav: DesktopNavTab;
  onNavChange: (tab: DesktopNavTab) => void;
}) {
  const nextTheme = () => {
    const i = THEME_CYCLE.indexOf(theme as ThemeName);
    onThemeChange(THEME_CYCLE[(i + 1) % THEME_CYCLE.length]);
  };
  const themeIcon =
    theme === 'dark' ? 'light_mode' : theme === 'eye' ? 'visibility' : 'dark_mode';

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center border-r border-outline-variant bg-surface py-5">
      {/* Logo */}
      <div
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{ background: 'var(--al-primary)', color: 'var(--al-on-primary)' }}
      >
        <span className="material-symbols-outlined text-[22px]">monitoring</span>
      </div>

      {/* 三个导航点 */}
      <nav className="flex w-full flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => (
          <NavDot
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={activeNav === item.key}
            onClick={() => onNavChange(item.key)}
          />
        ))}
      </nav>

      {/* 底部：主题切换 + 设置 */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={nextTheme}
          title={`主题切换（当前：${theme}）`}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[24px]">{themeIcon}</span>
        </button>
        <button
          onClick={onOpenSettings}
          title="设置"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>
      </div>
    </aside>
  );
}

function NavDot({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={label}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl transition-colors ${
        active
          ? 'bg-primary-container text-on-primary-container'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
  );
}
