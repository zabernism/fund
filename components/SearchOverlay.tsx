'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { FundSearchResult, SectorInfo, SectorWatchItem } from '@/lib/types';
import { changeColor, formatPct } from '@/lib/format';
import { IconClose, IconPlus, IconSearch, IconTrash } from './icons';

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
  onAddSector,
  onRemoveSector,
  sectors,
  existingCodes,
}: {
  open: boolean;
  onClose: () => void;
  onAddFund: (code: string) => void;
  onAddSector: (item: SectorWatchItem) => void;
  onRemoveSector: (code: string) => void;
  sectors: SectorWatchItem[];
  existingCodes: string[];
}) {
  const [tab, setTab] = useState<'fund' | 'sector'>('fund');
  const [query, setQuery] = useState('');
  const [fundResults, setFundResults] = useState<FundSearchResult[]>([]);
  const [sectorResults, setSectorResults] = useState<SectorInfo[]>([]);
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

  async function runSectorSearch(q: string) {
    setLoading(true);
    setError('');
    try {
      const [ind, con] = await Promise.all([
        api.sectorList('industry', q),
        api.sectorList('concept', q),
      ]);
      const merged = [...ind.sectors, ...con.sectors];
      const seen = new Set<string>();
      const dedup = merged.filter((s) =>
        seen.has(s.code) ? false : (seen.add(s.code), true),
      );
      setSectorResults(dedup.slice(0, 20));
    } catch (e: any) {
      setError(e?.message || '板块搜索失败');
    } finally {
      setLoading(false);
    }
  }

  function onQuery(v: string) {
    setQuery(v);
    setError('');
    if (tab === 'fund') {
      if (/^\d{6}$/.test(v)) runFundSearch(v);
      else if (v.trim().length >= 1) runFundSearch(v);
      else setFundResults([]);
    } else {
      if (v.trim()) runSectorSearch(v);
      else setSectorResults([]);
    }
  }

  function addFund(code: string) {
    onAddFund(code);
    pushHistory(code);
    setQuery('');
    setFundResults([]);
  }

  function switchTab(t: 'fund' | 'sector') {
    setTab(t);
    setQuery('');
    setFundResults([]);
    setSectorResults([]);
    setError('');
  }

  const showHistory = tab === 'fund' && query.trim() === '';

  const sectorExisting = useMemo(
    () => new Set(sectors.map((s) => s.code)),
    [sectors],
  );

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
                if (e.key === 'Enter') {
                  if (tab === 'fund' && fundResults[0]) addFund(fundResults[0].code);
                  else if (tab === 'sector' && sectorResults[0])
                    onAddSector({
                      code: sectorResults[0].code,
                      name: sectorResults[0].name,
                      type: sectorResults[0].type,
                    });
                }
              }}
              placeholder={
                tab === 'fund' ? '基金代码(6位)或名称' : '板块名称，如 半导体'
              }
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

        {/* Tab 切换 */}
        <div className="flex gap-1 px-3 pt-3">
          {([
            ['fund', '基金'],
            ['sector', '板块'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => switchTab(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === k
                  ? 'bg-primary/15 text-primary'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
          {error && <div className="mb-2 text-xs text-up">{error}</div>}

          {tab === 'fund' && showHistory && (
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

          {tab === 'fund' && !showHistory && (
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

          {tab === 'sector' && (
            <>
              {query.trim() === '' ? (
                <Section title="已自选板块">
                  {sectors.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      暂无自选板块，输入名称搜索添加
                    </p>
                  ) : (
                    sectors.map((s) => (
                      <div
                        key={s.code}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {s.name}
                          </span>
                          <span className="font-mono-data text-[11px] text-[var(--muted)]">
                            {s.code} · {s.type === 'industry' ? '行业' : '概念'}
                          </span>
                        </span>
                        <button
                          onClick={() => onRemoveSector(s.code)}
                          aria-label="删除板块"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-up"
                        >
                          <IconTrash width={15} height={15} />
                        </button>
                      </div>
                    ))
                  )}
                </Section>
              ) : (
                <div className="space-y-2">
                  {sectorResults.map((c) => {
                    const added = sectorExisting.has(c.code);
                    return (
                      <button
                        key={c.code}
                        disabled={added}
                        onClick={() =>
                          onAddSector({
                            code: c.code,
                            name: c.name,
                            type: c.type,
                          })
                        }
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--card-hover)] disabled:opacity-40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {c.name}
                          </span>
                          <span className="font-mono-data text-[11px] text-[var(--muted)]">
                            {c.code} · {c.type === 'industry' ? '行业' : '概念'}
                          </span>
                        </span>
                        <span
                          className={`font-mono-data text-sm font-semibold ${changeColor(
                            c.changePct,
                          )}`}
                        >
                          {c.changePct != null ? formatPct(c.changePct) : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
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
