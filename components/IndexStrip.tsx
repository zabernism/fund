'use client';

import type { IndexQuote } from '@/lib/types';
import { formatNum, formatPct, isTradingNow } from '@/lib/format';

/**
 * 全局指数顶部行 — 严格匹配参考 index.html 第181-222行。
 * 5列网格卡片：名称 + 涨跌% + 价格（text-market-up/down）+ 成交额/状态。
 * 上行/下行卡片带 up-flash / down-flash 背景闪烁。
 */
export default function IndexStrip({ indices }: { indices: IndexQuote[] }) {
  if (indices.length === 0) return null;
  return (
    <>
      {indices.map((idx) => {
        const up = (idx.changePct ?? 0) > 0;
        const down = (idx.changePct ?? 0) < 0;
        const flash = up ? 'up-flash' : down ? 'down-flash' : '';
        // 匹配参考：涨用 text-market-up，跌用 text-market-down
        const colorCls = up ? 'text-market-up' : down ? 'text-market-down' : 'text-on-surface-variant';
        // 参考显示成交额或「盘前交易中」
        const subText = isTradingNow()
          ? `成交: ${idx.volume != null ? formatNum(idx.volume, 1) : '—'}亿`
          : idx.time
            ? `${idx.time}`
            : '—';
        return (
          <div
            key={idx.code}
            className={`bg-surface-container rounded-lg border border-outline-variant p-3 ${flash}`}
          >
            <div className="mb-1 flex items-start justify-between">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {idx.name}
              </span>
              <span className={`font-data-mono text-data-mono ${colorCls}`}>
                {formatPct(idx.changePct)}
              </span>
            </div>
            <div className={`font-display-sm text-display-sm ${colorCls}`}>
              {formatNum(idx.current, 2)}
            </div>
            <div className="font-data-mono text-[10px] text-on-surface-variant">
              {subText}
            </div>
          </div>
        );
      })}
    </>
  );
}
