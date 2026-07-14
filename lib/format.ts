import type { IndexQuote } from './types';

/** 涨跌颜色类（A股习惯：涨红跌绿） */
export function changeColor(v: number | null | undefined): string {
  if (v == null) return 'text-flat';
  if (v > 0) return 'text-up';
  if (v < 0) return 'text-down';
  return 'text-flat';
}

export function formatPct(v: number | null | undefined): string {
  if (v == null) return '--';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

export function formatNum(v: number | null | undefined, digits = 2): string {
  if (v == null) return '--';
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 主力净流入（元）→ 亿 / 万 */
export function formatInflow(v: number | null | undefined): string {
  if (v == null) return '--';
  const abs = Math.abs(v);
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(1)}万`;
  return `${sign}${abs.toFixed(0)}`;
}

/** 金价（通常 2 位小数） */
export function formatGoldPrice(v: number | null | undefined): string {
  if (v == null) return '--';
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 相对时间，如“3分钟前” */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  return `${day}天前`;
}

export function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 判断当前（上海时区）是否处于交易时段 */
export function isTradingNow(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const wd = parts.find((p) => p.type === 'weekday')?.value || '';
  const day = map[wd] ?? 0;
  if (day === 0 || day > 5) return false;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
  const minutes = hour * 60 + minute;
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
  return morning || afternoon;
}

export type { IndexQuote };
