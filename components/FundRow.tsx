'use client';

import { useState } from 'react';
import type { FundCost, FundEstimate, FundTrend } from '@/lib/types';
import { changeColor, formatNum, formatPct } from '@/lib/format';
import { classifyFundSector, type FundMetrics } from '@/lib/finance';
import { riskLevelFromMetrics, riskLabel, riskColor, fmtSignedPct } from '@/lib/metrics';
import FlashNum from './FlashNum';
import Sparkline from './Sparkline';
import { IconChevron, IconPencil, IconTrash } from './icons';

export function FundCostEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FundCost;
  onSave: (amount: number | null, pnl: number | null) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : '',
  );
  const [pnl, setPnl] = useState(
    initial?.pnl != null ? String(initial.pnl) : '',
  );

  function save() {
    const a = amount.trim() === '' ? null : Number(amount);
    const p = pnl.trim() === '' ? null : Number(pnl);
    if ((a != null && Number.isNaN(a)) || (p != null && Number.isNaN(p))) return;
    onSave(a, p);
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-[var(--card-hover)] p-3">
      <label className="flex flex-col text-[11px] text-[var(--muted)]">
        持有金额
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="如 10000"
          className="mt-1 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-primary/60"
        />
      </label>
      <label className="flex flex-col text-[11px] text-[var(--muted)]">
        盈亏金额
        <input
          type="number"
          step="0.01"
          value={pnl}
          onChange={(e) => setPnl(e.target.value)}
          placeholder="亏-500 赚+300"
          className="mt-1 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-primary/60"
        />
      </label>
      <button
        onClick={save}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-[var(--on-primary)] transition-opacity hover:opacity-90"
      >
        保存
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        取消
      </button>
    </div>
  );
}

/** 指标小格：标签在上、数值在下（风险收益四宫格） */
function MetricCell({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--card-hover)] px-1 py-1.5">
      <span className="text-[9px] text-[var(--muted)]">{label}</span>
      <span className={`text-[11px] font-semibold ${cls}`}>{value}</span>
    </div>
  );
}

