'use client';

import { IconRefresh, IconSearch } from './icons';
import ViewSwitch, { type ViewMode } from './ViewSwitch';

export default function TopAppBar({
  trading,
  lastUpdated,
  onSearch,
  onRefresh,
  refreshing,
  view,
  onViewChange,
}: {
  trading: boolean;
  lastUpdated: Date | null;
  onSearch: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  view: 'auto' | 'desktop' | 'mobile';
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 glass border-x-0 border-t-0 rounded-none">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-up/80 to-cost/80 text-[13px] font-bold text-white">
            行
          </span>
          <div className="leading-none">
            <div className="text-[15px] font-bold tracking-tight">
              行情终端<span className="text-primary">·A</span>
            </div>
            <div className="-mt-0.5 text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
              行情控制台
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="刷新"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)] disabled:opacity-60"
          >
            <span className={refreshing ? 'spin inline-flex' : 'inline-flex'}>
              <IconRefresh width={18} height={18} />
            </span>
          </button>

          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              trading
                ? 'bg-up/10 text-up'
                : 'bg-[var(--card-hover)] text-[var(--muted)]'
            }`}
            title={
              lastUpdated
                ? `上次更新 ${lastUpdated.toLocaleTimeString('zh-CN')}`
                : '加载中'
            }
          >
            <span className={`live-dot ${trading ? '' : 'closed'}`} />
            {trading ? '实时交易' : '已收盘'}
          </span>

          {/* 视图切换：手机 ↔ 桌面 */}
          <ViewSwitch value={view} onChange={onViewChange} variant="mobile" />

          <button
            onClick={onSearch}
            aria-label="搜索"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--card-hover)] text-[var(--text)] transition-colors hover:bg-[var(--card-hover)]/70"
          >
            <IconSearch width={19} height={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
