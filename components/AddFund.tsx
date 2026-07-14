'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { FundSearchResult } from '@/lib/types';
import { IconPlus } from './icons';

export default function AddFund({
  existing,
  onAdd,
}: {
  existing: string[];
  onAdd: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FundSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    if (/^\d{6}$/.test(q)) {
      if (existing.includes(q)) {
        setError('该基金已在列表中');
        return;
      }
      onAdd(q);
      setQuery('');
      setResults([]);
      setError('');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const { results } = await api.search(q);
      setResults(results.filter((r) => !existing.includes(r.code)));
      if (results.length === 0) setError('未找到匹配基金');
    } catch (e: any) {
      setError(e?.message || '搜索失败');
    } finally {
      setSearching(false);
    }
  }

  function pick(r: FundSearchResult) {
    onAdd(r.code);
    setQuery('');
    setResults([]);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入基金代码(6位)或名称搜索"
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-hover)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-primary/60"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <IconPlus width={16} height={16} />
          添加
        </button>
      </div>

      {error && <div className="mt-1 text-xs text-up">{error}</div>}

      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          {results.slice(0, 8).map((r) => (
            <button
              key={r.code}
              onClick={() => pick(r)}
              className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[var(--card-hover)]"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="font-mono-data text-[11px] text-[var(--muted)]">
                  {r.code} · {r.type || '基金'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
