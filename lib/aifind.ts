// 智能选基（本地数据驱动，无需外部 LLM）
// 解析用户中文描述 → 板块/类型/风险偏好 → 从精选基金库匹配 →
// 用真实净值历史计算风险收益指标（近1年收益 / 年化波动 / 最大回撤）→ 排序返回。
import type { FundSector } from './types';
import { fetchFundMetrics, type FundMetrics } from './finance';

export type FundType =
  | '指数'
  | 'ETF'
  | 'LOF'
  | '主动混合'
  | '主动股票'
  | '债券'
  | 'QDII'
  | '商品';

export interface FundCatalogItem {
  code: string;
  name: string;
  sector: FundSector;
  type: FundType;
  /** 风险等级 1(低) ~ 5(高) */
  risk: 1 | 2 | 3 | 4 | 5;
  /** 额外匹配关键词（如 沪深300、红利、黄金） */
  tags: string[];
}

export interface AiFundResult extends FundCatalogItem {
  metrics: FundMetrics;
  score: number;
  reason: string;
}

// 精选基金库（覆盖主流板块/类型，元数据人工标注）
const CATALOG: FundCatalogItem[] = [
  { code: '011803', name: '景顺长城宁景6个月持有混合A', sector: '其他', type: '主动混合', risk: 3, tags: ['持有期', '平衡'] },
  { code: '014089', name: '永赢稳健增强债券C', sector: '债券', type: '债券', risk: 2, tags: ['稳健', '债券', '增强'] },
  { code: '007467', name: '华泰柏瑞中证红利低波ETF联接C', sector: '红利低波', type: '指数', risk: 2, tags: ['红利', '低波', '高股息', '价值'] },
  { code: '160706', name: '嘉实沪深300ETF联接A', sector: '指数增强', type: '指数', risk: 3, tags: ['沪深300', '宽基', '大盘'] },
  { code: '012349', name: '天弘恒生科技ETF联接C', sector: '港股', type: 'QDII', risk: 4, tags: ['恒生科技', '港股', '中概', '科技'] },
  { code: '011103', name: '天弘中证光伏产业指数C', sector: '新能源', type: '指数', risk: 4, tags: ['光伏', '新能源'] },
  { code: '512480', name: '国联安中证半导体ETF', sector: '半导体', type: 'ETF', risk: 4, tags: ['半导体', '芯片', '集成电路'] },
  { code: '159819', name: '天弘中证芯片ETF联接C', sector: '半导体', type: '指数', risk: 4, tags: ['芯片', '半导体'] },
  { code: '161725', name: '招商中证白酒指数(LOF)A', sector: '白酒消费', type: 'LOF', risk: 4, tags: ['白酒', '消费', '食品'] },
  { code: '004851', name: '广发医疗保健股票A', sector: '医药健康', type: '主动股票', risk: 4, tags: ['医药', '医疗', '健康'] },
  { code: '161726', name: '招商国证生物医药指数(LOF)A', sector: '医药健康', type: 'LOF', risk: 4, tags: ['生物', '医药', '疫苗'] },
  { code: '011301', name: '华宝医疗ETF联接C', sector: '医药健康', type: '指数', risk: 4, tags: ['医疗', '医药'] },
  { code: '003095', name: '中欧医疗健康混合A', sector: '医药健康', type: '主动混合', risk: 4, tags: ['医疗', '医药', '主动'] },
  { code: '164825', name: '申万菱信中证环保新能源LOF', sector: '新能源', type: 'LOF', risk: 4, tags: ['新能源', '环保'] },
  { code: '501059', name: '西部利得中证新能源汽车', sector: '新能源', type: '指数', risk: 4, tags: ['新能源', '汽车'] },
  { code: '012678', name: '汇添富中证电池ETF联接C', sector: '新能源', type: '指数', risk: 4, tags: ['电池', '新能源', '锂电'] },
  { code: '163115', name: '申万菱信中证军工', sector: '军工', type: '指数', risk: 4, tags: ['军工', '国防'] },
  { code: '005693', name: '前海开源中证军工', sector: '军工', type: '指数', risk: 4, tags: ['军工', '国防'] },
  { code: '512660', name: '国泰中证军工ETF', sector: '军工', type: 'ETF', risk: 4, tags: ['军工', '国防'] },
  { code: '001594', name: '天弘中证银行ETF联接A', sector: '金融地产', type: '指数', risk: 3, tags: ['银行', '金融'] },
  { code: '160628', name: '鹏华中证800地产', sector: '金融地产', type: '指数', risk: 4, tags: ['地产', '金融'] },
  { code: '006990', name: '南方恒生科技', sector: '港股', type: '指数', risk: 4, tags: ['恒生科技', '港股', '中概'] },
  { code: '501311', name: '易方达恒生H股ETF联接', sector: '港股', type: '指数', risk: 4, tags: ['港股', 'H股', '中概'] },
  { code: '110017', name: '易方达增强回报债券A', sector: '债券', type: '债券', risk: 2, tags: ['债券', '稳健'] },
  { code: '000192', name: '易方达双债增强A', sector: '债券', type: '债券', risk: 2, tags: ['债券', '稳健'] },
  { code: '000307', name: '易方达黄金ETF联接A', sector: '商品', type: '商品', risk: 3, tags: ['黄金', '商品'] },
  { code: '161116', name: '黄金ETF联接', sector: '商品', type: '商品', risk: 3, tags: ['黄金', '商品'] },
  { code: '515070', name: '华泰柏瑞中证沪深300ETF', sector: '指数增强', type: 'ETF', risk: 3, tags: ['沪深300', '宽基', '大盘'] },
  { code: '159869', name: '华夏中证动漫游戏ETF', sector: 'AI科技', type: 'ETF', risk: 5, tags: ['游戏', '传媒', 'AI', '科技'] },
  { code: '011609', name: '国泰中证动漫游戏ETF联接C', sector: 'AI科技', type: '指数', risk: 5, tags: ['游戏', '传媒', 'AI', '科技'] },
  { code: '013329', name: '鹏扬中证数字经济ETF联接C', sector: 'AI科技', type: '指数', risk: 4, tags: ['数字经济', 'AI', '科技', '计算机'] },
  { code: '001513', name: '易方达信息产业混合', sector: 'AI科技', type: '主动混合', risk: 4, tags: ['科技', 'AI', '信息', '计算机'] },
  { code: '012864', name: '广发科技创新混合', sector: 'AI科技', type: '主动混合', risk: 4, tags: ['科技', 'AI', '创新'] },
  { code: '012348', name: '天弘中证食品饮料ETF联接C', sector: '白酒消费', type: '指数', risk: 4, tags: ['消费', '食品', '饮料'] },
  { code: '260108', name: '景顺长城新兴成长混合', sector: '白酒消费', type: '主动混合', risk: 4, tags: ['白酒', '消费', '成长'] },
  { code: '005827', name: '易方达蓝筹精选混合', sector: '其他', type: '主动混合', risk: 3, tags: ['蓝筹', '消费', '港股', '价值'] },
  { code: '100038', name: '富国低碳环保混合', sector: '新能源', type: '主动混合', risk: 4, tags: ['环保', '新能源', '低碳'] },
  { code: '001102', name: '前海开源稀缺资产混合', sector: '其他', type: '主动混合', risk: 3, tags: ['稀缺', '消费', '成长'] },
  { code: '007301', name: '国联安中证全指半导体ETF联接', sector: '半导体', type: '指数', risk: 4, tags: ['半导体', '芯片'] },
  { code: '013155', name: '华夏中证动漫游戏ETF联接C', sector: 'AI科技', type: '指数', risk: 5, tags: ['游戏', '传媒', 'AI'] },
  { code: '014808', name: '中小100ETF', sector: '指数增强', type: 'ETF', risk: 4, tags: ['中小盘', '宽基', '成长'] },
  { code: '003096', name: '中欧医疗健康混合C', sector: '医药健康', type: '主动混合', risk: 4, tags: ['医疗', '医药'] },
  { code: '161810', name: '银华内需精选混合(LOF)', sector: '其他', type: 'LOF', risk: 4, tags: ['内需', '成长', '农业'] },
  { code: '110011', name: '易方达优质精选混合', sector: '其他', type: '主动混合', risk: 3, tags: ['蓝筹', '消费', '价值'] },
];

