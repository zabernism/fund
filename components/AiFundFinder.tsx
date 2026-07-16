'use client';

import { useState } from 'react';
import type { AiFundResult } from '@/lib/aifind';
import { IconSparkles, IconPlus } from './icons';

const EXAMPLES = [
  '稳健低波、适合保守的债券基金',
  '重仓白酒的消费类指数基金',
  '近3月收益靠前的半导体/芯片基金',
  '波动大、弹性高的恒生科技或游戏ETF',
  '高股息红利低波价值型',
];

function riskLabel(risk: number): string {
  return ['低风险', '中低风险', '中风险', '中高风险', '高风险'][risk - 1] ?? '中风险';
}
function riskColor(risk: number): string {
  return ['text-emerald-600', 'text-teal-600', 'text-amber-600', 'text-orange-600', 'text-red-600'][
    risk - 1
  ] ?? 'text-amber-600';
}
function pctClass(v: number | null): string {
  if (v == null) return 'text-[var(--muted)]';
  return v >= 0 ? 'text-up' : 'text-down';
}
function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function AiFundFinder({
  onAddFund,
  existingCodes = [],
  variant = 'mobile',
  bare = false,
}: {
  onAddFund: (code: string) => void;
  existingCodes?: string[];
  variant?: 'mobile' | 'desktop';
  /** 嵌入悬浮面板时使用：跳过自身标题与边框，由外层容器负责外壳 */
  bare?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AiFundResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function submit(q?: string) {
    const text = (q ?? query).trim();
    if (!text || loading) return;
    if (q != null) setQuery(text); // 点击示例时同步输入框
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch('/api/ai/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '智能选基失败');
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (e: any) {
      setError(e?.message || '请求失败，请稍后重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const sectionCls =
    bare
      ? ''
      : variant === 'desktop'
      ? 'glass-soft flex max-h-[360px] flex-col overflow-y-auto rounded-2xl border border-[var(--border)] p-4'
      : 'glass-soft rounded-2xl border border-[var(--border)] p-4';

  return (
    <section className={sectionCls}>
      {!bare && (
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <IconSparkles width={18} height={18} />
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)]">AI 智能选基</h2>
          <span className="ml-auto rounded-full bg-[var(--card-hover)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            真实指标匹配
          </span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => submit(ex)}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)] disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mb-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="描述需求，如：稳健债券、重仓半导体、近3月收益高"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-primary"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
        >
          <IconSparkles width={15} height={15} />
          {loading ? '匹配中' : '选基'}
        </button>
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-up/10 px-3 py-2 text-xs text-up">{error}</p>
      )}

      {loading && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="mb-2 h-4 w-2/3 rounded bg-[var(--card-hover)]" />
              <div className="h-3 w-full rounded bg-[var(--card-hover)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2.5">
          {results.map((r) => {
            const added = existingCodes.includes(r.code);
            return (
              <div
                key={r.code}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--text)]">
                      {r.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono-data text-[11px] text-[var(--muted)]">
                        {r.code}
                      </span>
                      <span className="rounded bg-[var(--card-hover)] px-1.5 py-px text-[10px] text-[var(--muted)]">
                        {r.sector}
                      </span>
                      <span className="rounded bg-[var(--card-hover)] px-1.5 py-px text-[10px] text-[var(--muted)]">
                        {r.type}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => onAddFund(r.code)}
                    className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-primary/15 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                  >
                    <IconPlus width={14} height={14} />
                    {added ? '已添加' : '加入自选'}
                  </button>
                </div>

                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
                  {r.reason}
                </p>

                <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono-data text-center">
                  <Metric label="近3月" value={fmtPct(r.metrics.yRet)} cls={pctClass(r.metrics.yRet)} />
                  <Metric label="年化波动" value={r.metrics.vol != null ? `${r.metrics.vol.toFixed(1)}%` : '—'} cls="text-[var(--text)]" />
                  <Metric label="最大回撤" value={r.metrics.mdd != null ? `${r.metrics.mdd.toFixed(1)}%` : '—'} cls="text-down" />
                  <Metric label="风险" value={riskLabel(r.risk)} cls={riskColor(r.risk)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="rounded-lg bg-[var(--card-hover)] px-3 py-3 text-center text-xs text-[var(--muted)]">
          没有匹配到合适标的，换个描述试试？
        </p>
      )}
    </section>
  );
}

function Metric({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-lg bg-[var(--card-hover)] py-1.5">
      <div className="text-[9px] text-[var(--muted)]">{label}</div>
      <div className={`text-[12px] font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
