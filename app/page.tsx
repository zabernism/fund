'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type {
  FundEstimate,
  IndexQuote,
  SectorQuote,
  SectorWatchItem,
  GoldQuote,
  TrendData,
  FundCost,
  FundTrend,
  FundRankItem,
} from '@/lib/types';
import { isTradingNow } from '@/lib/format';
import MarketOverview from '@/components/MarketOverview';
import AddFund from '@/components/AddFund';
import FundRow from '@/components/FundRow';
import TopAppBar from '@/components/TopAppBar';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import HoldingsCard from '@/components/HoldingsCard';
import SearchOverlay from '@/components/SearchOverlay';
import SettingsSheet from '@/components/SettingsSheet';
import { toEmSecid } from '@/components/DesktopSidebar';
import AssetAllocation from '@/components/AssetAllocation';
import GoldPanelMobile from '@/components/GoldPanelMobile';
import FundRanking from '@/components/FundRanking';
import AiSidebarWidget from '@/components/AiSidebarWidget';
import ViewSwitch, { type ViewMode } from '@/components/ViewSwitch';
import DesktopNavRail, { type DesktopNavTab } from '@/components/DesktopNavRail';
import DesktopHeader from '@/components/DesktopHeader';
import PreciousMetalsCard from '@/components/PreciousMetalsCard';
import IndicesCard from '@/components/IndicesCard';
import DesktopHoldings from '@/components/DesktopHoldings';

const STORAGE_FUNDS = 'fund-dashboard:codes';
const STORAGE_SECTORS = 'fund-dashboard:sectors';
const STORAGE_COSTS = 'fund-dashboard:costs';
// 用户自选基金（截图持仓）
const DEFAULT_CODES = ['011803', '014089', '007467', '160706', '012349', '011103'];
/** 默认持仓金额/盈亏（来自用户截图，首次使用自动填入） */
const DEFAULT_COSTS: Record<string, { amount: number; pnl: number }> = {
  '011803': { amount: 17616.23, pnl: 1010.95 },
  '014089': { amount: 29957.20, pnl: 592.02 },
  '007467': { amount: 33959.49, pnl: -700.47 },
  '160706': { amount: 19827.46, pnl: 359.25 },
  '012349': { amount: 29108.43, pnl: -5931.68 },
  '011103': { amount: 8957.64, pnl: -2124.86 },
};
const REFRESH_MS = 5000;

