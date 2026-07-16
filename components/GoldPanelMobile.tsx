'use client';

import type { GoldQuote, GoldCategory, TrendData } from '@/lib/types';
import { formatNum, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';

/** 涨跌配色 — 与 PC 端贵金属面板一致，用 text-market-up / text-market-down */
function pnlColor(v: number | null | undefined): 'text-market-up' | 'text-market-down' | 'text-on-surface-variant' {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

const GROUP_TITLE: Record<GoldCategory, string> = {
  spot: '国际 / 国内金价',
  bank: '银行纸黄金',
  brand: '金店品牌金价',
};

export default function GoldPanelMobile({
  gold,
  trends,
  loading,
}: {
  gold: GoldQuote[];
  trends: Record<string, TrendData>;
  loading?: boolean;
}) {
  const groups: GoldCategory[] = ['spot', 'bank', 'brand'];

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-4">
        <h2 className="font-display-sm text-display-sm text-on-surface">
          贵金属
        </h2>
        <div className="flex items-center gap-1 rounded bg-tertiary-container px-2 py-0.5 text-label-caps text-on-tertiary-container">
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          实时
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {gold.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            {loading ? '贵金属行情加载中…' : '贵金属行情暂不可用'}
          </p>
        )}

        {groups.map((cat) => {
          const items = gold.filter((g) => (g.category ?? 'spot') === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant">
                  {GROUP_TITLE[cat]}
                </h3>
                <div className="h-px flex-1 bg-outline-variant" />
              </div>

              {cat === 'spot'
                ? items.map((g) => (
                    <SpotCard key={g.secid} g={g} trend={trends[g.secid]} />
                  ))
                : items.map((g) => <CompactRow key={g.secid} g={g} />)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SpotCard({ g, trend }: { g: GoldQuote; trend?: TrendData }) {
  const cls = pnlColor(g.changePct);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1 font-body-sm text-body-sm text-on-surface-variant">
            {g.name}
            {g.unit ? <span className="ml-1 text-[10px] opacity-70">{g.unit}</span> : null}
          </div>
          <div className="font-display-lg text-display-lg text-on-surface">
            {g.price != null ? formatNum(g.price, 2) : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-display-sm text-display-sm ${cls}`}>
            {g.change != null ? `+${formatNum(g.change, 2)}` : '—'}
          </div>
          <div className={`font-data-mono text-body-md ${cls}`}>
            {g.changePct != null ? formatPct(g.changePct) : '—'}
          </div>
        </div>
      </div>

      <div className="relative h-24 w-full overflow-hidden rounded border border-outline-variant bg-surface-container">
        {trend ? (
          <div className="absolute inset-0 p-1">
            <Sparkline trend={trend} height={88} responsive fill />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant/40">
              暂无分时走势
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-surface-container p-2">
          <div className="text-[10px] uppercase text-on-surface-variant">最高</div>
          <div className="font-data-mono text-body-md">
            {g.high != null ? formatNum(g.high, 2) : '—'}
          </div>
        </div>
        <div className="rounded bg-surface-container p-2">
          <div className="text-[10px] uppercase text-on-surface-variant">最低</div>
          <div className="font-data-mono text-body-md">
            {g.low != null ? formatNum(g.low, 2) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactRow({ g }: { g: GoldQuote }) {
  const cls = pnlColor(g.changePct);
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-on-surface">
          {g.name}
        </div>
        <div className="font-data-mono text-[10px] text-on-surface-variant tabular-nums">
          {g.unit ?? '元/克'}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-data-mono text-sm font-semibold tabular-nums text-on-surface">
          {g.price != null ? formatNum(g.price, 2) : '—'}
        </div>
        <div className={`font-data-mono text-xs tabular-nums ${cls}`}>
          {g.changePct != null ? formatPct(g.changePct) : '—'}
        </div>
      </div>
    </div>
  );
}
