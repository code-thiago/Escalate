// apps/web/src/components/shell/EscalateTerminalShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  Sliders,
  ChevronDown,
  ChevronRight,
  Landmark,
  Coins,
  Globe,
  Cpu,
  Scale,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Terminal,
  UploadCloud,
  Sparkles,
  Lock,
} from 'lucide-react';

export type AssetClassCode =
  | 'FIXED_INCOME'
  | 'TESOURO'
  | 'EQUITY_BR'
  | 'EQUITY_INTL'
  | 'FUND'
  | 'ETF'
  | 'PREV'
  | 'COE'
  | 'GOLD'
  | 'FX'
  | 'CRYPTO'
  | 'IPO';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  allocationPct?: string;
  returnPct?: string;
  isPositive?: boolean;
  shortcut?: string;
  badge?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

const escalateNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'cmd-search', title: 'Command & Ticker Lookup', icon: Search, shortcut: '⌘K' },
      { id: 'overview', title: 'Consolidated Net Worth', icon: LayoutDashboard, allocationPct: '100.0%' },
      { id: 'ingestion', title: 'SINACOR / B3 / OCR Import', icon: UploadCloud, badge: '0-TOKEN' },
      { id: 'quant-copilot', title: 'Quant AI Copilot', icon: Sparkles, badge: 'CVM-SAFE' },
    ],
  },
  {
    heading: 'Portfolio Custody (11 Classes)',
    items: [
      {
        id: 'group-rf',
        title: 'Fixed Income & Sovereign',
        icon: Landmark,
        allocationPct: '42.5%',
        children: [
          { id: 'asset-tesouro', title: 'Tesouro Direto (IPCA+/Selic)', icon: Landmark, allocationPct: '18.0%', returnPct: '+11.4%', isPositive: true },
          { id: 'asset-rf-priv', title: 'Renda Fixa (CDB/LCI/LCA/Deb)', icon: Landmark, allocationPct: '19.5%', returnPct: '+12.8%', isPositive: true },
          { id: 'asset-prev', title: 'Previdencia (PGBL/VGBL)', icon: Landmark, allocationPct: '5.0%', returnPct: '+9.2%', isPositive: true },
        ],
      },
      {
        id: 'group-equities',
        title: 'Equities & Public Offers',
        icon: TrendingUp,
        allocationPct: '31.0%',
        children: [
          { id: 'asset-b3', title: 'Bolsa B3 (Acoes & FIIs)', icon: TrendingUp, allocationPct: '16.0%', returnPct: '+6.4%', isPositive: true },
          { id: 'asset-intl', title: 'Global Equities (NYSE/Nasdaq)', icon: Globe, allocationPct: '12.0%', returnPct: '+19.1%', isPositive: true },
          { id: 'asset-ipo', title: 'Public Offerings (IPOs/Follow-on)', icon: Activity, allocationPct: '3.0%', returnPct: '-1.8%', isPositive: false },
        ],
      },
      {
        id: 'group-funds-structured',
        title: 'Funds, ETFs & Structured',
        icon: Briefcase,
        allocationPct: '14.5%',
        children: [
          { id: 'asset-funds', title: 'Fundos CVM (CNPJ Daily Quota)', icon: Briefcase, allocationPct: '6.5%', returnPct: '+10.1%', isPositive: true },
          { id: 'asset-etfs', title: 'Thematic & Index ETFs', icon: Globe, allocationPct: '5.5%', returnPct: '+14.3%', isPositive: true },
          { id: 'asset-coe', title: 'COE (Opportunity Cost Audit)', icon: Scale, allocationPct: '2.5%', returnPct: '+4.1%', isPositive: false },
        ],
      },
      {
        id: 'group-alternatives',
        title: 'Crypto, FX & Commodities',
        icon: Coins,
        allocationPct: '12.0%',
        children: [
          { id: 'asset-crypto', title: 'Crypto (Binance Read-Only)', icon: Coins, allocationPct: '7.0%', returnPct: '+34.2%', isPositive: true },
          { id: 'asset-gold', title: 'Gold (OZ1D / Spot IAU)', icon: Coins, allocationPct: '3.0%', returnPct: '+15.0%', isPositive: true },
          { id: 'asset-fx', title: 'FX Currencies (USD/EUR PTAX)', icon: Globe, allocationPct: '2.0%', returnPct: '+5.4%', isPositive: true },
        ],
      },
    ],
  },
  {
    heading: 'Quantitative Engines',
    items: [
      { id: 'quant-markowitz', title: 'Markowitz Efficient Frontier', icon: Sliders },
      { id: 'quant-dcf', title: 'Intrinsic Valuation (DCF)', icon: FileSpreadsheet },
      { id: 'quant-bl', title: 'Black-Litterman Macro Views', icon: Cpu },
      { id: 'trading-warm', title: 'Trading Desk (GARCH/Kalman)', icon: Activity, badge: 'ISOLATED' },
    ],
  },
];

