'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { FundSearchResult } from '@/lib/types';
import { IconClose, IconPlus, IconSearch } from './icons';

const HOT_FUNDS: { code: string; name: string }[] = [
  { code: '161725', name: '招商中证白酒指数' },
  { code: '110011', name: '易方达中小盘混合' },
  { code: '005827', name: '易方达蓝筹精选混合' },
  { code: '000051', name: '华夏沪深300ETF联接' },
  { code: '320007', name: '诺安成长混合' },
  { code: '110020', name: '易方达沪深300ETF联接' },
];

const HISTORY_KEY = 'fund-dashboard:search-history';

export default function SearchOverlay({
  open,
  onClose,
  onAddFund,
  existingCodes,
}: {
  open: boolean;
  onClose: () => void;
  onAddFund: (code: string) => void;
  existingCodes: string[];
}) {
  const [query, setQuery] = useState('');
  const [fundResults, setFundResults] = useState<FundSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw).slice(0, 6));
    } catch {
      /* ignore */
    }
  }, [open]);

  function pushHistory(code: string) {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const next = [code, ...arr.filter((c) => c !== code)].slice(0, 6);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      /* ignore */
    }
  }

  async function runFundSearch(q: string) {
    setLoading(true);
    setError('');
    try {
      const { results } = await api.search(q);
      setFundResults(results.filter((r) => !existingCodes.includes(r.code)));
      if (results.length === 0) setError('未找到匹配基金');
    } catch (e: any) {
      setError(e?.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  }

  function onQuery(v: string) {
    setQuery(v);
    setError('');
    if (/^\d{6}$/.test(v)) runFundSearch(v);
    else if (v.trim().length >= 1) runFundSearch(v);
    else setFundResults([]);
  }

  function addFund(code: string) {
    onAddFund(code);
    pushHistory(code);
    setQuery('');
    setFundResults([]);
  }

  const showHistory = query.trim() === '';

  if (!open) return null;

  return (
    <div
      className="overlay-fade fixed inset-0 z-40 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="sheet-up mx-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部搜索栏 */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--card-hover)] px-3 py-2">
            <IconSearch width={18} height={18} className="text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fundResults[0]) addFund(fundResults[0].code);
              }}
              placeholder="基金代码(6位)或名称"
              className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {loading && (
              <span className="spin inline-flex text-[var(--muted)]">
                <IconSearch width={16} height={16} />
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
          >
            <IconClose width={20} height={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
          {error && <div className="mb-2 text-xs text-up">{error}</div>}

          {showHistory && (
            <>
              {history.length > 0 && (
                <Section title="最近添加">
                  {history.map((code) => (
                    <Chip
                      key={code}
                      label={code}
                      onClick={() => addFund(code)}
                    />
                  ))}
                </Section>
              )}
              <Section title="热门基金">
                {HOT_FUNDS.map((f) => (
                  <Chip
                    key={f.code}
                    label={`${f.name}`}
                    sub={f.code}
                    onClick={() => addFund(f.code)}
                  />
                ))}
              </Section>
            </>
          )}

          {!showHistory && (
            <div className="space-y-2">
              {fundResults.map((r) => (
                <button
                  key={r.code}
                  onClick={() => addFund(r.code)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--card-hover)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {r.name}
                    </span>
                    <span className="font-mono-data text-[11px] text-[var(--muted)]">
                      {r.code} · {r.type || '基金'}
                    </span>
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <IconPlus width={16} height={16} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  label,
  sub,
  onClick,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--card-hover)]"
    >
      <span className="max-w-[140px] truncate">{label}</span>
      {sub && (
        <span className="font-mono-data text-[10px] text-[var(--muted)]">
          {sub}
        </span>
      )}
      <IconPlus width={14} height={14} className="text-primary" />
    </button>
  );
}
