import type { FundMetrics } from './finance';

/**
 * 由风险收益指标推导风险等级 1~5（低风险 → 高风险）。
 * 以年化波动为主，波动缺失时以最大回撤兜底，均无数据默认定中风险。
 */
export function riskLevelFromMetrics(m: FundMetrics | null): number {
  if (!m) return 3;
  if (m.vol != null) {
    const v = m.vol;
    if (v < 5) return 1;
    if (v < 10) return 2;
    if (v < 18) return 3;
    if (v < 30) return 4;
    return 5;
  }
  if (m.mdd != null) {
    const d = Math.abs(m.mdd);
    if (d < 5) return 1;
    if (d < 12) return 2;
    if (d < 22) return 3;
    if (d < 35) return 4;
    return 5;
  }
  return 3;
}

/** 风险等级 → 中文标签 */
export function riskLabel(level: number): string {
  return ['低风险', '中低风险', '中风险', '中高风险', '高风险'][level - 1] ?? '中风险';
}

/** 风险等级 → 颜色 class（低→高：绿→青→琥珀→橙→红） */
export function riskColor(level: number): string {
  return [
    'text-emerald-600',
    'text-teal-600',
    'text-amber-600',
    'text-orange-600',
    'text-red-600',
  ][level - 1] ?? 'text-amber-600';
}

/** 带符号百分比：+16.0% / -16.9% / — */
export function fmtSignedPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
