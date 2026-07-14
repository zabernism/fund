'use client';

import { changeColor, formatNum, formatPct } from '@/lib/format';

export default function HoldingsCard({
  hasCost,
  totalProfit,
  totalPct,
  marketValue,
  todayPnL,
  todayPct,
  upCount,
  downCount,
}: {
  hasCost: boolean;
  totalProfit: number;
  totalPct: number;
  marketValue: number;
  todayPnL: number;
  todayPct: number;
  upCount: number;
  downCount: number;
}) {
  if (!hasCost) {
    return (
      <section className="glass px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              累计盈亏（估算）
            </div>
            <div className="mt-1 text-sm font-medium text-[var(--text)]">
              未设置成本价
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium font-mono-data">
            <span className="text-up">▲ {upCount}</span>
            <span className="text-down">▼ {downCount}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          在「持仓」中为基金填写成本价与份额，即可查看累计收益与今日盈亏。
        </p>
      </section>
    );
  }

  const profitColor = changeColor(totalProfit);
  const todayColor = changeColor(todayPnL);

  return (
    <section className="glass relative overflow-hidden px-4 py-4">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            累计盈亏（估算）
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
              totalPct >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
            }`}
          >
            {formatPct(totalPct)} 收益率
          </span>
        </div>

        <div
          className={`mt-1 font-mono-data text-[30px] font-bold leading-none ${profitColor}`}
        >
          {totalProfit >= 0 ? '+' : ''}¥{formatNum(totalProfit)}
        </div>

        <div className="mt-4 flex gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              持仓市值
            </div>
            <div className="mt-0.5 font-mono-data text-[15px] font-semibold tabular-nums">
              ¥{formatNum(marketValue)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              当日盈亏
            </div>
            <div
              className={`mt-0.5 font-mono-data text-[15px] font-semibold tabular-nums ${todayColor}`}
            >
              {todayPnL >= 0 ? '+' : ''}¥{formatNum(todayPnL)}
              <span className="ml-1 text-xs font-normal">
                {formatPct(todayPct)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
