import type {
  FundEstimate,
  FundSearchResult,
  IndexQuote,
  SectorInfo,
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
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 基金实时估值（天天基金）
// 返回格式：jsonpgz({...});
// ---------------------------------------------------------------------------
export async function getFundEstimate(code: string): Promise<FundEstimate> {
  const text = await fetchText(
    `https://fundgz.1234567.com.cn/js/${code}.js`,
  );
  const m = text.match(/jsonpgz\(([\s\S]*)\)/);
  if (!m) throw new Error('无法解析基金估值数据');
  const d = JSON.parse(m[1]);

  const gsz = d.gsz ? Number(d.gsz) : null;
  const dwjz = d.dwjz ? Number(d.dwjz) : null;
  const gszzl =
    d.gszzl !== '' && d.gszzl != null ? Number(d.gszzl) : null;
  const trading = gsz != null;

  return {
    code: d.fundcode,
    name: d.name,
    nav: trading ? gsz : dwjz,
    lastNav: dwjz,
    changePct: gszzl,
    updateTime: d.gztime || null,
    trading,
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
// 黄金 / 贵金属（东方财富 stock/get）
// secid 格式：市场.代码。国内黄金ETF=1.518880；沪金主连=114.AU0；纽约金=101.GC0
// 字段：f43=现价 f57=代码 f58=名称 f60=昨收 f169=涨跌 f170=涨跌幅
// 逐个抓取，失败（接口不稳定/限流）自动跳过，保证面板不整体崩。
// ---------------------------------------------------------------------------
const GOLD_INSTRUMENTS: { secid: string; name: string; market: string }[] = [
  { secid: '1.518880', name: '黄金ETF·华安', market: 'A股' },
  { secid: '1.159934', name: '黄金ETF·易方达', market: 'A股' },
  { secid: '114.AU0', name: '沪金主连', market: '上期所' },
  { secid: '101.GC0', name: '纽约金·COMEX', market: 'COMEX' },
];

export async function getGoldQuotes(): Promise<GoldQuote[]> {
  const out: GoldQuote[] = [];
  await Promise.all(
    GOLD_INSTRUMENTS.map(async (g) => {
      try {
        const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${g.secid}&fields=f43,f57,f58,f60,f169,f170&fltt=2&invt=2`;
        const text = await fetchText(url, {
          Referer: 'https://push2.eastmoney.com/',
        });
        const d = JSON.parse(text);
        const data = d?.data;
        if (!data || data.f43 == null) return;
        out.push({
          secid: g.secid,
          name: data.f58 || g.name,
          market: g.market,
          price: Number(data.f43),
          prevClose: data.f60 != null ? Number(data.f60) : null,
          change: data.f169 != null ? Number(data.f169) : null,
          changePct: data.f170 != null ? Number(data.f170) : null,
        });
      } catch {
        /* 单个黄金标的失败则跳过 */
      }
    }),
  );
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
