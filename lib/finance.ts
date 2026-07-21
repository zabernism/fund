import type {
  FundEstimate,
  FundSearchResult,
  IndexQuote,
  SectorInfo,
  FundRankItem,
  SectorQuote,
  SectorType,
  GoldQuote,
  TrendData,
  TrendPoint,
  FundTrend,
} from './types';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** 带超时的文本抓取 */
async function fetchText(
  url: string,
  headers: Record<string, string> = {},
  encoding: 'utf8' | 'gbk' = 'utf8',
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, ...headers },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`上游返回 HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (encoding === 'gbk') return new TextDecoder('gbk').decode(buf);
    return buf.toString('utf8');
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 基金实时估值 / 今日净值
// 数据源降级链：
//   1) 场内 ETF/LOF：东财 push2 实时行情 → 今日真实交易价（realtime=true）
//   2) 场外开放式：新浪基金估值 fu_ 接口 → 今日盘中估算净值（trading=true）
//   3) 东财基金档案 pingzhongdata/{code}.js → Data_netWorthTrend（最新公布净值，兜底）
//   4) 东财净值历史 f10/lsjz → LSJZList（DWJZ + JZZZL，兜底）
// 说明：场外基金盘中只有「估算净值」，收盘后东财公布真实净值；场内直接取实时价。
// ---------------------------------------------------------------------------
export async function getFundEstimate(code: string): Promise<FundEstimate> {
  // 1) 场内实时行情（今日真实交易价）
  try {
    const rt = await getRealtimeQuote(code);
    if (rt) return rt;
  } catch {
    /* fallthrough */
  }
  // 2) 场外新浪盘中估算（今日净值估算）
  try {
    return await getFundEstimateSina(code);
  } catch {
    /* fallthrough */
  }
  // 3) 东财基金档案净值（最新公布，兜底）
  try {
    return await getFundNavFromPingzhong(code);
  } catch {
    /* fallthrough */
  }
  // 4) 东财净值历史兜底
  return await getFundNavFromLsjz(code);
}

/** 1) 场内 ETF/LOF 实时行情（东财 push2） */
async function getRealtimeQuote(code: string): Promise<FundEstimate | null> {
  for (const market of ['1', '0']) {
    try {
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${market}.${code}&fields=f43,f60,f57,f58,f169,f170`;
      const text = await fetchText(url, {
        Referer: 'https://quote.eastmoney.com/',
      });
      const json = JSON.parse(text);
      const d = json?.data;
      if (!d || d.f43 == null || d.f43 === '-' || d.f43 === '') {
        return null; // 非场内基金或停牌
      }
      const nav = Number(d.f43) / 1000;
      const lastNav = Number(d.f60) / 1000;
      const changePct =
        d.f170 != null && d.f170 !== '-' ? Number(d.f170) / 100 : null;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const updateTime = `${now.getFullYear()}-${pad(
        now.getMonth() + 1,
      )}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
        now.getMinutes(),
      )}`;
      return {
        code,
        name: typeof d.f58 === 'string' ? d.f58 : code,
        nav,
        lastNav,
        changePct,
        updateTime,
        trading: true,
        realtime: true,
      };
    } catch {
      /* 试下一个市场 */
    }
  }
  return null;
}

/** 2) 新浪基金估值（场外开放式基金今日盘中估算） */
async function getFundEstimateSina(code: string): Promise<FundEstimate> {
  const text = await fetchText(
    `https://hq.sinajs.cn/list=fu_${code}`,
    { Referer: 'https://finance.sina.com.cn' },
    'gbk',
  );
  const m = text.match(/hq_str_fu_\w+\s*=\s*"([^"]*)"/);
  if (!m) throw new Error('无法解析新浪基金估值数据');
  const parts = m[1].split(',');
  // 字段：0名称(GBK) 1时间 2今日估算净值 3最新公布净值 4累计净值 5? 6估算涨跌幅(%) 7日期
  const estNav = Number(parts[2]);
  const lastNav = Number(parts[3]);
  const changePct =
    parts[6] != null && parts[6] !== '' ? Number(parts[6]) : null;
  const date = parts[7];
  const time = parts[1];
  if (!estNav || Number.isNaN(estNav)) {
    throw new Error('新浪返回无效估算净值');
  }
  const updateTime = date && time ? `${date} ${time}` : date || null;
  return {
    code,
    name: parts[0] || code,
    nav: estNav,
    lastNav,
    changePct,
    updateTime,
    trading: true,
    realtime: false,
  };
}

