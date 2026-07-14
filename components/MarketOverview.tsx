'use client';

import type { IndexQuote, TrendData } from '@/lib/types';
import { changeColor, formatNum, formatPct } from '@/lib/format';
import FlashNum from './FlashNum';
import Sparkline from './Sparkline';

/** 腾讯指数代码（sh/sz 前缀）→ 东方财富分时 secid */
function toEmSecid(c: string): string {
  return `${c.startsWith('sh') ? '1' : '0'}.${c.slice(2)}`;
}

export default function MarketOverview({
  indices,
  loading,
  trends,
}: {
  indices: IndexQuote[];
  loading: boolean;
  trends?: Record<string, TrendData>;
}) {
  if (loading && indices.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-2xl bg-[var(--card-hover)]"
          />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">主要指数</h2>
        <span className="ml-auto font-mono-data text-[10px] text-[var(--muted)]">
          A股 · 港股通
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {indices.map((idx) => {
          const up = idx.change > 0;
          const down = idx.change < 0;
          const accent = up ? 'text-up' : down ? 'text-down' : 'text-flat';
          const trend = trends?.[toEmSecid(idx.code)];
          return (
            <div
              key={idx.code}
              className="glass relative overflow-hidden px-3.5 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-xs font-medium text-[var(--muted)]">
                  {idx.name}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono-data text-[11px] font-semibold ${up ? 'bg-up/10 text-up' : down ? 'bg-down/10 text-down' : 'bg-[var(--card-hover)] text-[var(--muted)]'}`}
                >
                  {formatPct(idx.changePct)}
                </span>
              </div>

              <div
                className={`mt-2 font-mono-data text-[24px] font-semibold leading-none tracking-tight ${accent}`}
              >
                <FlashNum value={idx.current}>
                  {formatNum(idx.current)}
                </FlashNum>
              </div>

              <div className="mt-1.5 flex items-end justify-between gap-2">
                <div className="font-mono-data text-[10px] leading-tight text-[var(--muted)] tabular-nums">
                  高 {formatNum(idx.high)}
                  <br />
                  低 {formatNum(idx.low)}
                </div>
                <div className="h-7 w-16 shrink-0">
                  {trend ? (
                    <Sparkline trend={trend} width={64} height={28} />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