export default function Page() {
  const [codes, setCodes] = useState<string[]>([]);
  const [funds, setFunds] = useState<Record<string, FundEstimate>>({});
  const [fundErrors, setFundErrors] = useState<Record<string, string>>({});
  const [costMap, setCostMap] = useState<Record<string, FundCost>>({});

  const [sectors, setSectors] = useState<SectorWatchItem[]>([]);
  const [sectorQuotes, setSectorQuotes] = useState<Record<string, SectorQuote>>({});
  const [gold, setGold] = useState<GoldQuote[]>([]);
  const [trends, setTrends] = useState<Record<string, TrendData>>({});
  const [rankData, setRankData] = useState<{ gainers: FundRankItem[]; losers: FundRankItem[] }>({
    gainers: [],
    losers: [],
  });

  const [indices, setIndices] = useState<IndexQuote[]>([]);

  const [loading, setLoading] = useState({
    funds: true,
    indices: true,
    sectors: true,
    gold: true,
    trends: true,
    rank: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [booted, setBooted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);
  /** PC 端导航：holdings=持仓 / ranking=涨跌榜 / markets=贵金属+指数 */
  const [desktopNav, setDesktopNav] = useState<DesktopNavTab>('holdings');
  const [fundTrends, setFundTrends] = useState<
    Record<string, FundTrend | 'loading' | 'error'>
  >({});

  // 预览强制开关：?view=desktop / ?view=mobile 可无视视口宽度查看指定端（默认 auto 走响应式）
  const [forceView, setForceView] = useState<'auto' | 'desktop' | 'mobile'>(
    'auto'
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'desktop' || v === 'mobile') setForceView(v);
  }, []);

  // 视图切换：同步 state + URL，刷新后保持
  const handleViewChange = (v: ViewMode) => {
    setForceView(v);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (v === 'auto') url.searchParams.delete('view');
    else url.searchParams.set('view', v);
    window.history.replaceState({}, '', url.toString());
  };

  const [activeTab, setActiveTab] = useState<TabKey>('holdings');
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 悬浮 AI 智能选基面板开关（受控传给 AiSidebarWidget）
  const [aiOpen, setAiOpen] = useState(false);

  // ---- 主题（浅色 / 深色 / 跟随系统 / 护眼） ----
  const [theme, setTheme] = useState<'light' | 'dark' | 'system' | 'eye'>(
    'system',
  );
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fund-dashboard:theme');
      if (
        stored === 'light' ||
        stored === 'dark' ||
        stored === 'system' ||
        stored === 'eye'
      ) {
        setTheme(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const applyTheme = (t: 'light' | 'dark' | 'system' | 'eye') => {
    setTheme(t);
    try {
      localStorage.setItem('fund-dashboard:theme', t);
    } catch {
      /* ignore */
    }
    const el = document.documentElement;
    el.setAttribute('data-theme', t);
    const dark =
      t === 'dark' ||
      (t === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    el.style.colorScheme = dark ? 'dark' : 'light';
  };

  const codesRef = useRef(codes);
  useEffect(() => {
    codesRef.current = codes;
  }, [codes]);
  const sectorsRef = useRef(sectors);
  useEffect(() => {
    sectorsRef.current = sectors;
  }, [sectors]);
  const goldRef = useRef(gold);
  useEffect(() => {
    goldRef.current = gold;
  }, [gold]);
  const expandedFundRef = useRef(expandedFund);
  useEffect(() => {
    expandedFundRef.current = expandedFund;
  }, [expandedFund]);
  const indicesRef = useRef(indices);
  useEffect(() => {
    indicesRef.current = indices;
  }, [indices]);

  // ---- 数据抓取 ----
  const fetchFunds = useCallback(async () => {
    const cs = codesRef.current;
    if (cs.length === 0) {
      setFunds({});
      setFundErrors({});
      setLoading((l) => ({ ...l, funds: false }));
      return;
    }
    setLoading((l) => ({ ...l, funds: true }));
    const results = await Promise.all(
      cs.map(async (code) => {
        try {
          const data = await api.estimate(code);
          return { code, data, error: null as string | null };
        } catch (e: any) {
          return { code, data: null, error: e?.message || '获取失败' };
        }
      }),
    );
    const f: Record<string, FundEstimate> = {};
    const er: Record<string, string> = {};
    results.forEach((r) => {
      if (r.data) f[r.code] = r.data;
      else er[r.code] = r.error || '获取失败';
    });
    setFunds(f);
    setFundErrors(er);
    setLoading((l) => ({ ...l, funds: false }));
  }, []);

  const fetchIndices = useCallback(async () => {
    setLoading((l) => ({ ...l, indices: true }));
    try {
      const { indices } = await api.indices();
      setIndices(indices);
    } catch {
      /* 静默失败，保留上一次数据 */
    } finally {
      setLoading((l) => ({ ...l, indices: false }));
    }
  }, []);

  const fetchSectors = useCallback(async () => {
    const cs = sectorsRef.current.map((s) => s.code);
    if (cs.length === 0) {
      setSectorQuotes({});
      setLoading((l) => ({ ...l, sectors: false }));
      return;
    }
    setLoading((l) => ({ ...l, sectors: true }));
    try {
      const { sectors } = await api.sectorQuote(cs);
      const map: Record<string, SectorQuote> = {};
      sectors.forEach((s) => (map[s.code] = s));
      setSectorQuotes(map);
    } catch {
      /* 静默失败 */
    } finally {
      setLoading((l) => ({ ...l, sectors: false }));
    }
  }, []);

  const fetchGold = useCallback(async () => {
    setLoading((l) => ({ ...l, gold: true }));
    try {
      const { gold } = await api.gold();
      setGold(gold);
    } catch {
      /* 静默失败 */
    } finally {
      setLoading((l) => ({ ...l, gold: false }));
    }
  }, []);

  const fetchTrend = useCallback(async () => {
    const secids = [
      ...goldRef.current.map((g) => g.secid),
      ...sectorsRef.current.map((s) => `90.${s.code}`),
      ...indicesRef.current.map((i) => toEmSecid(i.code)),
    ];
    if (secids.length === 0) {
      setTrends({});
      setLoading((l) => ({ ...l, trends: false }));
      return;
    }
    setLoading((l) => ({ ...l, trends: true }));
    try {
      const { trends } = await api.trend(secids);
      setTrends(trends);
    } catch {
      /* 静默失败 */
    } finally {
      setLoading((l) => ({ ...l, trends: false }));
    }
  }, []);

  const fetchRank = useCallback(async () => {
    setLoading((l) => ({ ...l, rank: true }));
    try {
      const { gainers, losers } = await api.rank();
      setRankData({ gainers, losers });
    } catch {
      /* 静默失败 */
    } finally {
      setLoading((l) => ({ ...l, rank: false }));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchFunds(),
      fetchIndices(),
      fetchSectors(),
      fetchGold(),
      fetchTrend(),
      fetchRank(),
    ]);
    const ef = expandedFundRef.current;
    if (ef) {
      api
        .fundTrend(ef)
        .then((d) => setFundTrends((m) => ({ ...m, [ef]: d })))
        .catch(() => {});
    }
    setLastUpdated(new Date());
  }, [fetchFunds, fetchIndices, fetchSectors, fetchGold, fetchTrend, fetchRank]);

  // ---- 初始化：读取本地自选 ----
  useEffect(() => {
    const rawF = localStorage.getItem(STORAGE_FUNDS);
    if (rawF) {
      try {
        const p = JSON.parse(rawF);
        setCodes(Array.isArray(p) ? p : DEFAULT_CODES);
      } catch {
        setCodes(DEFAULT_CODES);
      }
    } else {
      setCodes(DEFAULT_CODES);
      localStorage.setItem(STORAGE_FUNDS, JSON.stringify(DEFAULT_CODES));
    }

    const rawS = localStorage.getItem(STORAGE_SECTORS);
    if (rawS) {
      try {
        const p = JSON.parse(rawS);
        if (Array.isArray(p)) setSectors(p);
      } catch {
        /* ignore */
      }
    }

    const rawC = localStorage.getItem(STORAGE_COSTS);
    if (rawC) {
      try {
        const p = JSON.parse(rawC);
        if (p && typeof p === 'object' && Object.keys(p).length > 0) {
          // 迁移旧格式 {cost, shares} → 新格式 {amount, pnl}
          const migrated: Record<string, FundCost> = {};
          for (const [k, v] of Object.entries(p)) {
            const old = v as any;
            if ('cost' in old || 'shares' in old) {
              const amt = old.cost != null && old.shares != null ? old.cost * old.shares : null;
              migrated[k] = { amount: amt, pnl: amt != null ? 0 : null };
            } else {
              migrated[k] = { amount: old.amount ?? null, pnl: old.pnl ?? null };
            }
          }
          setCostMap(migrated);
          localStorage.setItem(STORAGE_COSTS, JSON.stringify(migrated));
        } else {
          setCostMap(DEFAULT_COSTS);
          localStorage.setItem(STORAGE_COSTS, JSON.stringify(DEFAULT_COSTS));
        }
      } catch {
        setCostMap(DEFAULT_COSTS);
        localStorage.setItem(STORAGE_COSTS, JSON.stringify(DEFAULT_COSTS));
      }
    } else {
      setCostMap(DEFAULT_COSTS);
      localStorage.setItem(STORAGE_COSTS, JSON.stringify(DEFAULT_COSTS));
    }
    setBooted(true);
  }, []);

  // ---- 定时刷新：每 5 秒全量刷新 ----
  useEffect(() => {
    if (!booted) return;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await fetchAll();
      } finally {
        inFlight = false;
      }
    };
    tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [booted, fetchAll]);

  // ---- 自选操作 ----
  const addFund = (code: string) => {
    const c = code.trim();
    if (!/^\d{6}$/.test(c) || codes.includes(c)) return;
    setCodes((prev) => {
      const next = [...prev, c];
      localStorage.setItem(STORAGE_FUNDS, JSON.stringify(next));
      return next;
    });
    api
      .estimate(c)
      .then((d) => setFunds((f) => ({ ...f, [c]: d })))
      .catch((e) =>
        setFundErrors((er) => ({ ...er, [c]: e?.message || '获取失败' })),
      );
  };

  const removeFund = (code: string) => {
    setCodes((prev) => {
      const next = prev.filter((c) => c !== code);
      localStorage.setItem(STORAGE_FUNDS, JSON.stringify(next));
      return next;
    });
    setFunds((f) => {
      const n = { ...f };
      delete n[code];
      return n;
    });
    setFundErrors((er) => {
      const n = { ...er };
      delete n[code];
      return n;
    });
    setCostMap((m) => {
      const n = { ...m };
      delete n[code];
      localStorage.setItem(STORAGE_COSTS, JSON.stringify(n));
      return n;
    });
    if (editing === code) setEditing(null);
  };

  const saveCost = (code: string, amount: number | null, pnl: number | null) => {
    setCostMap((prev) => {
      const next = { ...prev, [code]: { amount, pnl } };
      localStorage.setItem(STORAGE_COSTS, JSON.stringify(next));
      return next;
    });
    setEditing(null);
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const toggleFundTrend = (code: string) => {
    if (expandedFund === code) {
      setExpandedFund(null);
      return;
    }
    setExpandedFund(code);
    if (!fundTrends[code]) {
      setFundTrends((m) => ({ ...m, [code]: 'loading' }));
      api
        .fundTrend(code)
        .then((d) => setFundTrends((m) => ({ ...m, [code]: d })))
        .catch(() => setFundTrends((m) => ({ ...m, [code]: 'error' })));
    }
  };

  // ---- 收益计算 ----
  const trading = isTradingNow();
  const upCount = codes.filter(
    (c) => funds[c]?.changePct != null && funds[c]!.changePct! > 0,
  ).length;
  const downCount = codes.filter(
    (c) => funds[c]?.changePct != null && funds[c]!.changePct! < 0,
  ).length;

  const totals = useMemo(() => {
    let totalProfit = 0;
    let totalCost = 0;
    let marketValue = 0;
    let todayPnL = 0;
    codes.forEach((c) => {
      const f = funds[c];
      const cost = costMap[c];
      if (cost?.amount != null) {
        const amt = cost.amount;
        const pnl = cost.pnl ?? 0;
        marketValue += amt;
        totalProfit += pnl;
        totalCost += amt - pnl;
        if (f?.changePct != null) {
          todayPnL += (amt * f.changePct) / 100;
        }
      }
    });
    const totalPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const todayPct = totalCost > 0 ? (todayPnL / totalCost) * 100 : 0;
    return { totalProfit, totalPct, marketValue, todayPnL, todayPct, hasCost: totalCost > 0 || marketValue > 0 };
  }, [codes, funds, costMap]);

  const onNav = (k: TabKey) => {
    if (k === 'settings') {
      setSettingsOpen(true);
      return;
    }
    if (k === 'ai') {
      // AI 推荐已改为右下角悬浮「小人」，底部导航的智能标签负责展开/收起
      setAiOpen((o) => !o);
      return;
    }
    setActiveTab(k);
  };

  const clearFunds = () => {
    setCodes([]);
    setFunds({});
    setFundErrors({});
    setCostMap({});
    localStorage.removeItem(STORAGE_FUNDS);
    localStorage.removeItem(STORAGE_COSTS);
  };
  const clearSectors = () => {
    setSectors([]);
    setSectorQuotes({});
    localStorage.removeItem(STORAGE_SECTORS);
  };
  const clearCosts = () => {
    setCostMap({});
    localStorage.removeItem(STORAGE_COSTS);
  };
  const clearAll = () => {
    clearFunds();
    clearSectors();
  };

  const exportData = () => {
    const data = {
      codes,
      sectors,
      costs: costMap,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fund-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result as string);
        if (Array.isArray(p.codes)) {
          const valid = p.codes.filter((c: any) => typeof c === 'string' && /^\d{6}$/.test(c));
          setCodes(valid);
          localStorage.setItem(STORAGE_FUNDS, JSON.stringify(valid));
        }
        if (Array.isArray(p.sectors)) {
          setSectors(p.sectors);
          localStorage.setItem(STORAGE_SECTORS, JSON.stringify(p.sectors));
        }
        if (p.costs && typeof p.costs === 'object') {
          setCostMap(p.costs);
          localStorage.setItem(STORAGE_COSTS, JSON.stringify(p.costs));
        }
      } catch {
        /* ignore parse errors */
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="min-h-screen">
      {/* 移动端 TERMINAL.A */}
      <div className={forceView === 'desktop' ? 'hidden' : forceView === 'mobile' ? 'block' : 'lg:hidden'}>
        <div className="top-accent" />
        <TopAppBar
          trading={trading}
          lastUpdated={lastUpdated}
          onSearch={() => setSearchOpen(true)}
          onRefresh={manualRefresh}
          refreshing={refreshing}
          view={forceView}
          onViewChange={handleViewChange}
        />

        <div className="mx-auto max-w-md space-y-4 px-3 pb-24 pt-[4.25rem]">
        {activeTab === 'markets' && (
          <>
            <MarketOverview
              indices={indices}
              loading={loading.indices}
              trends={trends}
            />

            <HoldingsCard
              hasCost={totals.hasCost}
              totalProfit={totals.totalProfit}
              totalPct={totals.totalPct}
              marketValue={totals.marketValue}
              todayPnL={totals.todayPnL}
              todayPct={totals.todayPct}
              upCount={upCount}
              downCount={downCount}
            />

            <GoldPanelMobile
              gold={gold}
              trends={trends}
              loading={loading.gold}
            />

            <FundRanking
              gainers={rankData.gainers}
              losers={rankData.losers}
              loading={loading.rank}
            />
          </>
        )}

        {activeTab === 'holdings' && (
          <>
            <HoldingsCard
              hasCost={totals.hasCost}
              totalProfit={totals.totalProfit}
              totalPct={totals.totalPct}
              marketValue={totals.marketValue}
              todayPnL={totals.todayPnL}
              todayPct={totals.todayPct}
              upCount={upCount}
              downCount={downCount}
            />

            <AssetAllocation
              funds={funds}
              costMap={costMap}
              hasCost={totals.hasCost}
            />

            <div className="px-1">
              <AddFund existing={codes} onAdd={addFund} />
            </div>

            <div className="flex items-center gap-2 px-1 pt-1">
              <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">核心自选</h2>
            </div>

            <div className="space-y-2.5">
              {codes.length === 0 ? (
                <div className="glass-soft px-4 py-8 text-center text-sm text-[var(--muted)]">
                  还没有自选基金，用上方输入框添加吧
                </div>
              ) : (
                codes.map((code) => (
                  <FundRow
                    key={code}
                    code={code}
                    fund={funds[code]}
                    error={fundErrors[code]}
                    cost={costMap[code]}
                    expanded={expandedFund === code}
                    onToggle={() => toggleFundTrend(code)}
                    trend={fundTrends[code]}
                    editing={editing === code}
                    onEditToggle={() => setEditing(editing === code ? null : code)}
                    onSaveCost={(c, s) => saveCost(code, c, s)}
                    onCancelEdit={() => setEditing(null)}
                    onRemove={() => removeFund(code)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav active={aiOpen ? 'ai' : activeTab} onChange={onNav} />

      {/* 手机端视图切换（桌面版 / 手机版），悬浮在底部导航上方左侧，避免与右下角 AI 小人重叠 */}
      <div className="fixed bottom-[4.5rem] left-3 z-[110]">
        <ViewSwitch value={forceView} onChange={handleViewChange} variant="mobile" />
      </div>
      </div>

      {/* 桌面端 — 匹配 redesign-preview.html：flex 水平布局（左侧导航 + 右侧内容） */}
      <div className={forceView === 'mobile' ? 'hidden' : forceView === 'desktop' ? 'alpha flex h-screen overflow-hidden' : 'alpha hidden lg:flex lg:h-screen lg:overflow-hidden'}>
        <DesktopNavRail
          theme={theme}
          onThemeChange={applyTheme}
          onOpenSettings={() => setSettingsOpen(true)}
          activeNav={desktopNav}
          onNavChange={setDesktopNav}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <DesktopHeader
            onSearch={() => setSearchOpen(true)}
            lastUpdated={lastUpdated}
            view={forceView}
            onViewChange={handleViewChange}
          />

          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
              {desktopNav === 'holdings' && (
                <DesktopHoldings
                  codes={codes}
                  funds={funds}
                  fundErrors={fundErrors}
                  costMap={costMap}
                  expandedFund={expandedFund}
                  onToggle={toggleFundTrend}
                  fundTrends={fundTrends}
                  editing={editing}
                  onEditToggle={(c) => setEditing(editing === c ? null : c)}
                  onSaveCost={saveCost}
                  onCancelEdit={() => setEditing(null)}
                  onRemove={removeFund}
                  onAddFund={() => setSearchOpen(true)}
                />
              )}

              {desktopNav === 'ranking' && (
                <FundRanking
                  gainers={rankData.gainers}
                  losers={rankData.losers}
                  loading={loading.rank}
                />
              )}

              {desktopNav === 'markets' && (
                <>
                  {/* 贵金属（col-span-2）+ 主要指数 */}
                  <section className="grid grid-cols-3 gap-6">
                    <PreciousMetalsCard gold={gold} trends={trends} loading={loading.gold} />
                    <IndicesCard indices={indices} loading={loading.indices} />
                  </section>
                </>
              )}

              <div className="h-4" />
            </div>
          </div>
        </main>
      </div>

      {/* 悬浮 AI 智能选基（右下角「小人」，默认收起，移动端/桌面端通用） */}
      <AiSidebarWidget
        onAddFund={addFund}
        existingCodes={codes}
        open={aiOpen}
        onOpenChange={setAiOpen}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddFund={addFund}
        existingCodes={codes}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={applyTheme}
        lastUpdated={lastUpdated}
        trading={trading}
        refreshMs={REFRESH_MS}
        onClearFunds={clearFunds}
        onClearCosts={clearCosts}
        onClearAll={clearAll}
      />
    </main>
  );
}