/** 2) 东财基金档案：解析 Data_netWorthTrend 末两点得最新净值与当日涨跌 */
async function getFundNavFromPingzhong(code: string): Promise<FundEstimate> {
  const text = await fetchText(
    `https://fund.eastmoney.com/pingzhongdata/${code}.js`,
    { Referer: 'https://fundf10.eastmoney.com/' },
  );
  const nameM = text.match(/var\s+fS_name\s*=\s*"([^"]*)"/);
  const navM = text.match(
    /(?:var\s+)?Data_netWorthTrend\s*=\s*(\[[\s\S]*?\])\s*;/,
  );
  if (!navM) throw new Error('无法解析基金净值数据');
  const arr = JSON.parse(navM[1]) as {
    x: number;
    y: number;
    equityReturn: number;
  }[];
  if (!arr.length) throw new Error('基金净值数据为空');
  const last = arr[arr.length - 1];
  const prev = arr.length >= 2 ? arr[arr.length - 2] : last;
  const nav = Number(last.y);
  const lastNav = Number(prev.y);
  const changePct =
    last.equityReturn != null ? Number(last.equityReturn) : null;
  const d = new Date(last.x);
  const updateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    code,
    name: nameM ? nameM[1] : code,
    nav,
    lastNav,
    changePct,
    updateTime,
    trading: false,
    realtime: false,
  };
}

/** 3) 东财净值历史兜底 */
async function getFundNavFromLsjz(code: string): Promise<FundEstimate> {
  const navText = await fetchText(
    `https://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode=${code}&pageIndex=1&pageSize=2&startDate=&endDate=`,
    { Referer: 'https://fundf10.eastmoney.com/' },
  );
  const m = navText.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
  const navJson = JSON.parse(m ? m[1] : navText);
  const list: any[] = navJson?.Data?.LSJZList || [];
  if (!list.length) throw new Error('暂无基金净值数据');
  const sorted = [...list].sort((a, b) =>
    String(a.FSRQ ?? '').localeCompare(String(b.FSRQ ?? '')),
  );
  const last = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : last;
  const nav = Number(last.DWJZ);
  const lastNav = Number(prev.DWJZ);
  const changePct =
    last.JZZZL !== '' && last.JZZZL != null ? Number(last.JZZZL) : null;
  return {
    code,
    name: last.SHORTNAME || code,
    nav,
    lastNav,
    changePct,
    updateTime: last.FSRQ || null,
    trading: false,
    realtime: false,
  };
}

