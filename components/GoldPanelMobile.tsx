'use client';

import type { GoldQuote, TrendData } from '@/lib/types';
import { formatNum, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';

/** 涨跌配色 — 与 PC 端贵金属面板一致，用 text-market-up / text-market-down */
function pnlColor(v: number | null | undefined): 'text-market-up' | 'text-market-down' | 'text-on-surface-variant' {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

/**
 * 移动端「贵金属」面板 — 视觉严格复用 PC 端 DesktopSidebar 的贵金属区块
 * （参考 index.html 第359-394行）：标题 + 实时 badge、大号价格(display-lg)、
 * 涨跌额/涨跌幅(display-sm)、走势占位(h-24)、最高/最低统计(grid-cols-2)。
 * 用 M3 角色令牌，随 data-theme 自适应浅色/深色。
 */
export default function GoldPanelMobile({
  gold,
  trends,
  loading,
}: {
  gold: GoldQuote[];
  trends: Record<string, TrendData>;
  loading?: boolean;
}) {
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

      <div className="flex flex-col gap-4 p-4">
        {gold.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            {loading ? '贵金属行情加载中…' : '贵金属行情暂不可用'}
          </p>
        )}
        {gold.map((g) => {
          const cls = pnlColor(g.changePct);
          const trend = trends[g.secid];
          return (
            <div key={g.secid} className="flex flex-col gap-3">
              {/* 名称 + 大号价格 + 涨跌额/涨跌幅 */}
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
                  <div className={`font-data-mono text-body-md ${cls}`}>
                    {g.changePct != null ? formatPct(g.changePct) : '—'}
                  </div>
                </div>
              </div>

              {/* 走势区域 — 匹配参考 h-24 占位 */}
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

              {/* 最高 / 最低 统计 — 匹配参考 grid-cols-2 */}
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
        })}
      </div>
    </section>
  );
}
