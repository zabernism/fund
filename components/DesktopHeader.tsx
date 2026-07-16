'use client';

import ViewSwitch, { type ViewMode } from './ViewSwitch';

/** 桌面端顶栏：基金看板 + 搜索 + 右上角（桌面版徽标 + 视图切换） */
export default function DesktopHeader({
  onSearch,
  lastUpdated,
  view,
  onViewChange,
}: {
  onSearch: () => void;
  lastUpdated: Date | null;
  view: 'auto' | 'desktop' | 'mobile';
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-outline-variant px-6 py-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-on-surface">基金看板</h1>
        <p className="text-xs text-on-surface-variant">智汇金融终端 · 实时</p>
      </div>

      {/* 搜索 chip */}
      <button
        onClick={onSearch}
        className="ml-2 hidden max-w-md flex-1 items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high sm:flex"
      >
        <span className="material-symbols-outlined text-[18px]">search</span>
        <span className="flex-1 text-left">添加基金 / 代码…</span>
        <span className="material-symbols-outlined text-[18px] opacity-50">add</span>
      </button>

      {/* 右上角：桌面/手机切换 + 当前模式标识 */}
      <div className="ml-auto flex items-center gap-2">
        <ViewSwitch value={view} onChange={onViewChange} variant="desktop" />
        <div
          className="flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1.5 text-xs text-on-surface-variant"
          title={lastUpdated ? `最近更新：${lastUpdated.toLocaleTimeString('zh-CN')}` : '实时连接'}
        >
          <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
          {view === 'mobile' ? '手机版' : '桌面版'}
        </div>
      </div>
    </header>
  );
}