// ---------------------------------------------------------------------------
// 基金搜索（东方财富）
// 返回 JSON：{ ErrCode, Datas:[{ CODE, NAME, FundBaseInfo:{ SHORTNAME, FTYPE, DWJZ, FSRQ, JJGS } }] }
// ---------------------------------------------------------------------------
export async function getFundSearch(
  key: string,
): Promise<FundSearchResult[]> {
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(
    key,
  )}`;
  const text = await fetchText(url);
  const d = JSON.parse(text);
  if (!d.Datas || !Array.isArray(d.Datas)) return [];
  return d.Datas.slice(0, 20).map((it: any) => ({
    code: it.CODE,
    name: it.FundBaseInfo?.SHORTNAME || it.NAME || it.CODE,
    type: it.FundBaseInfo?.FTYPE || '',
    company: it.FundBaseInfo?.JJGS || '',
    nav: it.FundBaseInfo?.DWJZ != null ? Number(it.FundBaseInfo.DWJZ) : null,
    date: it.FundBaseInfo?.FSRQ || null,
  }));
}

// ---------------------------------------------------------------------------
// 大盘指数（腾讯行情）
// 返回格式：v_sh000001="1~名称~代码~当前价~昨收~今开~...~时间~涨跌~涨跌%~...";
// 名称字段为 GBK 编码，故此处写死指数名，只解析数字字段。
// ---------------------------------------------------------------------------
const INDICES: { code: string; name: string }[] = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' },
  { code: 'sh000300', name: '沪深300' },
  { code: 'sh000016', name: '上证50' },
  { code: 'sh000688', name: '科创50' },
  { code: 'sh000905', name: '中证500' },
  { code: 'sz399005', name: '中小100' },
];

export async function getIndexQuotes(): Promise<IndexQuote[]> {
  const q = INDICES.map((i) => i.code).join(',');
  const text = await fetchText(`https://qt.gtimg.cn/q=${q}`, {
    Referer: 'https://gu.qq.com/',
  });

  const out: IndexQuote[] = [];
  for (const idx of INDICES) {
    const re = new RegExp(`v_${idx.code}="([^"]*)"`);
    const m = text.match(re);
    if (!m) continue;
    const f = m[1].split('~');

    const current = Number(f[3]);
    const change = Number(f[31]);
    const changePct = Number(f[32]);
    const high = Number(f[33]);
    const low = Number(f[34]);

    let time: string | null = null;
    const raw = f[30]; // YYYYMMDDHHMMSS
    if (raw && raw.length === 14) {
      time = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(
        8,
        10,
      )}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
    }

    out.push({
      code: idx.code,
      name: idx.name,
      current,
      change,
      changePct,
      high,
      low,
      time,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 板块行情（东方财富）
// 行业板块 fs=m:90 t:2，概念板块 fs=m:90 t:1
// 单只/多选板块行情：fs=b:BKxxxx,b:BKyyyy
// 字段：f12=代码 f14=名称 f2=现价 f3=涨跌幅 f62=主力净流入
// ---------------------------------------------------------------------------
const SECTOR_FS: Record<SectorType, string> = {
  industry: 'm:90 t:2',
  concept: 'm:90 t:1',
};

async function eastmoneyClist(fs: string, fields: string): Promise<any[]> {
  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=600&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(
    fs,
  )}&fields=${fields}`;
  const text = await fetchText(url, {
    Referer: 'https://push2.eastmoney.com/',
  });
  const d = JSON.parse(text);
  return d?.data?.diff || [];
}

function mapSector(it: any, type: SectorType): SectorInfo {
  return {
    code: it.f12,
    name: it.f14,
    type,
    price: it.f2 != null ? Number(it.f2) : null,
    changePct: it.f3 != null ? Number(it.f3) : null,
    mainNetInflow: it.f62 != null ? Number(it.f62) : null,
  };
}

/** 板块目录：可选的全部行业/概念板块，支持名称模糊搜索 */
export async function getSectorList(
  type: SectorType,
  q?: string,
): Promise<SectorInfo[]> {
  const diff = await eastmoneyClist(SECTOR_FS[type], 'f12,f14,f2,f3,f62');
  let list = diff.map((it: any) => mapSector(it, type));
  if (q && q.trim()) {
    const kw = q.trim();
    list = list.filter((s) => s.name.includes(kw));
  }
  return list;
}

/** 指定板块代码的实时行情（用于自选快照） */
export async function getSectorQuotes(codes: string[]): Promise<SectorQuote[]> {
  if (codes.length === 0) return [];
  const fs = codes.map((c) => `b:${c}`).join(',');
  const diff = await eastmoneyClist(fs, 'f12,f14,f2,f3,f62');
  return diff.map((it: any) => ({
    code: it.f12,
    name: it.f14,
    price: it.f2 != null ? Number(it.f2) : null,
    changePct: it.f3 != null ? Number(it.f3) : null,
    mainNetInflow: it.f62 != null ? Number(it.f62) : null,
  }));
}

// ---------------------------------------------------------------------------
// 黄金 / 贵金属
// 纽约黄金：Sina hf_GC（COMEX 黄金期货，单位 USD/oz），GBK 名称需写死
// 国内黄金：东方财富 gold ETF 518880（黄金ETF华安，跟踪国内金价）
// 字段：f43=现价 f44=最高 f45=最低 f57=代码 f58=名称 f60=昨收 f169=涨跌 f170=涨跌幅
// ---------------------------------------------------------------------------

/** 从 Sina hf_ 系列解析国际期货行情 */
async function fetchSinaFutures(code: string, name: string, market: string): Promise<GoldQuote | null> {
  try {
    const text = await fetchText(
      `https://hq.sinajs.cn/list=${code}`,
      { Referer: 'https://finance.sina.com.cn' },
    );
    const m = text.match(/hq_str_\w+="([^"]*)"/);
    if (!m || !m[1]) return null;
    const parts = m[1].split(',');
    if (parts.length < 6) return null;
    const price = Number(parts[0]);
    const prevClose = parts[3] ? Number(parts[3]) : null;
    const high = parts[4] ? Number(parts[4]) : null;
    const low = parts[5] ? Number(parts[5]) : null;
    if (Number.isNaN(price) || price === 0) return null;
    const change = prevClose ? price - prevClose : null;
    const changePct = prevClose && prevClose !== 0 ? (change! / prevClose) * 100 : null;
    return {
      secid: code,
      name,
      market,
      price,
      prevClose,
      change,
      changePct,
      high,
      low,
    };
  } catch {
    return null;
  }
}

