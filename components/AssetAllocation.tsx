'use client';

import type { FundEstimate, FundCost } from '@/lib/types';
import { formatNum } from '@/lib/format';

type Group = { key: string; label: string; color: string };

const GROUPS: Group[] = [
  { key: 'semi', label: '半导体芯片', color: 'var(--primary)' },
  { key: 'liquor', label: '白酒消费', color: 'var(--cost)' },
  { key: 'ai', label: '人工智能', color: 'var(--market-up)' },
  { key: 'other', label: '其他', color: 'var(--muted)' },
];

/** 按基金名称粗略归类（项目不按板块记录持仓占比，只能按名称推断） */
function classify(name: string): string {
  if (/半导体|芯片/.test(name)) return 'semi';
  if (/白酒|消费|食品|饮料|酒/.test(name)) return 'liquor';
  if (/人工智能|AI|科技|新能源|电子|信息|互联网|智能/.test(name)) return 'ai';
  return 'other';
}

/**
 * 资产配置分布。
 * - 未设置成本价：渲染干净的占位卡，说明接入方式。
 * - 已设置成本价：按基金名称归类，用真实市值估算各分类占比。
 */
export default function AssetAllocation({
  funds,
  costMap,
  hasCost,
}: {
  funds: Record<string, FundEstimate>;
  costMap: Record<string, FundCost>;
  hasCost: boolean;
}) {
  if (!hasCost) {
    return (
      <section className="glass p-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            资产配置分布
          </h2>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
          在「持仓」中为基金填写持有金额与盈亏后，将按基金名称自动归类
          （半导体芯片 / 白酒消费 / 人工智能 / 其他），估算各分类的市值占比。
        </p>
      </section>
    );
  }

  const mvByGroup: Record<string, number> = {
    semi: 0,
    liquor: 0,
    ai: 0,
    other: 0,
  };
  let total = 0;
  Object.keys(funds).forEach((code) => {
    const f = funds[code];
    const c = costMap[code];
    if (c?.amount != null) {
      mvByGroup[classify(f?.name || code)] += c.amount;
      total += c.amount;
    }
  });

  const segs = GROUPS.map((g) => ({
    ...g,
    mv: mvByGroup[g.key],
    pct: total > 0 ? (mvByGroup[g.key] / total) * 100 : 0,
  })).filter((s) => s.mv > 0);

  return (
    <section className="glass p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            资产配置分布
          </h2>
        </div>
        <span className="text-[10px] text-[var(--muted)]">按持仓市值估算</span>
      </div>

      {/* 占比条 */}
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--card-hover)]">
        {segs.map((s) => (
          <div
            key={s.key}
            style={{ width: `${s.pct}%`, background: s.color }}
            className="h-full transition-all"
          />
        ))}
      </div>

      {/* 图例 */}
      <div className="mt-3 grid grid-cols-2 gap-y-2">
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="truncate text-[10px] text-[var(--muted)]">
              {s.label}
            </span>
            <span className="ml-auto font-mono-data text-[11px] text-[var(--text)]">
              {s.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-[var(--border)] pt-2 text-right font-mono-data text-[11px] text-[var(--muted)]">
        合计市值 ¥{formatNum(total)}
      </div>
    </section>
  );
}
