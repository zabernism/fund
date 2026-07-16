'use client';

import { useState } from 'react';
import type { FundRankItem } from '@/lib/types';
import { changeColor, formatNum, formatPct } from '@/lib/format';
import { IconTrendingUp, IconTrendingDown } from './icons';

const SECTOR_COLORS: Record<string, string> = {
  'AI科技': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  '半导体': 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  '白酒消费': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  '医药健康': 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  '新能源': 'bg-green-500/15 text-green-600 dark:text-green-400',
  '军工': 'bg-red-500/15 text-red-600 dark:text-red-400',
  '金融地产': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  '红利低波': 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  '港股': 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  '债券': 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
  '商品': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  '指数增强': 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  '其他': 'bg-[var(--muted)]/15 text-[var(--muted)]',
};

export default function FundRanking({
  gainers,
  losers,
  loading,
}: {
  gainers: FundRankItem[];
  losers: FundRankItem[];
  loading?: boolean;
}) {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const list = tab === 'gainers' ? gainers : losers;

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
      {/* 标题栏 + 切换 */}
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-4">
        <h2 className="font-display-sm text-display-sm text-on-surface">
          基金涨跌榜
        </h2>
        <div className="flex rounded-lg bg-surface-container p-0.5">
          <button
            onClick={() => setTab('gainers')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              tab === 'gainers'
                ? 'bg-market-up text-white'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            涨幅榜
          </button>
          <button
            onClick={() => setTab('losers')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              tab === 'losers'
                ? 'bg-market-down text-white'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            跌幅榜
          </button>
        </div>
      </div>

      {/* 列表内容 */}
      <div className="p-3">
        {loading && list.length === 0 ? (
          <div className="flex h-40 items-center justify-center label-caps text-on-surface-variant">
            加载排行榜…
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-body-md text-on-surface-variant">
            暂无数据（非交易时段或接口限流）
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((item, idx) => (
              <FundRankRow key={item.code} item={item} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .rank-bar-bg {
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 3px,
            rgba(128,128,128,0.06) 3px,
            rgba(128,128,128,0.06) 6px
          );
        }
      `}</style>
    </section>
  );
}

function FundRankRow({ item, rank }: { item: FundRankItem; rank: number }) {
  const pctColor = changeColor(item.changePct);
  const r30Color = changeColor(item.return30d);
  const sectorCls = SECTOR_COLORS[item.sector] || SECTOR_COLORS['其他'];
  const isGain = item.changePct != null && item.changePct > 0;

  return (
    <div className="group flex items-center gap-3 rounded-lg bg-surface-container p-3 transition-colors hover:bg-surface-container-high">
      {/* 排名 + 方向图标 */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
            isGain ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
          }`}
        >
          {isGain ? (
            <IconTrendingUp width={14} height={14} />
          ) : (
            <IconTrendingDown width={14} height={14} />
          )}
        </span>
        <span className="ml-1 font-mono-data text-[11px] font-semibold text-on-surface-variant">
          #{rank}
        </span>
      </div>

      {/* 名称 + 板块标签 */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-on-surface leading-tight">
          {item.name}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] font-mono-data text-on-surface-variant tabular-nums">
            {item.code}
          </span>
          <span
            className={`inline-block rounded px-1.5 py-px text-[10px] font-medium ${sectorCls}`}
          >
            {item.sector}
          </span>
        </div>
      </div>

      {/* 当日涨跌幅（大号，明确标注“当日”） */}
      <div className="shrink-0 text-right">
        <div className="mb-0.5 text-[9px] uppercase tracking-wide text-on-surface-variant">
          当日
        </div>
        <div className={`font-mono-data text-sm font-bold tabular-nums ${pctColor}`}>
          {formatPct(item.changePct)}
        </div>
        <div className="mt-0.5 font-mono-data text-[11px] text-on-surface-variant tabular-nums">
          净值 {item.nav != null ? formatNum(item.nav, 4) : '—'}
        </div>
      </div>

      {/* 近30日收益条 */}
      <div className="hidden w-28 shrink-0 sm:block">
        <div className="mb-0.5 text-[9px] uppercase tracking-wide text-on-surface-variant">
          近30日
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full rank-bar-bg">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
              (item.return30d ?? 0) >= 0
                ? 'bg-up/70'
                : 'bg-down/70'
            }`}
            style={{
              width: `${Math.min(Math.abs(item.return30d ?? 0), 50) * 2}%`,
            }}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center text-[9px] font-mono-data tabular-nums ${r30Color}`}
          >
            {item.return30d != null ? formatPct(item.return30d) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
