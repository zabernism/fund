import type {
  FundEstimate,
  FundSearchResult,
  IndexQuote,
  SectorInfo,
  SectorQuote,
  GoldQuote,
  SectorType,
  TrendData,
  FundTrend,
} from './types';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '请求失败');
  return json as T;
}

export const api = {
  estimate: (code: string) =>
    getJSON<FundEstimate>(`/api/fund/estimate?code=${code}`),
  search: (q: string) =>
    getJSON<{ results: FundSearchResult[] }>(
      `/api/fund/search?q=${encodeURIComponent(q)}`,
    ),
  indices: () => getJSON<{ indices: IndexQuote[] }>('/api/index/quote'),
  sectorList: (type: SectorType, q?: string) =>
    getJSON<{ sectors: SectorInfo[] }>(
      `/api/sector/list?type=${type}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    ),
  sectorQuote: (codes: string[]) =>
    getJSON<{ sectors: SectorQuote[] }>(
      `/api/sector/quote?codes=${codes.join(',')}`,
    ),
  gold: () => getJSON<{ gold: GoldQuote[] }>('/api/gold/quote'),
  trend: (secids: string[]) =>
    getJSON<{ trends: Record<string, TrendData> }>(
      `/api/trend?secids=${secids.join(',')}`,
    ),
  fundTrend: (code: string) =>
    getJSON<FundTrend>(`/api/fund/trend?code=${code}`),
};