interface Criteria {
  sectors: FundSector[];
  types: FundType[];
  riskMax?: number;
  riskMin?: number;
  wantPerf: boolean;
  wantLowVol: boolean;
  matchedKeywords: string[];
}

function riskLabel(risk: number): string {
  return ['低风险', '中低风险', '中风险', '中高风险', '高风险'][risk - 1] ?? '中风险';
}

/** 解析用户中文描述 → 结构化筛选条件 */
function parseQuery(q: string): Criteria {
  const n = q;
  const sectors: FundSector[] = [];
  const types: FundType[] = [];
  const matchedKeywords: string[] = [];
  let riskMax: number | undefined;
  let riskMin: number | undefined;
  let wantPerf = false;
  let wantLowVol = false;

  const has = (re: RegExp) => re.test(n);

  if (has(/白酒|酒|食品饮料|消费|乳业|调味/)) { sectors.push('白酒消费'); matchedKeywords.push('消费'); }
  if (has(/半导体|芯片|集成电路|光刻/)) { sectors.push('半导体'); matchedKeywords.push('半导体'); }
  if (has(/医药|医疗|生物|健康|创新药|中药|疫苗/)) { sectors.push('医药健康'); matchedKeywords.push('医药'); }
  if (has(/新能源|光伏|锂电|电池|储能|碳中和|环保|低碳/)) { sectors.push('新能源'); matchedKeywords.push('新能源'); }
  if (has(/军工|国防|航空|航天/)) { sectors.push('军工'); matchedKeywords.push('军工'); }
  if (has(/银行|券商|保险|证券|地产|金融|基建/)) { sectors.push('金融地产'); matchedKeywords.push('金融地产'); }
  if (has(/红利|低波|高股息|价值|红利低波/)) { sectors.push('红利低波'); matchedKeywords.push('红利'); }
  if (has(/港股|恒生|中概/)) { sectors.push('港股'); matchedKeywords.push('港股'); }
  if (has(/黄金|白银|商品|有色|资源/)) { sectors.push('商品'); matchedKeywords.push('黄金'); }
  if (has(/AI|人工智能|科技|计算机|软件|数字经济|游戏|传媒|云计算/)) { sectors.push('AI科技'); matchedKeywords.push('科技'); }
  if (has(/沪深300|中证500|创业板|宽基|指数增强|大盘|中小盘/)) { sectors.push('指数增强'); matchedKeywords.push('宽基'); }

  if (has(/ETF/)) types.push('ETF');
  if (has(/LOF/)) types.push('LOF');
  if (has(/指数/)) types.push('指数');
  if (has(/债券|稳健|纯债|信用债|短债/)) { types.push('债券'); riskMax = Math.min(riskMax ?? 2, 2); matchedKeywords.push('债券'); }
  if (has(/主动|混合|股票型|股票$/)) types.push('主动混合', '主动股票');
  if (has(/QDII|海外|全球/)) types.push('QDII');
  if (has(/黄金|商品/)) types.push('商品');

  if (has(/稳健|保守|低风险|波动小|回撤小|安全/)) { riskMax = Math.min(riskMax ?? 2, 2); wantLowVol = true; }
  if (has(/激进|高收益|高弹性|成长|进攻/)) { riskMin = Math.max(riskMin ?? 4, 4); }
  if (has(/近一年|一年|长期|历史业绩|收益靠前|涨得好|业绩/)) wantPerf = true;

  return { sectors, types, riskMax, riskMin, wantPerf, wantLowVol, matchedKeywords };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function scoreCatalog(item: FundCatalogItem, c: Criteria): number {
  let s = 0;
  if (c.sectors.includes(item.sector)) s += 100;
  if (c.types.includes(item.type)) s += 25;
  for (const tag of c.matchedKeywords) {
    if (item.tags.some((t) => t.includes(tag) || tag.includes(t))) s += 12;
  }
  if (c.riskMax != null) {
    if (item.risk > c.riskMax) return -1e9; // 硬过滤
    s += 20;
  }
  if (c.riskMin != null && item.risk >= c.riskMin) s += 12;
  return s;
}

function buildReason(item: FundCatalogItem, m: FundMetrics, c: Criteria): string {
  const parts: string[] = [];
  if (c.sectors.includes(item.sector)) parts.push(`匹配【${item.sector}】板块`);
  if (c.types.includes(item.type)) parts.push(`${item.type}型`);
  if (m.yRet != null) {
    parts.push(`近3月${m.yRet >= 0 ? '收益' : '涨跌'} ${m.yRet >= 0 ? '+' : ''}${m.yRet.toFixed(1)}%`);
  }
  if (m.vol != null) parts.push(`年化波动 ${m.vol.toFixed(1)}%`);
  if (m.mdd != null) parts.push(`最大回撤 ${m.mdd.toFixed(1)}%`);
  parts.push(`${riskLabel(item.risk)}`);
  if (c.wantLowVol && m.vol != null && m.vol < 8) parts.push('波动可控');
  return parts.join('，') + '。';
}

/**
 * 智能选基主函数：解析 → 匹配 → 拉取真实指标 → 排序。
 * 返回最多 topN 只基金（含真实风险收益指标与推荐理由）。
 */
export async function matchFunds(
  query: string,
  topN = 6,
): Promise<AiFundResult[]> {
  const c = parseQuery(query);
  const scored = CATALOG.map((item) => ({ item, s: scoreCatalog(item, c) })).filter(
    (x) => x.s > -1e8,
  );

  // 没有任何板块/类型命中时，退化为“全库按业绩排序”，保证有结果
  const pool =
    scored.length > 0 && scored.some((x) => x.s > 0)
      ? scored
      : CATALOG.map((item) => ({ item, s: 0 }));

  // 取关键词得分最高的前 12 只拉取真实指标（控量，避免过多请求）
  const topCandidates = [...pool].sort((a, b) => b.s - a.s).slice(0, 12);

  const withMetrics = await Promise.all(
    topCandidates.map(async ({ item, s }) => {
      const metrics = await fetchFundMetrics(item.code).catch(
        (): FundMetrics => ({ yRet: null, vol: null, mdd: null }),
      );
      let metricScore = 0;
      if (c.wantPerf && metrics.yRet != null) metricScore += clamp(metrics.yRet, -20, 40);
      if (c.wantLowVol && metrics.vol != null) metricScore += clamp(30 - metrics.vol, -10, 30);
      if (!c.wantPerf && !c.wantLowVol && metrics.yRet != null) metricScore += clamp(metrics.yRet / 2, -10, 20);
      return { item, s, metrics, score: s + metricScore };
    }),
  );

  return withMetrics
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ item, metrics, score }) => ({
      ...item,
      metrics,
      score,
      reason: buildReason(item, metrics, c),
    }));
}
