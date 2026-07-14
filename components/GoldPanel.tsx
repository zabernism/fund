'use client';

import type { GoldQuote, TrendData } from '@/lib/types';
import { changeColor, formatGoldPrice, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';
import { IconCoins } from './icons';

export default function GoldPanel({
  gold,
  trends,
  loading,
}: {
  gold: GoldQuote[];
  trends: Record<string, TrendData>;
  loading: boolean;
}) {
  if (loading && gold.length === 0) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--card-hover)]" />;
  }

  if (gold.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
        黄金行情暂不可用（接口可能限流，稍后自动重试）
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {gold.map((g) => {
        const trend = trends[g.secid];
        return (
          <div key={g.secid} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cost/15 text-cost">
              <IconCoins width={18} height={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text)]">
                {g.name}
              </div>
              <div className="font-mono-data text-[11px] text-[var(--muted)] tabular-nums">
                {g.prevClose != null
                  ? `昨收 ${formatGoldPrice(g.prevClose)}`
                  : g.market}
              </div>
            </div>
            <div className="shrink-0">
              <Sparkline trend={trend} width={64} height={28} />
            </div>
            <div className="w-[88px] shrink-0 text-right">
              <div className="font-mono-data text-[15px] font-semibold tabular-nums">
                {formatGoldPrice(g.price)}
              </div>
              <div
                className={`font-mono-data text-xs ${changeColor(g.changePct)}`}
              >
                {formatPct(g.changePct)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