export default function FundRow({
  code,
  fund,
  error,
  cost,
  expanded,
  onToggle,
  trend,
  editing,
  onEditToggle,
  onSaveCost,
  onCancelEdit,
  onRemove,
  metrics,
}: {
  code: string;
  fund?: FundEstimate;
  error?: string;
  cost?: FundCost;
  expanded: boolean;
  onToggle: () => void;
  trend?: FundTrend | 'loading' | 'error';
  editing: boolean;
  onEditToggle: () => void;
  onSaveCost: (amount: number | null, pnl: number | null) => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  metrics?: FundMetrics | 'loading' | 'error' | null;
}) {
  const up = (fund?.changePct ?? 0) > 0;
  const down = (fund?.changePct ?? 0) < 0;
  const arrow = up ? '▲' : down ? '▼' : '—';
  const accent = up
    ? 'border-l-up'
    : down
      ? 'border-l-down'
      : 'border-l-[var(--border)]';

  const profit = cost?.pnl ?? null;
  const costBasis =
    cost?.amount != null && cost?.pnl != null ? cost.amount - cost.pnl : null;
  const profitPct =
    profit != null && costBasis != null && costBasis > 0
      ? (profit / costBasis) * 100
      : null;

  const ft = trend && trend !== 'loading' && trend !== 'error' ? trend : null;

  // 板块 + 风险收益指标（近3月 / 年化波动 / 最大回撤 / 风险等级）
  const sector = classifyFundSector(fund?.name ?? code);
  const mData = metrics && metrics !== 'loading' && metrics !== 'error' ? metrics : null;
  const metricsLoading = metrics === 'loading';
  const risk = riskLevelFromMetrics(mData);

  return (
    <div className={`glass-soft border-l-2 px-3 py-2.5 ${accent}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          aria-label="展开走势"
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            expanded
              ? 'bg-primary/15 text-primary'
              : 'text-[var(--muted)] hover:bg-[var(--card-hover)]'
          }`}
        >
          <IconChevron
            width={18}
            height={18}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
            }}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">
            {fund ? fund.name : code}
          </div>
          <div className="font-mono-data text-[11px] text-[var(--muted)]">
            {code}
            {fund?.trading ? ' · 估算' : ' · 昨净值'}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono-data text-[15px] font-semibold">
            {error ? (
              <span className="text-up">获取失败</span>
            ) : fund ? (
              <FlashNum value={fund.nav}>{formatNum(fund.nav, 4)}</FlashNum>
            ) : (
              <span className="text-[var(--muted)]">…</span>
            )}
          </div>
          <div
            className={`font-mono-data text-xs font-medium ${changeColor(
              fund?.changePct,
            )}`}
          >
            {fund?.changePct != null ? (
              <FlashNum value={fund.changePct}>
                {formatPct(fund.changePct)} {arrow}
              </FlashNum>
            ) : (
              '--'
            )}
          </div>
        </div>
      </div>

      {cost?.amount != null && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">
            持有 ¥{formatNum(cost.amount)}{' '}
            {costBasis != null && <>· 成本 ¥{formatNum(costBasis)}</>}
          </span>
          {profit != null && (
            <span className={`font-mono-data font-semibold ${changeColor(profit)}`}>
              <FlashNum value={profit}>
                {profit >= 0 ? '+' : ''}
                {formatNum(profit)}{' '}
                <span className="text-[11px] font-normal">
                  ({formatPct(profitPct)})
                </span>
              </FlashNum>
            </span>
          )}
        </div>
      )}

      {/* 风险收益指标条：板块 + 近3月 / 年化波动 / 最大回撤 / 风险（与收益并排） */}
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        <div className="flex flex-col justify-center rounded-lg bg-[var(--card-hover)] px-2 py-1.5">
          <span className="text-[9px] text-[var(--muted)]">板块</span>
          <span className="truncate text-[11px] font-semibold text-[var(--text)]">
            {sector}
          </span>
        </div>
        <MetricCell
          label="近3月"
          value={metricsLoading ? '计算中' : fmtSignedPct(mData?.yRet)}
          cls={changeColor(mData?.yRet ?? null)}
        />
        <MetricCell
          label="年化波动"
          value={
            metricsLoading
              ? '计算中'
              : mData?.vol != null
                ? `${mData.vol.toFixed(1)}%`
                : '—'
          }
          cls="text-[var(--text)]"
        />
        <MetricCell
          label="最大回撤"
          value={
            metricsLoading
              ? '计算中'
              : mData?.mdd != null
                ? `${mData.mdd.toFixed(1)}%`
                : '—'
          }
          cls="text-down"
        />
        <MetricCell
          label="风险"
          value={metricsLoading ? '计算中' : riskLabel(risk)}
          cls={riskColor(risk)}
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          onClick={onEditToggle}
          aria-label="编辑成本价"
          className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-primary"
        >
          <IconPencil width={14} height={14} />
          持仓
        </button>
        <button
          onClick={onRemove}
          aria-label="删除基金"
          className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-up"
        >
          <IconTrash width={14} height={14} />
          删
        </button>
      </div>

      {editing && (
        <FundCostEditor
          initial={cost}
          onSave={onSaveCost}
          onCancel={onCancelEdit}
        />
      )}

      {expanded && (
        <div className="mt-3 rounded-xl bg-[var(--card-hover)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
            <span>
              {trend === 'loading'
                ? '加载走势中…'
                : trend === 'error'
                  ? '走势暂不可用'
                  : ft?.type === 'intraday'
                    ? '盘中分时（场内逐分钟）'
                    : '近 30 日单位净值'}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block h-0 w-4 border-t border-dashed border-[var(--border)]" />
                基准
              </span>
              {cost?.pnl != null && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0 w-4 border-t border-dashed border-cost" />
                  成本线
                </span>
              )}
            </span>
          </div>
          {ft ? (
            <div className="w-full">
              <Sparkline
                trend={ft}
                width={640}
                height={120}
                responsive
              />
            </div>
          ) : trend === 'loading' ? (
            <div className="py-10 text-center text-sm text-[var(--muted)]">
              加载中…
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--muted)]">
              该基金暂无走势数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}
