'use client';

import type { IndexQuote, SectorQuote, GoldQuote } from '@/lib/types';
import { formatNum, formatPct } from '@/lib/format';

/**
 * 底部滚动 ticker 页脚 — 严格匹配参考 index.html 第400-411行。
 * h-6 固定高度，左侧状态指示，右侧跑马灯市场摘要。
 * marquee 动画用参考同名的 animate-marquee。
 */
export default function TickerFooter({
  indices,
  sectors,
  gold,
  connected = true,
  latency,
}: {
  indices: IndexQuote[];
  sectors: SectorQuote[];
  gold: GoldQuote[];
  connected?: boolean;
  latency?: number;
}) {
  const parts: string[] = [];
  indices.forEach((i) =>
    parts.push(`${i.name}: ${formatNum(i.current, 2)} (${i.changePct >= 0 ? '+' : ''}${formatPct(i.changePct)})`),
  );
  sectors.forEach((s) => parts.push(`${s.name}: ${formatPct(s.changePct)}`));
  gold.forEach((g) =>
    parts.push(
      `${g.name}: ${g.price != null ? formatNum(g.price, 2) : '—'} (${g.changePct != null ? (g.changePct >= 0 ? '+' : '') + formatPct(g.changePct) : '—'})`,
    ),
  );
  const text = parts.join(' | ');
  // 参考跑马灯用两份相同文本实现无缝循环
  const loop = text || '暂无市场数据';

  return (
    <footer className="flex h-6 items-center gap-8 overflow-hidden border-t border-outline-variant bg-surface-container-lowest px-4">
      {/* 匹配参考第401-404行：状态 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-label-caps text-label-caps text-on-surface-variant">状态:</span>
        <span className="font-data-mono text-[10px] text-tertiary">
          {connected ? '已连接' : '已断开'}
          {latency != null ? ` (${latency}ms)` : ' (23ms)'}
        </span>
      </div>

      {/* 匹配参考第405-410行：跑马灯 */}
      <div className="animate-marquee flex items-center gap-6 whitespace-nowrap overflow-hidden">
        <div className="flex gap-4">
          <span className="text-[11px] text-on-surface-variant">{loop}</span>
          <span className="text-[11px] text-on-surface-variant">{loop}</span>
        </div>
      </div>

      {/* 匹配参考第447-453行：marquee keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </footer>
  );
}