const bottomSystemItems: NavItemData[] = [
  { id: 'gorules-audit', title: 'GoRules JDM Guardrails', icon: ShieldCheck, badge: '<1ms' },
  { id: 'vault-settings', title: 'AES-256-GCM API Vault', icon: Lock, shortcut: '⌘,' },
];

function CustodyPortfolioSwitcher({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (portfolio: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const portfolios = [
    { name: 'Consolidated Master Vault', meta: 'B3 + XP + Binance • 11 Classes', netWorth: 'R$ 1.482.910,45' },
    { name: 'B3 & Domestic Fixed Income', meta: 'SINACOR / Tesouro Direto', netWorth: 'R$ 1.095.400,00' },
    { name: 'Offshore & Crypto Desk', meta: 'Interactive Brokers + Binance', netWorth: 'R$ 387.510,45' },
  ];

  const currentObj = portfolios.find((p) => p.name === selected) || portfolios[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 mb-3 rounded-lg bg-[var(--ds-surface-card)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-[var(--ds-border-subtle)] text-[var(--ds-text-primary)] flex items-center justify-center tabular-financial font-semibold text-[12px] shrink-0 border border-[var(--ds-border-subtle)]">
            M
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-semibold text-[var(--ds-text-primary)] truncate">
              {currentObj.name}
            </span>
            <span className="text-[11px] tabular-financial text-[var(--ds-market-positive)] leading-tight">
              {currentObj.netWorth}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-[var(--ds-text-secondary)] shrink-0" strokeWidth={1.5} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            role="listbox"
            aria-label="Portfolio Custody Switcher"
            className="absolute top-[52px] left-0 w-full bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-lg shadow-2xl z-50 py-1.5 flex flex-col gap-0.5"
          >
            {portfolios.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={selected === p.name}
                onClick={() => {
                  onSelect(p.name);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 mx-1 text-left rounded-md transition-colors flex flex-col ${
                  selected === p.name
                    ? 'bg-[var(--ds-border-subtle)] text-[var(--ds-text-primary)]'
                    : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)]'
                }`}
              >
                <span className="text-[12px] font-medium truncate">{p.name}</span>
                <div className="flex items-center justify-between w-full mt-0.5">
                  <span className="text-[10px] text-[var(--ds-text-secondary)]">{p.meta}</span>
                  <span className="text-[10px] tabular-financial text-[var(--ds-market-positive)]">
                    {p.netWorth}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TerminalNavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const [isOpen, setIsOpen] = useState(level === 0 && item.id === 'group-rf');

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <button
        type="button"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        className={`group flex items-center justify-between pr-2.5 py-[6px] rounded-[6px] transition-colors select-none text-left ${
          isActive
            ? 'bg-[var(--ds-border-subtle)] text-[var(--ds-text-primary)] font-medium'
            : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <item.icon
            className={`w-[15px] h-[15px] shrink-0 transition-colors ${
              isActive
                ? 'text-[var(--ds-accent-quant)]'
                : 'text-[var(--ds-text-secondary)] group-hover:text-[var(--ds-text-primary)]'
            }`}
            strokeWidth={1.5}
          />
          <span className="text-[12px] truncate">{item.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {item.returnPct && (
            <span
              className={`text-[10px] tabular-financial px-1 py-0.5 rounded ${
                item.isPositive
                  ? 'text-[var(--ds-market-positive)] bg-[var(--ds-market-positive)]/10'
                  : 'text-[var(--ds-market-negative)] bg-[var(--ds-market-negative)]/10'
              }`}
            >
              {item.returnPct}
            </span>
          )}
          {item.allocationPct && (
            <span className="text-[11px] tabular-financial text-[var(--ds-text-secondary)]">
              {item.allocationPct}
            </span>
          )}
          {item.shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded">
              {item.shortcut}
            </kbd>
          )}
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[9px] font-[family-name:var(--ds-font-mono)] tabular-financial uppercase tracking-wider rounded bg-[var(--ds-accent-quant)]/10 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-[var(--ds-text-secondary)] transition-transform duration-200 ${
                isOpen ? 'rotate-90' : ''
              }`}
              strokeWidth={1.75}
            />
          )}
        </div>
      </button>

      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div
              className="absolute top-0 bottom-0 border-l border-[var(--ds-border-subtle)]"
              style={{ left: `${level * 12 + 17}px` }}
            />
            {item.children!.map((child) => (
              <TerminalNavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface EscalateTerminalShellProps {
  children?: React.ReactNode;
  initialActiveId?: string;
}

export function EscalateTerminalShell({
  children,
  initialActiveId = 'overview',
}: EscalateTerminalShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [activePortfolio, setActivePortfolio] = useState('Consolidated Master Vault');
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNavSelect = (id: string) => {
    if (id === 'cmd-search') {
      setIsCommandOpen(true);
      return;
    }
    setActiveId(id);
  };

  return (
    <div className="flex w-full h-screen bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-sans)] overflow-hidden select-none">
      {/* Collapsible Financial Sidebar */}
      <aside
        aria-label="Escalate Financial Terminal Navigation"
        className={`h-full bg-[var(--ds-surface-card)] border-r border-[var(--ds-border-subtle)] transition-all duration-200 ease-in-out flex flex-col shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-[var(--ds-sidebar-width)] opacity-100' : 'w-0 opacity-0 border-r-0'
        }`}
      >
        <div className="flex flex-col w-[var(--ds-sidebar-width)] h-full p-3">
          <CustodyPortfolioSwitcher selected={activePortfolio} onSelect={setActivePortfolio} />

          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
            {escalateNavGroups.map((group, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                {group.heading && (
                  <span className="px-2.5 mb-1 text-[10px] font-[family-name:var(--ds-font-mono)] font-semibold tracking-wider text-[var(--ds-text-secondary)] uppercase">
                    {group.heading}
                  </span>
                )}
                {group.items.map((item) => (
                  <TerminalNavItem
                    key={item.id}
                    item={item}
                    activeId={activeId}
                    onSelect={handleNavSelect}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-[var(--ds-border-subtle)] flex flex-col gap-0.5">
            {bottomSystemItems.map((item) => (
              <TerminalNavItem
                key={item.id}
                item={item}
                activeId={activeId}
                onSelect={handleNavSelect}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Main Quantitative Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--ds-bg-primary)]">
        {/* Telemetry Topbar */}
        <header className="h-[var(--ds-topbar-height)] border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card)] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)] transition-colors"
              aria-label="Toggle Navigation Sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
            <div className="flex items-center gap-2 text-[12px] text-[var(--ds-text-secondary)] truncate">
              <span className="font-medium text-[var(--ds-text-primary)] truncate">
                {activePortfolio}
              </span>
              <span>/</span>
              <span className="font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)] uppercase">
                {activeId}
              </span>
            </div>
          </div>

          {/* Real-Time Tabular Financial Strip */}
          <div className="hidden lg:flex items-center gap-6 tabular-financial text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[var(--ds-text-secondary)]">CDI:</span>
              <span className="text-[var(--ds-text-primary)] tabular-financial">11.15%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ds-text-secondary)]">PORTFOLIO SHARPE:</span>
              <span className="text-[var(--ds-market-positive)] tabular-financial">1.48</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ds-text-secondary)]">MARKOWITZ VOL (σ):</span>
              <span className="text-[var(--ds-market-warning)] tabular-financial">8.42%</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/10 border border-[var(--ds-market-positive)]/30 text-[var(--ds-market-positive)]">
              [CVM_GUARD: ENFORCED]
            </div>
          </div>
        </header>

        {/* Workspace Content Grid */}
        {children ? (
          <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Markowitz & Sharpe Summary */}
            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
                  Consolidated Equity &amp; Fixed Income
                </span>
                <span className="text-[11px] tabular-financial text-[var(--ds-market-positive)] bg-[var(--ds-market-positive)]/10 px-2 py-0.5 rounded">
                  +14.28% a.a. (128.1% CDI)
                </span>
              </div>
              <div className="my-4">
                <div className="text-[26px] font-semibold tabular-financial text-[var(--ds-text-primary)]">
                  R$ 1.482.910,45
                </div>
                <div className="text-[11px] text-[var(--ds-text-secondary)] mt-1 tabular-financial">
                  Optimal Markowitz Drift (μ): +15.10% | Current Vol (σ): 8.42%
                </div>
              </div>
              <div className="text-[11px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)] pt-3 font-[family-name:var(--ds-font-mono)]">
                [GORULES_JDM]: Allocation within Moderate Suitability bounds.
              </div>
            </div>

            {/* Card 2: DCF Valuation & Black-Litterman Shocks */}
            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
                  Black-Litterman Geopolitical Vector (Q)
                </span>
                <span className="text-[11px] tabular-financial text-[var(--ds-accent-quant)]">
                  SEC 13F + Macro RAG
                </span>
              </div>
              <div className="my-4 flex flex-col gap-2 tabular-financial text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">US Semis Export Cap (Ω=0.22):</span>
                  <span className="text-[var(--ds-market-negative)] tabular-financial">-2.40% E[R]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">B3 Selic Terminal Curve:</span>
                  <span className="text-[var(--ds-market-positive)] tabular-financial">+1.15% E[R]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">COE Opportunity Cost vs CDI:</span>
                  <span className="text-[var(--ds-market-negative)] tabular-financial">-4.85% Spread</span>
                </div>
              </div>
              <div className="text-[11px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)] pt-3 font-[family-name:var(--ds-font-mono)]">
                Zero LLM arithmetic: Computed via Fastify Worker Thread.
              </div>
            </div>

            {/* Card 3: Token Quota & Multi-Tenant Cache Telemetry */}
            <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
                  SaaS Token Metering &amp; Cache
                </span>
                <span className="text-[11px] tabular-financial text-[var(--ds-market-positive)]">
                  89.4% Saved
                </span>
              </div>
              <div className="my-4 flex flex-col gap-2 tabular-financial text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">Monthly Quota Used:</span>
                  <span className="text-[var(--ds-text-primary)] tabular-financial">14,200 / 250,000 tok</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">Multi-Tenant Asset Cache TTL:</span>
                  <span className="text-[var(--ds-accent-quant)] tabular-financial">6h (PETR4, NVDA, VALE3)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ds-text-secondary)]">SINACOR PDF Parser Cost:</span>
                  <span className="text-[var(--ds-market-positive)] tabular-financial">0 Tokens (Deterministic)</span>
                </div>
              </div>
              <div className="text-[11px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)] pt-3 font-[family-name:var(--ds-font-mono)]">
                Secrets injected in-memory via Doppler CLI.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Command Palette Overlay (⌘K / Ctrl+K) */}
      {isCommandOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Deterministic Quant Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-[var(--ds-bg-primary)]/80 backdrop-blur-sm px-4"
        >
          <div className="fixed inset-0" onClick={() => setIsCommandOpen(false)} />
          <div className="relative w-full max-w-xl bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center px-4 border-b border-[var(--ds-border-subtle)]">
              <Terminal className="w-4 h-4 text-[var(--ds-accent-quant)] mr-3 shrink-0" strokeWidth={1.5} />
              <input
                autoFocus
                aria-label="Command palette search"
                className="flex-1 bg-transparent py-3.5 outline-none text-[13px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-secondary)]"
                placeholder="Run DCF valuation, simulate Markowitz weight, or import SINACOR PDF..."
              />
              <kbd
                onClick={() => setIsCommandOpen(false)}
                className="px-1.5 py-0.5 text-[10px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded cursor-pointer hover:text-[var(--ds-text-primary)]"
              >
                ESC
              </kbd>
              <button
                type="button"
                aria-label="Close command palette"
                onClick={() => setIsCommandOpen(false)}
                className="ml-2 p-1 rounded text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 font-[family-name:var(--ds-font-mono)] text-[12px] text-[var(--ds-text-secondary)] flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ds-text-secondary)]">
                Deterministic Quant Actions (Zero-LLM Gate)
              </div>
              <div className="px-3 py-2 rounded bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] flex justify-between">
                <span>Run Markowitz Covariance Matrix (11 Asset Classes)</span>
                <span className="text-[var(--ds-accent-quant)] tabular-financial">&lt; 5ms</span>
              </div>
              <div className="px-3 py-2 rounded hover:bg-[var(--ds-surface-elevated)] flex justify-between">
                <span>Audit COE Opportunity Cost vs 100% CDI</span>
                <span className="text-[var(--ds-market-positive)] tabular-financial">0 Tokens</span>
              </div>
              <div className="px-3 py-2 rounded hover:bg-[var(--ds-surface-elevated)] flex justify-between">
                <span>Import B3 / SINACOR Brokerage Note (PDF/CSV)</span>
                <span className="text-[var(--ds-market-positive)] tabular-financial">Local Parser</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EscalateTerminalShell;
