'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  SectorInfo,
  SectorQuote,
  SectorWatchItem,
  TrendData,
} from '@/lib/types';
import { changeColor, formatInflow, formatNum, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';

export default function SectorWatchlist({
  sectors,
  quotes,
  trends,
  onAdd,
  onRemove,
  loading,
}: {
  sectors: SectorWatchItem[];
  quotes: Record<string, SectorQuote>;
  trends: Record<string, TrendData>;
  onAdd: (item: SectorWatchItem) => void;
  onRemove: (code: string) => void;
  loading: boolean;
}) {
  const [catalog, setCatalog] = useState<SectorInfo[]>([]);
  const [query, setQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([api.sectorList('industry'), api.sectorList('concept')])
      .then(([ind, con]) => {
        if (!alive) return;
        setCatalog([...ind.sectors, ...con.sectors]);
      })
      .catch((e: any) => alive && setCatalogError(e?.message || '板块目录加载失败'))
      .finally(() => alive && setLoadingCatalog(false));
    return () => {
      alive = false;
    };
  }, []);

  const existingCodes = useMemo(
    () => new Set(sectors.map((s) => s.code)),
    [sectors],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return catalog
      .filter((c) => c.name.includes(q) && !existingCodes.has(c.code))
      .slice(0, 10);
  }, [query, catalog, existingCodes]);

  function pick(c: SectorInfo) {
    onAdd({ code: c.code, name: c.name, type: c.type });
    setQuery('');
  }

  if (loading && sectors.length === 0) {
    return (
      <div className="h-24 animate-pulse rounded-xl bg-[var(--bg)]" />
    );
  }

  return (
    <div>
      {/* 添加板块 */}
      <div className="relative mb-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) pick(results[0]);
            }}
            placeholder="搜索板块名称，如 半导体 / 白酒 / 人工智能"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[#c9ccd2]"
          />
        </div>
        {catalogError && (
          <div className="mt-1 text-xs text-up">{catalogError}</div>
        )}
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
            {results.map((c) => (
              <button
                key={c.code}
                onClick={() => pick(c)}
                className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 text-left text-sm last:border-0 hover:bg-[#f7f8fa]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                      c.type === 'industry'
                        ? 'bg-[#eef2ff] text-[#4f6bed]'
                        : 'bg-[#fef3f2] text-[#e0593d]'
                    }`}
                  >
                    {c.type === 'industry' ? '行业' : '概念'}
                  </span>
                </span>
                <span className={`shrink-0 text-xs tabular-nums ${changeColor(c.changePct)}`}>
                  {formatPct(c.changePct)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 自选列表 */}
      {sectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
          还没有自选板块，搜索上方名称添加（如「半导体」）
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {sectors.map((s) => {
            const q = quotes[s.code];
            return (
              <div
                key={s.code}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium leading-tight">
                      {q?.name || s.name}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                        s.type === 'industry'
                          ? 'bg-[#eef2ff] text-[#4f6bed]'
                          : 'bg-[#fef3f2] text-[#e0593d]'
                      }`}
                    >
                      {s.type === 'industry' ? '行业' : '概念'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)] tabular-nums">
                    {s.code}
                    {q?.mainNetInflow != null && (
                      <span className="ml-2">
                        主力 {formatInflow(q.mainNetInflow)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Sparkline trend={trends[`90.${s.code}`]} />
                </div>
                <div className="text-right">
                  <div className="tabular-nums">
                    {q?.price != null ? formatNum(q.price) : '--'}
                  </div>
                  <div className="text-xs text-[var(--muted)]">指数</div>
                </div>
                <div
                  className={`w-20 text-right font-medium tabular-nums ${changeColor(
                    q?.changePct,
                  )}`}
                >
                  {q?.changePct != null ? formatPct(q.changePct) : '--'}
                </div>
                <button
                  onClick={() => onRemove(s.code)}
                  className="text-[var(--muted)] transition-colors hover:text-up"
                  aria-label="删除板块"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
