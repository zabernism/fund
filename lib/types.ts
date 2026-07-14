export interface FundEstimate {
  code: string;
  name: string;
  /** 当前展示净值：盘中为估算净值，收盘/非交易时段回退为昨日净值 */
  nav: number | null;
  /** 昨日单位净值 */
  lastNav: number | null;
  /** 估算涨跌百分比（盘中），非交易时段为 null */
  changePct: number | null;
  /** 估值时间，如 2026-07-14 11:27 */
  updateTime: string | null;
  /** 是否处于可估算的交易时段 */
  trading: boolean;
}

export interface FundSearchResult {
  code: string;
  name: string;
  type: string;
  company: string;
  nav: number | null;
  date: string | null;
}

export interface IndexQuote {
  code: string;
  name: string;
  current: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  /** 行情时间，格式 YYYY-MM-DDTHH:mm:ss（本地原始串） */
  time: string | null;
  /** 成交额（亿），参考 index.html 显示「成交: X,XXX.X亿」 */
  volume?: number | null;
}

// ---------------------------------------------------------------------------
// 板块（行业 / 概念）
// ---------------------------------------------------------------------------
export type SectorType = 'industry' | 'concept';

/** 板块目录项（搜索可选列表） */
export interface SectorInfo {
  code: string; // 如 BK0735
  name: string;
  type: SectorType;
  price: number | null;
  changePct: number | null;
  /** 主力净流入（元） */
  mainNetInflow: number | null;
}

/** 板块行情（自选快照） */
export interface SectorQuote {
  code: string;
  name: string;
  price: number | null;
  changePct: number | null;
  mainNetInflow: number | null;
}

/** 本地自选板块 */
export interface SectorWatchItem {
  code: string;
  name: string;
  type: SectorType;
}

/** 基金持仓（成本价 / 份额），按基金代码索引 */
export interface FundCost {
  cost: number | null; // 持仓成本价（净值）
  shares: number | null; // 持仓份额
}

/** 分时序列点 */
export interface TrendPoint {
  t: string; // 时间，如 2026-07-14 13:00
  price: number;
}

/** 单个标的的分时数据 */
export interface TrendData {
  prevClose: number | null;
  points: TrendPoint[];
}

/** 基金走势：优先盘中分时(intraday)，否则回退每日净值走势(nav) */
export interface FundTrend {
  code: string;
  name: string | null;
  type: 'intraday' | 'nav';
  prevClose: number | null;
  points: TrendPoint[];
}

// ---------------------------------------------------------------------------
// 黄金 / 贵金属
// ---------------------------------------------------------------------------
export interface GoldQuote {
  secid: string;
  name: string;
  market: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  /** 当日最高价（参考 index.html 黄金面板显示高/低） */
  high?: number | null;
  /** 当日最低价 */
  low?: number | null;
}
