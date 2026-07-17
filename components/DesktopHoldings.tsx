'use client';

import { Fragment, useState } from 'react';
import type { FundCost, FundEstimate, FundTrend, FundSector } from '@/lib/types';
import { formatNum, formatPct } from '@/lib/format';
import { classifyFundSector, type FundMetrics } from '@/lib/finance';
import { riskLevelFromMetrics, riskLabel, riskColor, fmtSignedPct } from '@/lib/metrics';
import Sparkline from './Sparkline';
import { FundCostEditor } from './FundRow';

/** 走势视图模式：曲线 / 净值 / 涨跌幅度 */
type TrendMode = 'curve' | 'nav' | 'chg';
const TREND_MODES: { key: TrendMode; label: string }[] = [
  { key: 'curve', label: '曲线' },
  { key: 'nav', label: '净值' },
  { key: 'chg', label: '涨跌幅度' },
];

/** 把 "2026-07-14 13:00" 压缩成 "07-14" */
function shortDate(t: string): string {
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : t;
}

/** 相邻点的日涨跌幅（%），长度比点数少 1 */
function dailyChanges(ft: FundTrend): number[] {
  const p = ft.points;
  const out: number[] = [];
  for (let i = 1; i < p.length; i++) {
    const prev = p[i - 1].price;
    out.push(prev ? ((p[i].price - prev) / prev) * 100 : 0);
  }
  return out;
}

