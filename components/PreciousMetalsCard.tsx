'use client';

import type { GoldQuote, GoldCategory, TrendData } from '@/lib/types';
import { formatPct, formatNum } from '@/lib/format';
import Sparkline from './Sparkline';

/** 涨跌配色 — A股习惯：涨红跌绿 */
function pnlColor(v: number | null | undefined): string {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

const GROUP_TITLE: Record<GoldCategory, string> = {
  spot: '国际 / 国内',
  bank: '银行纸黄金',
  brand: '金店品牌',
};

/** 贵金属卡片（匹配 redesign-preview.html：lg:col-span-2 主图 + 分组价格列表） */
export default function PreciousMetalsCard({
  gold,
  trends,
  loading,
}: {
  gold: GoldQuote[];
  trends: Record<string, TrendData>;
  loading?: boolean;
}) {
  const spot = gold.filter((g) => (g.category ?? 'spot') === 'spot');
  const bank = gold.filter((g) => g.category === 'bank');
  const brand = gold.filter((g) => g.category === 'brand');
  // 主图：现货（华安已移除，仅剩 COMEX 纽约黄金）
  const main = spot[0];

  return (
    <section className="panel-card p-5 col-span-2">
      {/* 标题 + 连接状态 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: 'var(--al-cost)' }}
          >
            payments
          </span>
          <h2 className="text-base font-bold text-on-surface">贵金属 · 实时</h2>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
          style={{
            color: 'var(--al-tertiary)',
            background: 'color-mix(in srgb, var(--al-tertiary) 14%, transparent)',
          }}
        >
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          {loading ? '连接中' : '已连接'}
        </div>
      </div>

      {/* 主图：选中现货 + 已有走势（无数据展示「暂无分时走势」，绝不空转） */}
      {main && (
        <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--al-sc-high)' }}>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <div className="text-sm text-on-surface-variant">
                {main.name}
                {main.unit ? (
                  <span className="ml-1 text-[10px] opacity-70">{main.unit}</span>
                ) : null}
              </div>
              <div className="font-mono-data text-3xl font-bold text-on-surface">
                {main.price != null ? formatNum(main.price, 2) : '—'}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-mono-data text-lg font-semibold ${pnlColor(main.changePct)}`}
              >
                {main.changePct != null ? formatPct(main.changePct) : '—'}
              </div>
              <div className="text-xs text-on-surface-variant">日内</div>
            </div>
          </div>

          <div className="relative h-[88px] w-full">
            {trends[main.secid] ? (
              <Sparkline trend={trends[main.secid]} height={88} responsive fill />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-label-caps text-on-surface-variant/50">
                  暂无分时走势
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 价格列表：分组（国际 / 国内 · 银行 · 金店），有价即出，不等待 */}
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <GroupList title={GROUP_TITLE.spot} items={spot} />
        <GroupList title={GROUP_TITLE.bank} items={bank} />
        <GroupList title={GROUP_TITLE.brand} items={brand} />
      </div>
    </section>
  );
}

function GroupList({ title, items }: { title: string; items: GoldQuote[] }) {
  return (
    <div>
      <div className="text-label-caps mb-2 text-on-surface-variant">{title}</div>
      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <div className="text-[11px] text-on-surface-variant/60">—</div>
        ) : (
          items.map((g) => (
            <div key={g.secid} className="flex items-center justify-between">
              <span className="text-on-surface-variant">{g.name}</span>
              <span className="font-mono-data tabular-nums text-on-surface">
                {g.price != null ? formatNum(g.price, 2) : '—'}
                {g.changePct != null && (
                  <span className={`ml-1 text-[11px] ${pnlColor(g.changePct)}`}>
                    {formatPct(g.changePct)}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
