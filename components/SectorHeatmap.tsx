'use client';

import type { SectorQuote, SectorWatchItem, TrendData } from '@/lib/types';
import { changeColor, formatPct, formatInflow } from '@/lib/format';
import Sparkline from './Sparkline';

export default function SectorHeatmap({
  sectors,
  quotes,
  trends,
}: {
  sectors: SectorWatchItem[];
  quotes: Record<string, SectorQuote>;
  trends?: Record<string, TrendData>;
}) {
  if (sectors.length === 0) {
    return (
      <div className="glass-soft px-4 py-5 text-center text-xs text-[var(--muted)]">
        还没有自选板块 · 点右上搜索图标添加（如「半导体」）
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {sectors.map((s) => {
        const q = quotes[s.code];
        const pct = q?.changePct;
        const inflow = q?.mainNetInflow;
        const flowColor =
          inflow == null
            ? 'text-[var(--muted)]'
            : inflow >= 0
              ? 'text-up'
              : 'text-down';
        const trend = trends?.[`90.${s.code}`];
        return (
          <div key={s.code} className="flex items-center gap-3 px-1 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text)]">
                {q?.name || s.name}
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                {s.type === 'industry' ? '行业' : '概念'}
              </div>
            </div>

            <div className="h-7 w-14 shrink-0">
              {trend ? (
                <Sparkline trend={trend} width={56} height={28} />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="w-[60px] shrink-0 text-right font-mono-data text-sm font-semibold">
              <span className={changeColor(pct)}>
                {pct != null ? formatPct(pct) : '--'}
              </span>
            </div>

            <div className={`w-[72px] shrink-0 text-right`}>
              <div className={`font-mono-data text-[12px] ${flowColor}`}>
                {inflow != null ? formatInflow(inflow) : '—'}
              </div>
              <div className="text-[9px] text-[var(--muted)]">主力净流入</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