/** 走势区：根据模式渲染曲线 / 净值列表 / 涨跌幅度柱 */
function FundTrendView({ ft, mode }: { ft: FundTrend; mode: TrendMode }) {
  if (mode === 'curve') {
    return <Sparkline trend={ft} width={1000} height={160} responsive fill />;
  }

  if (mode === 'nav') {
    const rows = [...ft.points].reverse(); // 最新在前
    return (
      <div className="custom-scrollbar h-full overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          {rows.map((pt) => (
            <div
              key={pt.t}
              className="flex items-center justify-between border-b border-outline-variant/30 py-1.5"
            >
              <span className="text-[11px] text-on-surface-variant">{shortDate(pt.t)}</span>
              <span className="font-mono-data text-[13px] text-on-surface">
                {formatNum(pt.price, 4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 涨跌幅度：竖向柱（涨红跌绿）
  const chg = dailyChanges(ft);
  if (chg.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
        数据不足
      </div>
    );
  }
  const W = 1000;
  const H = 160;
  const mid = H / 2;
  const n = chg.length;
  const slot = W / n;
  const bw = Math.min(slot * 0.6, 16);
  const maxAbs = Math.max(...chg.map(Math.abs), 0.1);
  const upColor = '#ef4444';
  const downColor = '#10b981';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ display: 'block' }}
    >
      <line x1={0} x2={W} y1={mid} y2={mid} stroke="var(--al-outline-variant)" strokeWidth={1} />
      {chg.map((c, i) => {
        const h = (Math.abs(c) / maxAbs) * (mid - 8);
        const x = slot * (i + 0.5) - bw / 2;
        const y = c >= 0 ? mid - h : mid;
        const color = c >= 0 ? upColor : downColor;
        return (
          <rect key={i} x={x} y={y} width={bw} height={Math.max(h, 0.5)} fill={color}>
            <title>{`${ft.points[i + 1]?.t ?? ''}：${c >= 0 ? '+' : ''}${c.toFixed(2)}%`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/** 涨跌配色 — A股习惯：涨红跌绿 */
function pnlColor(v: number | null | undefined): string {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

/** 信息面板：标题 + 键值行列表 */
function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-outline-variant/40 px-4 py-3"
      style={{ background: 'var(--al-sc-low)' }}
    >
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** 风险等级 pill 标签 */
function RiskBadge({ level }: { level: number }) {
  const cls = [
    'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
  ][level - 1] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {riskLabel(level)}
    </span>
  );
}

/** 每只基金按代码映射一个固定图标（对齐 redesign-preview.html 视觉） */
const FUND_ICON: Record<string, { icon: string; cls: string }> = {
  '011803': { icon: 'diamond', cls: 'bg-cost/10 text-cost' },
  '014089': { icon: 'shield', cls: 'bg-primary-container text-on-primary-container' },
  '007467': { icon: 'stacked_bar_chart', cls: 'bg-primary-container text-on-primary-container' },
  '160706': { icon: 'hub', cls: 'bg-primary-container text-on-primary-container' },
  '012349': { icon: 'language', cls: 'bg-tertiary-container text-on-tertiary-container' },
  '011103': { icon: 'solar_power', cls: 'bg-cost/10 text-cost' },
};

/** 我的持仓卡片列表（匹配 redesign-preview.html：卡片式而非表格，点击展开走势 + 编辑成本） */
export default function DesktopHoldings({
  codes,
  funds,
  fundErrors,
  costMap,
  expandedFund,
  onToggle,
  fundTrends,
  editing,
  onEditToggle,
  onSaveCost,
  onCancelEdit,
  onRemove,
  onAddFund,
  todayPnL,
  todayPct,
  fundMetrics,
}: {
  codes: string[];
  funds: Record<string, FundEstimate>;
  fundErrors: Record<string, string>;
  costMap: Record<string, FundCost>;
  expandedFund: string | null;
  onToggle: (code: string) => void;
  fundTrends: Record<string, FundTrend | 'loading' | 'error'>;
  editing: string | null;
  onEditToggle: (code: string) => void;
  onSaveCost: (code: string, amount: number | null, pnl: number | null) => void;
  onCancelEdit: () => void;
  onRemove: (code: string) => void;
  onAddFund?: () => void;
  todayPnL?: number | null;
  todayPct?: number | null;
  fundMetrics?: Record<string, FundMetrics | 'loading' | 'error' | null>;
}) {
  const totalMarketValue = codes.reduce((s, c) => s + (costMap[c]?.amount ?? 0), 0);
  const totalCost = codes.reduce((s, c) => {
    const a = costMap[c]?.amount;
    const p = costMap[c]?.pnl;
    return s + (a != null && p != null ? a - p : 0);
  }, 0);

  const [trendMode, setTrendMode] = useState<Record<string, TrendMode>>({});
  const setMode = (c: string, m: TrendMode) =>
    setTrendMode((prev) => ({ ...prev, [c]: m }));

  return (
    <section className="panel-card p-5">
      {/* 标题 + 汇总 + 新增 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: 'var(--al-tertiary)' }}
          >
            account_balance_wallet
          </span>
          <h2 className="text-base font-bold text-on-surface">我的持仓</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-on-surface-variant">
              {codes.length} 只 · 总成本 ¥{formatNum(totalCost, 0)}
            </span>
            {todayPnL != null && (
              <span className={`text-xs font-medium ${pnlColor(todayPnL)}`}>
                当日盈亏 {todayPnL >= 0 ? '+' : ''}¥{formatNum(todayPnL)}
                {todayPct != null ? ` · 当日收益 ${formatPct(todayPct)}` : ''}
              </span>
            )}
          </div>
          {onAddFund && (
            <button
              onClick={onAddFund}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              新增
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {codes.length === 0 && (
          <div
            className="rounded-xl px-4 py-8 text-center text-sm text-on-surface-variant"
            style={{ background: 'var(--al-sc-high)' }}
          >
            还没有自选基金，点击「新增」添加
          </div>
        )}

        {codes.map((code) => {
          const f = funds[code];
          const err = fundErrors[code];
          const cost = costMap[code];
          const amount = cost?.amount ?? null;
          const profit = cost?.pnl ?? null;
          const costBasis =
            amount != null && profit != null ? amount - profit : null;
          const profitPct =
            profit != null && costBasis != null && costBasis > 0
              ? (profit / costBasis) * 100
              : null;
          // 当日涨幅（来自估值接口 changePct）+ 当日盈亏 = 持仓市值 × 涨幅
          const dailyPct = f?.changePct ?? null;
          const dailyPnl =
            amount != null && dailyPct != null ? (amount * dailyPct) / 100 : null;

          // 板块 + 风险收益指标（近3月 / 年化波动 / 最大回撤 / 风险等级）
          const sector: FundSector = classifyFundSector(f?.name ?? code);
          const mRaw = fundMetrics?.[code];
          const mData =
            mRaw && mRaw !== 'loading' && mRaw !== 'error' ? mRaw : null;
          const metricsLoading = mRaw === 'loading';
          const risk = riskLevelFromMetrics(mData);

          const expanded = expandedFund === code;
          const mode = trendMode[code] ?? 'curve';
          const ft =
            fundTrends[code] &&
            fundTrends[code] !== 'loading' &&
            fundTrends[code] !== 'error'
              ? (fundTrends[code] as FundTrend)
              : null;
          const icon =
            FUND_ICON[code] ?? { icon: 'payments', cls: 'bg-primary-container text-on-primary-container' };

          return (
            <Fragment key={code}>
              {/* ═══ 卡片头：左侧图标+名称+市值+当日盈亏  |  右侧累计持有收益（大号） ═══ */}
              <button
                onClick={() => onToggle(code)}
                className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition-[filter] hover:brightness-105"
                style={{ background: 'var(--al-sc-high)' }}
              >
                {/* 左：深色圆角图标 */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl material-symbols-outlined text-[24px] ${icon.cls}`}
                  style={{
                    background: 'rgba(0,0,0,0.72)',
                    color: '#fff',
                  }}
                >
                  {icon.icon}
                </div>

                {/* 左中：名称 + 代码 + 市值 + 当日盈亏 */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-on-surface leading-tight">
                    {f?.name ?? code}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className="rounded-md px-1.5 py-px text-[10px] font-medium"
                      style={{ background: 'var(--al-sc-low)', color: 'var(--al-on-surface-variant)' }}
                    >
                      {code}
                    </span>
                    <span className="text-[12px] text-on-surface-variant">
                      市值 ¥{amount != null ? formatNum(amount) : '—'}
                    </span>
                  </div>
                  {dailyPnl != null && (
                    <div className={`mt-1 text-xs font-medium ${pnlColor(dailyPnl)}`}>
                      当日盈亏{' '}
                      {dailyPnl >= 0 ? '+' : ''}¥{formatNum(dailyPnl)}{' '}
                      <span className="font-normal">({formatPct(dailyPct)})</span>
                    </div>
                  )}
                </div>

                {/* 右：累计持有收益（大号） */}
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-on-surface-variant">累计持有收益</div>
                  <div className={`font-mono-data text-2xl font-bold leading-tight ${pnlColor(profit)}`}>
                    {profit != null ? `${profit >= 0 ? '' : '-'}¥${formatNum(Math.abs(profit))}` : '—'}
                  </div>
                  {profitPct != null && (
                    <div className={`font-mono-data text-sm font-medium ${pnlColor(profit)}`}>
                      {profitPct >= 0 ? '+' : ''}{formatPct(profitPct)}
                    </div>
                  )}
                </div>
              </button>

              {/* ═══ 三信息面板并排 ═══ */}
              <div className="grid grid-cols-3 gap-3 px-1 pb-3">
                {/* ── 基础信息 ── */}
                <InfoPanel title="基础信息">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">所属板块</span>
                      <span className="text-sm font-bold text-on-surface">{sector}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">风险等级</span>
                      {metricsLoading ? (
                        <span className="text-xs text-on-surface-variant">计算中</span>
                      ) : (
                        <RiskBadge level={risk} />
                      )}
                    </div>
                  </div>
                </InfoPanel>

                {/* ── 业绩表现 ── */}
                <InfoPanel title="业绩表现">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">近3月收益</span>
                      <span className={`text-sm font-semibold tabular-nums ${pnlColor(mData?.yRet)}`}>
                        {metricsLoading ? '计算中' : fmtSignedPct(mData?.yRet)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">最大回撤</span>
                      <span className={`text-sm font-semibold tabular-nums ${
                        mData?.mdd != null && mData.mdd > 0 ? 'text-market-up' : 'text-market-down'
                      }`}>
                        {metricsLoading ? '计算中' : fmtSignedPct(mData?.mdd)}
                      </span>
                    </div>
                  </div>
                </InfoPanel>

                {/* ── 波动分析 ── */}
                <InfoPanel title="波动分析">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">年化波动率</span>
                      <span className="text-sm font-semibold tabular-nums text-on-surface">
                        {metricsLoading
                          ? '计算中'
                          : mData?.vol != null
                            ? `${mData.vol.toFixed(2)}%`
                            : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">夏普比率</span>
                      <span className="text-sm font-semibold tabular-nums text-on-surface">
                        {metricsLoading
                          ? '计算中'
                          : (() => {
                              const v = mData?.vol;
                              const r = mData?.yRet;
                              if (v != null && v > 0 && r != null) {
                                return ((r / 100 - 0.03) / (v / 100)).toFixed(2);
                              }
                              return '—';
                            })()}
                      </span>
                    </div>
                  </div>
                </InfoPanel>
              </div>

              {/* ═══ 展开区：业绩趋势图 + 编辑/移除 ═══ */}
              {expanded && (
                <div
                  className="rounded-xl border border-outline-variant p-4"
                  style={{ background: 'var(--al-sc-low)' }}
                >
                  {/* 业绩趋势标题 + 视图切换 */}
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface">业绩趋势</h3>
                    <div
                      className="inline-flex rounded-lg p-0.5"
                      style={{ background: 'var(--al-surface-container)' }}
                      role="tablist"
                      aria-label="走势视图切换"
                    >
                      {TREND_MODES.map((m) => (
                        <button
                          key={m.key}
                          role="tab"
                          aria-selected={mode === m.key}
                          onClick={() => setMode(code, m.key)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            mode === m.key
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-52 w-full">
                    {fundTrends[code] === 'loading' ? (
                      <div className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
                        加载走势中…
                      </div>
                    ) : ft ? (
                      <FundTrendView ft={ft} mode={mode} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
                        {fundTrends[code] === 'error' ? '走势暂不可用' : '该基金暂无走势数据'}
                      </div>
                    )}
                  </div>

                  {/* 编辑器 + 操作按钮 */}
                  {editing === code && (
                    <FundCostEditor
                      initial={amount != null || profit != null ? { amount, pnl: profit } : undefined}
                      onSave={(a, p) => onSaveCost(code, a, p)}
                      onCancel={onCancelEdit}
                    />
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => onEditToggle(code)}
                      className="text-label-caps text-primary transition-opacity hover:opacity-80"
                    >
                      {editing === code ? '收起编辑' : '编辑持仓'}
                    </button>
                    <button
                      onClick={() => onRemove(code)}
                      className="text-label-caps text-market-up ml-auto transition-opacity hover:opacity-80"
                    >
                      移除基金
                    </button>
                  </div>

                  {err && <p className="mt-2 text-xs text-market-up">{err}</p>}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
