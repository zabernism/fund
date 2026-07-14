'use client';

import type {
  SectorWatchItem,
  SectorQuote,
  GoldQuote,
  TrendData,
} from '@/lib/types';
import { formatPct, formatNum } from '@/lib/format';
import Sparkline from './Sparkline';

/** 腾讯指数代码（sh/sz 前缀）→ 东方财富分时 secid（market.code） */
export function toEmSecid(c: string): string {
  return `${c.startsWith('sh') ? '1' : '0'}.${c.slice(2)}`;
}

/** 涨跌配色 — 匹配参考用 text-market-up / text-market-down */
function pnlColor(v: number | null | undefined): 'text-market-up' | 'text-market-down' | 'text-on-surface-variant' {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

/** 涨跌幅 → 进度条宽度（封顶 10% 对应满格） */
function barWidth(pct: number | null | undefined): number {
  if (pct == null) return 0;
  return (Math.min(Math.abs(pct), 10) / 10) * 100;
}

export default function DesktopSidebar({
  sectors,
  sectorQuotes,
  trends,
  gold,
  onRemoveSector,
}: {
  sectors: SectorWatchItem[];
  sectorQuotes: Record<string, SectorQuote>;
  trends: Record<string, TrendData>;
  gold: GoldQuote[];
  onRemoveSector: (code: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-gutter">
      {/* 热门板块 — 匹配参考第312-357行：卡片式列表 + 进度条 */}
      <section className="flex h-1/2 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-4">
          <h2 className="font-display-sm text-display-sm text-on-surface">
            热门板块
          </h2>
          <span className="material-symbols-outlined cursor-pointer text-on-surface-variant">
            more_vert
          </span>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <div className="grid grid-cols-1 gap-2">
            {sectors.length === 0 && (
              <p className="p-6 text-center text-body-md text-on-surface-_variant">
                在顶部搜索添加板块
              </p>
            )}
            {sectors.map((s) => {
              const q = sectorQuotes[s.code];
              const pct = q?.changePct;
              const cls = pnlColor(pct);
              const w = barWidth(pct);
              const barCls = (pct ?? 0) > 0 ? 'bg-market-up' : (pct ?? 0) < 0 ? 'bg-market-down' : 'bg-on-surface-variant';
              return (
                <div
                  key={s.code}
                  className="cursor-pointer rounded border border-outline-variant bg-surface-container p-3 transition-all hover:bg-surface-container-highest"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body-md text-body-md text-on-surface">{s.name}</span>
                    <span className={`font-data-mono text-data-mono ${cls}`}>
                      {pct != null ? formatPct(pct) : '—'}
                    </span>
                  </div>
                  {/* 匹配参考第324行：进度条 */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container-lowest">
                    <div className={`h-full ${barCls}`} style={{ width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 贵金属 — 匹配参考第359-394行：大号价格 + 走势 + 高/低统计 */}
      <section className="flex h-1/2 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-4">
          <h2 className="font-display-sm text-display-sm text-on-surface">
            贵金属
          </h2>
          <div className="flex items-center gap-1 rounded bg-tertiary-container px-2 py-0.5 text-label-caps text-on-tertiary-container">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            实时
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {gold.length === 0 && (
            <p className="flex flex-1 items-center justify-center text-body-md text-on-surface-variant">
              贵金属行情加载中…
            </p>
          )}
          {gold.map((g) => {
            const cls = pnlColor(g.changePct);
            const trend = trends[g.secid];
            return (
              <div key={g.secid} className="flex flex-1 flex-col gap-4">
                {/* 匹配参考第368-377行：名称 + 大号价格 + 涨跌额/涨跌幅 */}
                <div className="flex items-end justify-between">
                  <div>
                    <div className="mb-1 font-body-sm text-body-sm text-on-surface-variant">
                      {g.name}
                    </div>
                    <div className="font-display-lg text-display-lg text-on-surface">
                      {g.price != null ? formatNum(g.price, 2) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display-sm text-display-sm ${cls}`}>
                      {g.change != null ? `+${formatNum(g.change, 2)}` : '—'}
                    </div>
                    <div className={`font-data-mono text-data-mono text-body-md ${cls}`}>
                      {g.changePct != null ? formatPct(g.changePct) : '—'}
                    </div>
                  </div>
                </div>

                {/* 匹配参考第378-382行：走势区域 */}
                <div className="relative h-24 w-full overflow-hidden rounded border border-outline-variant bg-surface-container">
                  {trend ? (
                    <div className="absolute inset-0 p-1">
                      <Sparkline trend={trend} height={88} responsive fill />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center label-caps text-on-surface-variant">
                      价格走势实时分析...
                    </div>
                  )}
                </div>

                {/* 匹配参考第383-392行：高/低统计（非涨跌额/涨跌幅） */}
                <div className="mt-auto grid grid-cols-2 gap-2">
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
          })}
        </div>
      </section>
    </div>
  );
}
