'use client';

import { Fragment } from 'react';
import type { FundCost, FundEstimate, FundTrend } from '@/lib/types';
import { formatNum, formatPct } from '@/lib/format';
import Sparkline from './Sparkline';
import { FundCostEditor } from './FundRow';

/** 涨跌配色 — 匹配参考 index.html 用 text-market-up / text-market-down */
function pnlColor(v: number | null | undefined): 'text-market-up' | 'text-market-down' | 'text-on-surface-variant' {
  if (v == null || v === 0) return 'text-on-surface-variant';
  return v > 0 ? 'text-market-up' : 'text-market-down';
}

export default function DesktopFunds({
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
  onExport,
  onImport,
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
  onExport?: () => void;
  onImport?: (file: File) => void;
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
      {/* 匹配参考第228-234行：表头 + 操作按钮 */}
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-4">
        <h2 className="font-display-sm text-display-sm text-on-surface">
          我的持仓
        </h2>
        <div className="flex gap-2">
          {onAddFund && (
            <button
              onClick={onAddFund}
              className="rounded bg-primary px-3 py-1 text-body-sm text-on-primary transition-all hover:opacity-90"
            >
              新增持仓
            </button>
          )}
          <button
            onClick={onExport}
            className="rounded border border-outline px-3 py-1 text-body-sm text-on-surface-variant transition-all hover:bg-surface-container-highest"
          >
            导出
          </button>
          <label className="cursor-pointer rounded border border-outline px-3 py-1 text-body-sm text-on-surface-variant transition-all hover:bg-surface-container-highest">
            导入
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onImport) onImport(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* 匹配参考第236-306行：表格 */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse text-left font-body-md">
          <thead className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-highest text-label-caps text-on-surface-variant">
            <tr>
              <th className="p-3">代码</th>
              <th className="p-3">基金名称</th>
              <th className="p-3">净值</th>
              <th className="p-3">日涨幅</th>
              <th className="p-3">持有市值</th>
              <th className="p-3">累计盈亏</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-body-md text-on-surface-variant">
                  还没有自选基金，点击新增持仓添加
                </td>
              </tr>
            )}
            {codes.map((code, idx) => {
              const f = funds[code];
              const err = fundErrors[code];
              const cost = costMap[code];
              const amount = cost?.amount ?? null;
              const pnl = cost?.pnl ?? null;
              const costBasis = amount != null && pnl != null ? amount - pnl : null;
              const profit = pnl;
              const totalVal = amount;
              const profitPct = profit != null && costBasis != null && costBasis > 0 ? (profit / costBasis) * 100 : null;
              const expanded = expandedFund === code;
              const ft =
                fundTrends[code] &&
                fundTrends[code] !== 'loading' &&
                fundTrends[code] !== 'error'
                  ? (fundTrends[code] as FundTrend)
                  : null;

              // 匹配参考：偶数行斑马纹 bg-surface-container-lowest/30
              const zebra = idx % 2 === 1 ? 'bg-surface-container-lowest/30' : '';

              return (
                <Fragment key={code}>
                  <tr className={`transition-colors hover:bg-surface-container-high ${zebra}`}>
                    <td className="p-3 font-data-mono">{code}</td>
                    <td className="p-3 text-on-surface">{f?.name ?? code}</td>
                    <td className="p-3 font-data-mono">
                      {err ? (
                        <span className="text-market-up">获取失败</span>
                      ) : f?.nav != null ? (
                        formatNum(f.nav, 4)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`p-3 font-data-mono ${pnlColor(f?.changePct)}`}>
                      {f?.changePct != null ? formatPct(f.changePct) : '—'}
                    </td>
                    <td className="p-3 font-data-mono text-on-surface">
                      {totalVal != null ? `¥${formatNum(totalVal)}` : '—'}
                    </td>
                    <td className={`p-3 font-data-mono ${pnlColor(profit)}`}>
                      {profit != null ? `${profit >= 0 ? '+' : ''}${formatNum(profit)}` : '—'}
                    </td>
                    <td className="p-3">
                      {/* 匹配参考第257行：analytics 图标 */}
                      <span
                        className="material-symbols-outlined cursor-pointer text-primary"
                        onClick={() => onToggle(code)}
                      >
                        analytics
                      </span>
                    </td>
                  </tr>

                  {/* 展开行：保留原有走势 + 成本编辑功能 */}
                  {expanded && (
                    <tr className="border-l-4 border-secondary bg-surface-container-high">
                      <td colSpan={7} className="p-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="flex gap-8">
                              <div>
                                <p className="mb-1 label-caps text-on-surface-variant">持有金额</p>
                                <p className="font-data-mono text-lg">
                                  {totalVal != null ? `¥${formatNum(totalVal)}` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 label-caps text-on-surface-variant">成本</p>
                                <p className="font-data-mono text-lg">
                                  {costBasis != null ? `¥${formatNum(costBasis)}` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 label-caps text-on-surface-variant">累计盈亏</p>
                                <p className={`font-data-mono text-lg ${pnlColor(profit)}`}>
                                  {profit != null ? `${profit >= 0 ? '+' : ''}${formatNum(profit)}` : '—'}
                                  {profitPct != null && (
                                    <span className="ml-1 text-sm">({formatPct(profitPct)})</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {editing && (
                            <FundCostEditor
                              initial={amount != null || pnl != null ? { amount, pnl } : undefined}
                              onSave={(a, p) => onSaveCost(code, a, p)}
                              onCancel={onCancelEdit}
                            />
                          )}

                          <div className="h-40 w-full">
                            {fundTrends[code] === 'loading' ? (
                              <div className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
                                加载走势中…
                              </div>
                            ) : ft ? (
                              <Sparkline trend={ft} width={1000} height={160} responsive fill />
                            ) : (
                              <div className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
                                {fundTrends[code] === 'error' ? '走势暂不可用' : '该基金暂无走势数据'}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="label-caps text-on-surface-variant">
                              {ft?.type === 'intraday' ? '盘中分时（场内逐分钟）' : '近 30 日单位净值'}
                            </span>
                            <button
                              onClick={() => onEditToggle(code)}
                              className="label-caps text-primary transition-opacity hover:opacity-80"
                            >
                              {editing ? '收起编辑' : '编辑持仓'}
                            </button>
                            <button
                              onClick={() => onRemove(code)}
                              className="ml-auto label-caps text-market-up transition-opacity hover:opacity-80"
                            >
                              移除基金
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
