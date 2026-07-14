'use client';

import type { ReactNode } from 'react';
import type { GoldQuote, TrendData } from '@/lib/types';
import { changeColor, formatGoldPrice, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';
import { IconCoins } from './icons';

/* —— 内联图标（icons.tsx 未提供的品类图标，直接写在本文件内） —— */
function IconGlobe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" />
    </svg>
  );
}
function IconCurrency({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M7.5 7.5l4.5-4.5 4.5 4.5M7.5 16.5l4.5 4.5 4.5-4.5" />
    </svg>
  );
}
function IconOil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c3 3 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6 5-9Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}
function IconSilver({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

type PlaceholderCommodity = {
  key: string;
  name: string;
  sub: string;
  icon: ReactNode;
};

const PLACEHOLDERS: PlaceholderCommodity[] = [
  { key: 'nasdaq', name: '纳斯达克', sub: '美股', icon: <IconGlobe className="h-[18px] w-[18px]" /> },
  { key: 'usdcny', name: '美元离岸', sub: '汇率', icon: <IconCurrency className="h-[18px] w-[18px]" /> },
  { key: 'brent', name: '布伦特原油', sub: '原油', icon: <IconOil className="h-[18px] w-[18px]" /> },
  { key: 'silver', name: 'COMEX白银', sub: '白银', icon: <IconSilver className="h-[18px] w-[18px]" /> },
];

function CommodityCard({
  name,
  sub,
  icon,
  real,
  price,
  changePct,
  trend,
}: {
  name: string;
  sub: string;
  icon: ReactNode;
  real: boolean;
  price: string | null;
  changePct: number | null;
  trend: TrendData | null;
}) {
  return (
    <div
      className={`glass flex items-center gap-3 px-3 py-3 ${
        real ? 'ring-1 ring-cost/40' : ''
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          real ? 'bg-cost/15 text-cost' : 'bg-[var(--card-hover)] text-[var(--muted)]'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {sub}
        </div>
        <div className="truncate text-sm font-medium text-[var(--text)]">
          {name}
        </div>
        {real && price ? (
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-mono-data text-[15px] font-semibold tabular-nums">
              {price}
            </span>
            <span className={`font-mono-data text-xs ${changeColor(changePct)}`}>
              {formatPct(changePct)}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-[var(--muted)]">暂无实时数据</div>
        )}
      </div>
      {real && trend && (
        <div className="h-7 w-14 shrink-0">
          <Sparkline trend={trend} width={56} height={28} />
        </div>
      )}
    </div>
  );
}

/**
 * 全球大宗商品。
 * - COMEX 黄金：使用项目已有的真实黄金行情数据（gold）。
 * - 纳斯达克 / 美元离岸 / 布伦特原油 / COMEX 白银：项目暂无实时接口，
 *   仅做清晰标注的占位卡，不编造任何数字。
 */
export default function GlobalAssets({
  gold,
  trends,
  loading,
}: {
  gold: GoldQuote[];
  trends: Record<string, TrendData>;
  loading: boolean;
}) {
  const goldQuote =
    gold.find((g) => /黄金|COMEX|金/.test(g.name)) ?? null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">全球大宗商品</h2>
        <span className="ml-auto text-[10px] text-[var(--muted)]">
          {goldQuote ? '黄金实时' : loading ? '加载中' : '占位展示'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <CommodityCard
          name="COMEX黄金"
          sub="黄金"
          icon={<IconCoins width={18} height={18} />}
          real={!!goldQuote}
          price={goldQuote ? formatGoldPrice(goldQuote.price) : null}
          changePct={goldQuote?.changePct ?? null}
          trend={goldQuote ? trends[goldQuote.secid] ?? null : null}
        />
        {PLACEHOLDERS.map((c) => (
          <CommodityCard
            key={c.key}
            name={c.name}
            sub={c.sub}
            icon={c.icon}
            real={false}
            price={null}
            changePct={null}
            trend={null}
          />
        ))}
      </div>

      <p className="mt-2 px-1 text-[11px] leading-relaxed text-[var(--muted)]">
        仅黄金为实时数据；其余大宗商品项目暂未接入接口，显示为占位。
      </p>
    </section>
  );
}
