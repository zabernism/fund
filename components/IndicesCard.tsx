'use client';

import type { IndexQuote } from '@/lib/types';
import { formatPct, formatNum } from '@/lib/format';

/** 涨跌配色 — A股习惯：涨红跌绿 */
function pnlColor(v: number | null | undefined): string {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

/** 主要指数卡片（匹配 redesign-preview.html：竖向列表，名称 + 现价/涨跌） */
export default function IndicesCard({
  indices,
  loading,
}: {
  indices: IndexQuote[];
  loading?: boolean;
}) {
  return (
    <section className="panel-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ color: 'var(--al-primary)' }}
        >
          insights
        </span>
        <h2 className="text-base font-bold text-on-surface">主要指数</h2>
      </div>

      <div className="flex flex-col">
        {indices.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-body-md text-on-surface-variant">
            {loading ? '指数加载中…' : '暂无指数数据'}
          </div>
        ) : (
          indices.map((idx, i) => (
            <div
              key={idx.code}
              className={`flex items-center justify-between py-2 ${
                i < indices.length - 1 ? 'border-b border-outline-variant' : ''
              }`}
            >
              <span className="text-on-surface">{idx.name}</span>
              <span className={`font-mono-data tabular-nums ${pnlColor(idx.changePct)}`}>
                {idx.current != null ? formatNum(idx.current, 2) : '—'}
                {idx.changePct != null ? ` ${formatPct(idx.changePct)}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
