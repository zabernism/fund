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
} from '@/lib/types';
import { isTradingNow } from '@/lib/format';
import MarketOverview from '@/components/MarketOverview';
import AddFund from '@/components/AddFund';
import SectorHeatmap from '@/components/SectorHeatmap';
import Panel from '@/components/Panel';
import FundRow from '@/components/FundRow';
import TopAppBar from '@/components/TopAppBar';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import HoldingsCard from '@/components/HoldingsCard';
import SearchOverlay from '@/components/SearchOverlay';
import SettingsSheet from '@/components/SettingsSheet';
import AlphaTopBar from '@/components/AlphaTopBar';
import DesktopFunds from '@/components/DesktopFunds';
import DesktopSidebar, { toEmSecid } from '@/components/DesktopSidebar';
import IndexStrip from '@/components/IndexStrip';
import TickerFooter from '@/components/TickerFooter';
import AssetAllocation from '@/components/AssetAllocation';
import GoldPanelMobile from '@/components/GoldPanelMobile';
import { IconFlame } from '@/components/icons';

const STORAGE_FUNDS = 'fund-dashboard:codes';
const STORAGE_SECTORS = 'fund-dashboard:sectors';
const STORAGE_COSTS = 'fund-dashboard:costs';
const DEFAULT_CODES = ['161725', '110011', '000051', '005827'];
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

  const [indices, setIndices] = useState<IndexQuote[]>([]);

  const [loading, setLoading] = useState({
    funds: true,
    indices: true,
    sectors: true,
    gold: true,
    trends: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [booted, setBooted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);
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

  const [activeTab, setActiveTab] = useState<TabKey>('markets');
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchFunds(),
      fetchIndices(),
      fetchSectors(),
      fetchGold(),
      fetchTrend(),
    ]);
    const ef = expandedFundRef.current;
    if (ef) {
      api
        .fundTrend(ef)
        .then((d) => setFundTrends((m) => ({ ...m, [ef]: d })))
        .catch(() => {});
    }
    setLastUpdated(new Date());
  }, [fetchFunds, fetchIndices, fetchSectors, fetchGold, fetchTrend]);

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
        if (p && typeof p === 'object') setCostMap(p);
      } catch {
        /* ignore */
      }
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

  const saveCost = (code: string, cost: number | null, shares: number | null) => {
    setCostMap((prev) => {
      const next = { ...prev, [code]: { cost, shares } };
      localStorage.setItem(STORAGE_COSTS, JSON.stringify(next));
      return next;
    });
    setEditing(null);
  };

  const addSector = (item: SectorWatchItem) => {
    if (sectors.some((s) => s.code === item.code)) return;
    setSectors((prev) => {
      const next = [...prev, item];
      localStorage.setItem(STORAGE_SECTORS, JSON.stringify(next));
      return next;
    });
    api
      .sectorQuote([item.code])
      .then(({ sectors: qs }) => {
        if (qs[0]) setSectorQuotes((m) => ({ ...m, [item.code]: qs[0] }));
      })
      .catch(() => {});
  };

  const removeSector = (code: string) => {
    setSectors((prev) => {
      const next = prev.filter((s) => s.code !== code);
      localStorage.setItem(STORAGE_SECTORS, JSON.stringify(next));
      return next;
    });
    setSectorQuotes((m) => {
      const n = { ...m };
      delete n[code];
      return n;
    });
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
      if (f?.nav != null && cost?.cost != null && cost?.shares != null) {
        const shares = cost.shares;
        const mv = f.nav * shares;
        marketValue += mv;
        totalProfit += mv - cost.cost * shares;
        totalCost += cost.cost * shares;
        if (f.changePct != null) {
          const prevNav = f.nav / (1 + f.changePct / 100);
          todayPnL += (f.nav - prevNav) * shares;
        }
      }
    });
    const totalPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const todayPct = totalCost > 0 ? (todayPnL / totalCost) * 100 : 0;
    return { totalProfit, totalPct, marketValue, todayPnL, todayPct, hasCost: totalCost > 0 };
  }, [codes, funds, costMap]);

  const onNav = (k: TabKey) => {
    if (k === 'settings') {
      setSettingsOpen(true);
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
        />

        <div className="mx-auto max-w-md space-y-4 px-3 pb-24 pt-[4.25rem]">
        {activeTab === 'markets' ? (
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

            <Panel
              title="热门行业板块"
              icon={<IconFlame width={18} height={18} />}
              right={
                <span className="text-xs font-normal text-[var(--muted)]">
                  长按搜索添加
                </span>
              }
            >
              <SectorHeatmap
                sectors={sectors}
                quotes={sectorQuotes}
                trends={trends}
              />
            </Panel>

            <GoldPanelMobile
              gold={gold}
              trends={trends}
              loading={loading.gold}
            />
          </>
        ) : (
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

      <BottomNav active={activeTab} onChange={onNav} />
      </div>

      {/* 桌面端 — 严格匹配参考 index.html 布局结构 */}
      <div className={forceView === 'mobile' ? 'hidden' : forceView === 'desktop' ? 'alpha flex h-screen flex-col overflow-hidden' : 'alpha hidden lg:flex lg:h-screen lg:flex-col lg:overflow-hidden'}>
        {/* 外层 flex 容器：main 滚动，footer 固定底部 */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-surface-dim relative">
            {/* 浮动主题切换（参考 index.html 第169行） */}
            <div className="fixed top-3 right-3 z-[100] flex items-center rounded-full border border-outline-variant bg-surface-container-low/80 p-1 shadow-lg backdrop-blur-md">
              <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-primary-container" onClick={() => applyTheme('dark')} title="深蓝">
                <span className="material-symbols-outlined text-[18px]">dark_mode</span>
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-primary-container" onClick={() => applyTheme('light')} title="明亮">
                <span className="material-symbols-outlined text-[18px]">light_mode</span>
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-primary-container" onClick={() => applyTheme('eye')} title="护眼">
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </button>
            </div>

            {/* 指数行情条 — 匹配参考第181行，带底边框 */}
            <section className="grid grid-cols-1 gap-gutter border-b border-outline-variant bg-surface-container-lowest p-gutter md:grid-cols-3 lg:grid-cols-5">
              <IndexStrip indices={indices} />
            </section>

            {/* 主网格 — 匹配参考第224行 */}
            <div className="grid grid-cols-12 gap-gutter p-gutter" style={{ height: 'calc(100% - 80px)' }}>
              <section className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
                <DesktopFunds
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
              </section>
              <aside className="col-span-12 lg:col-span-4 flex flex-col gap-gutter h-full">
                <DesktopSidebar
                  sectors={sectors}
                  sectorQuotes={sectorQuotes}
                  trends={trends}
                  gold={gold}
                  onRemoveSector={removeSector}
                />
              </aside>
            </div>
          </main>
        </div>

        {/* 页脚 — 固定在底部，不随内容滚动 */}
        <TickerFooter
          indices={indices}
          sectors={sectors
            .map((s) => sectorQuotes[s.code])
            .filter((q): q is SectorQuote => Boolean(q))}
          gold={gold}
          connected
        />
      </div>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddFund={addFund}
        onAddSector={addSector}
        onRemoveSector={removeSector}
        sectors={sectors}
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
        onClearSectors={clearSectors}
        onClearCosts={clearCosts}
        onClearAll={clearAll}
      />
    </main>
  );
}