async function fetchTencentStock(code: string, fallbackName: string, market: string): Promise<GoldQuote | null> {
  try {
    const prefix = code.startsWith('5') || code.startsWith('6') ? 'sh' : 'sz';
    const text = await fetchText(
      `https://qt.gtimg.cn/q=${prefix}${code}`,
      { Referer: 'https://gu.qq.com/' },
    );
    const re = new RegExp(`v_${prefix}${code}="([^"]*)"`);
    const m = text.match(re);
    if (!m) return null;
    const f = m[1].split('~');
    if (f.length < 35) return null;
    const price = Number(f[3]);
    if (Number.isNaN(price) || price === 0) return null;
    const prevClose = Number(f[4]);
    const change = Number(f[31]);
    const changePct = Number(f[32]);
    const secid = `${prefix === 'sh' ? '1' : '0'}.${code}`;
    return {
      secid,
      name: fallbackName,
      market,
      price,
      prevClose: Number.isNaN(prevClose) ? null : prevClose,
      change: Number.isNaN(change) ? null : change,
      changePct: Number.isNaN(changePct) ? null : changePct,
      high: Number(f[33]) || null,
      low: Number(f[34]) || null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 银行纸黄金 / 金店品牌金价（金投网 -> 集金号 jijinhao 实时接口）
// 接口：https://api.jijinhao.com/quoteCenter/realTime.htm?codes=JO_xxx
// 返回：var quote_json = {"flag":true,"JO_xxx":{"showName":...,"q1":现价,"q70":涨跌,"q80":涨跌幅%,"unit":...}}
// 该接口对单一 IP 有频限，因此加模块级缓存（TTL 5 分钟）+ 失败兜底，
// 并用较短的内部超时避免拖慢整体黄金加载。
// ---------------------------------------------------------------------------
interface JijinhaoRow {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  unit: string | null;
}

/** 银行纸黄金（人民币 / 元·克⁻¹）代码 — 顺序对应 工行/建行/农行/中行 */
const BANK_GOLD_CODES = [
  'JO_42760', // 工行纸黄金(人民币)
  'JO_62290', // 建设银行纸黄金(人民币)
  'JO_283972', // 农行纸黄金(人民币)
  'JO_283982', // 中行纸黄金(人民币)
];

/** 金店品牌实物黄金（元·克⁻¹）代码 */
const BRAND_GOLD_CODES = [
  'JO_52694', // 周大福
  'JO_42646', // 老凤祥
  'JO_42625', // 周生生
  'JO_52683', // 中国黄金
  'JO_42638', // 菜百
];

/** 接口返回的 showName 对品牌金价多为通用“黄金价格”，这里用代码映射真实品牌名 */
const BANK_NAMES: Record<string, string> = {
  JO_42760: '工商银行纸黄金',
  JO_62290: '建设银行纸黄金',
  JO_283972: '农业银行纸黄金',
  JO_283982: '中国银行纸黄金',
};
const BRAND_NAMES: Record<string, string> = {
  JO_52694: '周大福',
  JO_42646: '老凤祥',
  JO_42625: '周生生',
  JO_52683: '中国黄金',
  JO_42638: '菜百',
};

let jijinhaoCache: { at: number; rows: JijinhaoRow[] } | null = null;
const JIJINHAO_TTL = 5 * 60 * 1000;

async function fetchJijinhaoOnce(codes: string[]): Promise<JijinhaoRow[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  let text: string;
  try {
    const res = await fetch(
      `https://api.jijinhao.com/quoteCenter/realTime.htm?codes=${codes.join(',')}`,
      {
        headers: {
          'User-Agent': UA,
          Referer: 'https://quote.cngold.org/gjs/yhzhj_ghzhj.html',
        },
        signal: ctrl.signal,
        cache: 'no-store',
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }
  const m = text.match(/var quote_json\s*=\s*(\{[\s\S]*\})/);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const rows: JijinhaoRow[] = [];
  for (const k of Object.keys(data)) {
    if (k === 'flag') continue;
    const v = data[k];
    if (!v || typeof v !== 'object') continue;
    rows.push({
      code: k,
      name: v.showName ?? k,
      price: v.q1 != null ? Number(v.q1) : null,
      change: v.q70 != null ? Number(v.q70) : null,
      changePct: v.q80 != null ? Number(v.q80) : null,
      unit: v.unit ?? null,
    });
  }
  return rows;
}

/** 带缓存的银行/金店金价抓取；限流或失败时回退到上次成功的缓存（可能为空） */
async function fetchJijinhaoQuotes(): Promise<JijinhaoRow[]> {
  const now = Date.now();
  if (jijinhaoCache && now - jijinhaoCache.at < JIJINHAO_TTL) {
    return jijinhaoCache.rows;
  }
  const codes = [...BANK_GOLD_CODES, ...BRAND_GOLD_CODES];
  try {
    const rows = await fetchJijinhaoOnce(codes);
    if (rows.length > 0) {
      jijinhaoCache = { at: now, rows };
      return rows;
    }
  } catch {
    // 限流/超时：忽略，使用缓存兜底
  }
  return jijinhaoCache?.rows ?? [];
}

export async function getGoldQuotes(): Promise<GoldQuote[]> {
  const [comex, jijinhao] = await Promise.all([
    fetchSinaFutures('hf_GC', '纽约黄金', 'COMEX'),
    fetchJijinhaoQuotes().catch(() => [] as JijinhaoRow[]),
  ]);

  const out: GoldQuote[] = [];
  // 仅保留国际现货（COMEX 纽约黄金）；国内黄金(华安 518880) 已按需求移除
  if (comex) out.push({ ...comex, category: 'spot' });

  const allCodes = new Set([...BANK_GOLD_CODES, ...BRAND_GOLD_CODES]);
  for (const r of jijinhao) {
    if (!allCodes.has(r.code)) continue;
    // 仅保留“黄金”类，避免误带白银/铂金/钯金
    if (!/黄金/.test(r.name)) continue;
    const isBank = BANK_GOLD_CODES.includes(r.code);
    const displayName = isBank
      ? BANK_NAMES[r.code] ?? r.name
      : BRAND_NAMES[r.code] ?? r.name;
    const prevClose =
      r.price != null && r.changePct != null
        ? r.price / (1 + r.changePct / 100)
        : null;
    out.push({
      secid: r.code,
      name: displayName,
      market: isBank ? '银行纸黄金' : '金店品牌',
      price: r.price,
      prevClose,
      change: r.change,
      changePct: r.changePct,
      high: null,
      low: null,
      category: isBank ? 'bank' : 'brand',
      unit: r.unit ?? '元/克',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 分时序列（东方财富 trends2）
// 分时图线取每分钟“最新价”（字段 f53，字符串第 3 段，索引 2）。
// 板块 secid 形如 90.BKxxxx；黄金 secid 形如 1.518880。
// 逐个抓取，失败自动跳过。
// ---------------------------------------------------------------------------
const TREND_FIELDS2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';

export async function getTrend(secids: string[]): Promise<Record<string, TrendData>> {
  const out: Record<string, TrendData> = {};
  await Promise.all(
    secids.map(async (secid) => {
      try {
        const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=${TREND_FIELDS2}&iscr=0&ndays=1&forcect=1`;
        const text = await fetchText(url, {
          Referer: 'https://push2.eastmoney.com/',
        });
        const d = JSON.parse(text);
        const data = d?.data;
        if (!data || !Array.isArray(data.trends)) return;
        const prevClose =
          data.preClose != null ? Number(data.preClose) : null;
        const points: TrendPoint[] = [];
        for (const row of data.trends) {
          const parts = String(row).split(',');
          if (parts.length < 3) continue;
          const t = parts[0];
          const price = Number(parts[2]); // f53 = 最新价
          if (!Number.isNaN(price)) points.push({ t, price });
        }
        if (points.length) out[secid] = { prevClose, points };
      } catch {
        /* 单个标的失败则跳过 */
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// 基金走势：优先场内分时(trends2)，拿不到则回退每日净值走势(f10/lsjz)
// - 场内基金（LOF/ETF，如 161725 白酒LOF）有交易所逐分钟分时数据；
// - 普通开放式基金一天只有一个净值，无盘中分时，用近 30 日净值历史替代。
// secid 市场前缀：沪市(5/6 开头) = 1，深市(其余) = 0。
// ---------------------------------------------------------------------------
export async function getFundTrend(code: string): Promise<FundTrend> {
  const market = code.startsWith('5') || code.startsWith('6') ? '1' : '0';
  const secid = `${market}.${code}`;

  // 1) 尝试场内分时
  try {
    const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1&forcect=1`;
    const text = await fetchText(url, {
      Referer: 'https://push2.eastmoney.com/',
    });
    const d = JSON.parse(text);
    const data = d?.data;
    if (data && Array.isArray(data.trends) && data.trends.length > 1) {
      const prevClose = data.preClose != null ? Number(data.preClose) : null;
      const points: TrendPoint[] = [];
      for (const row of data.trends) {
        const parts = String(row).split(',');
        if (parts.length < 3) continue;
        const price = Number(parts[2]); // f53 = 最新价
        if (!Number.isNaN(price)) points.push({ t: parts[0], price });
      }
      if (points.length) {
        return {
          code,
          name: data.name || null,
          type: 'intraday',
          prevClose,
          points,
        };
      }
    }
  } catch {
    /* 场内无分时则回退净值 */
  }

  // 2) 回退：每日净值走势（全部开放式基金通用）
  const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode=${code}&pageIndex=1&pageSize=30&startDate=&endDate=`;
  const navText = await fetchText(navUrl, {
    Referer: 'https://fundf10.eastmoney.com/',
  });
  const m = navText.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
  const navJson = JSON.parse(m ? m[1] : navText);
  const list: any[] = navJson?.Data?.LSJZList || [];
  if (!list.length) throw new Error('暂无基金走势数据');
  const chrono = [...list].reverse(); // 旧 -> 新
  const points: TrendPoint[] = chrono.map((it: any) => ({
    t: it.FSRQ,
    price: Number(it.DWJZ),
  }));
  const prevClose =
    points.length >= 2
      ? points[points.length - 2].price
      : points[points.length - 1].price;
  return { code, name: null, type: 'nav', prevClose, points };
}

// ---------------------------------------------------------------------------
// 基金排行榜（涨幅榜 / 跌幅榜）
// 对一批热门基金批量抓取估值 + 近30日净值，本地排序后返回 topN。
// 板块按名称关键词推断；资金流向暂不可靠获取（东方财富资金流 API 限流），
// 用「近30日涨跌」和「当日涨跌」作为核心排序依据。
// ---------------------------------------------------------------------------

/** 热门基金代码池——覆盖主流板块，用于排行 */
const RANK_POOL: string[] = [
  // AI / 科技
  '012349', // 天弘恒生科技ETF联接C
  '159869', // 景顺长城创业板50ETF
  '515070', // 人保沪深300ETF
  '007467', // 华泰柏瑞中证红利低波ETF联接C
  '160706', // 嘉实沪深300ETF联接A
  '011803', // 景顺长城宁景6个月持有混合A
  '014089', // 永赢稳健增强债券C
  '011103', // 天弘中证光伏产业指数C
  // 半导体
  '512480', // 国联安中证半导体ETF
  '159819', // 天弘中证芯片指数C
  '161725', // 白酒LOF (招商中证白酒)
  '004851', // 鹏华酒A
  // 医药
  '161726', // 招商国证生物医药
  '011301', // 华宝医疗ETF联接C
  '162412', // 华宝医疗
  // 新能源 / 光伏
  '011103', // 光伏产业
  '164825', // 新能源车LOF
  '501059', // 西部利得新能源汽车
  // 军工
  '163115', // 申万菱信中证军工
  '005693', // 前海开源中证军工
  // 金融地产
  '001594', // 天弘银行ETF联接A
  '160628', // 鹏华中证800地产
  // 红利低波
  '007467', // 红利低波
  '003095', // 中金红利
  // 港股
  '006990', // 南方恒生科技
  '501311', // 易方达恒生H股
  // 债券
  '014089', // 永赢稳健增强债券C
  '110017', // 易方达增强回报A
  '000192', // 易方达双债增强A
  // 商品 / 黄金
  '000307', // 建信易方达黄金
  '161116', // 易方达黄金
];

/** 按基金名称推断归属板块 */
export function classifyFundSector(name: string): FundRankItem['sector'] {
  const n = name;
  if (/AI|人工智能|科技|恒生科技|计算机|软件|云计算/.test(n)) return 'AI科技';
  if (/半导体|芯片|集成电路|电子|光刻/.test(n)) return '半导体';
  if (/白酒|酒|消费|食品|饮料|乳业|调味/.test(n)) return '白酒消费';
  if (/医药|生物|健康|创新药|中药|疫苗|医疗/.test(n)) return '医药健康';
  if (/新能源|光伏|风电|锂电|电池|储能|碳中和/.test(n)) return '新能源';
  if (/军工|国防|航空|航天|航海/.test(n)) return '军工';
  if (/银行|保险|券商|证券|地产|建筑|基建/.test(n)) return '金融地产';
  if (/红利|低波|高股息|价值|稳健/.test(n)) return '红利低波';
  if (/港股|恒生|中概/.test(n)) return '港股';
  if (/债|货币|短融|纯债|信用/.test(n)) return '债券';
  if (/黄金|白银|商品|有色|资源/.test(n)) return '商品';
  if (/增强|量化|多因子|对冲/.test(n)) return '指数增强';
  return '其他';
}

/** 抓取单只基金近30日收益率（从净值历史计算），并附带当日涨跌幅作为兜底 */
async function fetchFundReturn30d(
  code: string,
): Promise<{ r30d: number | null; daily: number | null }> {
  try {
    const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode=${code}&pageIndex=1&pageSize=30&startDate=&endDate=`;
    const navText = await fetchText(navUrl, {
      Referer: 'https://fundf10.eastmoney.com/',
    });
    const m = navText.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
    const navJson = JSON.parse(m ? m[1] : navText);
    const list: any[] = navJson?.Data?.LSJZList || [];
    if (list.length < 2) return { r30d: null, daily: null };
    // 按日期升序排序（FSRQ 可能为 yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss）
    const sorted = [...list].sort((a, b) =>
      String(a.FSRQ ?? '').localeCompare(String(b.FSRQ ?? '')),
    );
    const oldest = Number(sorted[0].DWJZ);
    const newest = Number(sorted[sorted.length - 1].DWJZ);
    const prev = Number(sorted[sorted.length - 2].DWJZ);
    const r30d =
      oldest && newest ? ((newest - oldest) / oldest) * 100 : null;
    const daily = prev && newest ? ((newest - prev) / prev) * 100 : null;
    return { r30d, daily };
  } catch {
    return { r30d: null, daily: null };
  }
}

export interface FundMetrics {
  /** 近1年收益率（%）——取约 250 个交易日窗口 */
  yRet: number | null;
  /** 年化波动率（%） */
  vol: number | null;
  /** 最大回撤（%），负值 */
  mdd: number | null;
}

/**
 * 从净值历史计算真实风险收益指标：区间收益、年化波动、最大回撤。
 * 东方财富 lsjz 单页最多返回 20 条，故按 pages 翻页合并（pages=3 ≈ 近3月）。
 * 失败或样本不足时返回 null。
 */
export async function fetchFundMetrics(
  code: string,
  pages = 3,
): Promise<FundMetrics> {
  try {
    const pageFetches = Array.from({ length: pages }, (_, i) => {
      const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode=${code}&pageIndex=${i + 1}&pageSize=20&startDate=&endDate=`;
      return fetchText(navUrl, { Referer: 'https://fundf10.eastmoney.com/' })
        .then((txt) => {
          const m = txt.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
          const j = JSON.parse(m ? m[1] : txt);
          return (j?.Data?.LSJZList || []) as any[];
        })
        .catch(() => [] as any[]);
    });
    const pagesData = await Promise.all(pageFetches);
    const seen = new Set<string>();
    const list: any[] = [];
    for (const arr of pagesData) {
      for (const it of arr) {
        const key = String(it.FSRQ ?? '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        list.push(it);
      }
    }
    if (list.length < 15) return { yRet: null, vol: null, mdd: null };
    const sorted = [...list].sort((a, b) =>
      String(a.FSRQ ?? '').localeCompare(String(b.FSRQ ?? '')),
    );
    const navs = sorted.map((x) => Number(x.DWJZ)).filter((n) => n > 0);
    if (navs.length < 15) return { yRet: null, vol: null, mdd: null };

    const first = navs[0];
    const last = navs[navs.length - 1];
    const yRet = first && last ? ((last - first) / first) * 100 : null;

    // 日收益率序列
    const rets: number[] = [];
    for (let i = 1; i < navs.length; i++) {
      rets.push((navs[i] - navs[i - 1]) / navs[i - 1]);
    }
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance =
      rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // 最大回撤
    let peak = navs[0];
    let mdd = 0;
    for (const n of navs) {
      if (n > peak) peak = n;
      const dd = (n - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
    return { yRet, vol, mdd: mdd * 100 };
  } catch {
    return { yRet: null, vol: null, mdd: null };
  }
}

/** 获取基金排行榜：返回涨幅前 N + 跌幅前 N */
const RANK_TOP_N = 10; // 每个方向取 N 只

export async function getFundRank(): Promise<{ gainers: FundRankItem[]; losers: FundRankItem[] }> {
  // 并行抓取所有热门基金的估值（去重）
  const pool = Array.from(new Set(RANK_POOL));
  const results: {
    code: string;
    est?: FundEstimate | null;
    r30d?: number | null;
    daily?: number | null;
  }[] = await Promise.all(
    pool.map(async (code) => {
      try {
        const [est, hist] = await Promise.all([
          getFundEstimate(code).catch(() => null),
          fetchFundReturn30d(code),
        ]);
        return { code, est: est as FundEstimate | null, r30d: hist.r30d, daily: hist.daily };
      } catch {
        return { code };
      }
    }),
  );

  const items: FundRankItem[] = [];
  for (const { code, est, r30d, daily } of results) {
    if (!est) continue;
    // 当日涨跌幅：优先用估值接口（交易时段最准），否则用净值历史兜底
    const changePct = est.changePct != null ? est.changePct : daily ?? null;
    items.push({
      code,
      name: est.name,
      changePct,
      nav: est.nav,
      return30d: r30d ?? null,
      sector: classifyFundSector(est.name),
    });
  }

  // 按 changePct 排序
  items.sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));

  const gainers = items.filter((i) => i.changePct != null && i.changePct > 0).slice(0, RANK_TOP_N);
  const losers = [...items]
    .reverse()
    .filter((i) => i.changePct != null && i.changePct < 0)
    .slice(0, RANK_TOP_N);

  return { gainers, losers };
}
