// apps/web/src/components/shell/EscalateTerminalShell.tsx
'use client';

import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  href?: string;
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

export type PortfolioPreset = {
  name: string;
  meta: string;
  netWorth: string;
  annualReturn: string;
  driftPct: string;
  cdi: string;
  sharpe: string;
  vol: string;
  suitabilityNote: string;
};

const PORTFOLIO_PRESETS: PortfolioPreset[] = [
  {
    name: 'Consolidated Master Vault',
    meta: 'B3 + XP + Binance • 11 Classes',
    netWorth: 'R$ 1.482.910,45',
    annualReturn: '+14.28% a.a. (128.1% CDI)',
    driftPct: '+15.10%',
    cdi: '11.15%',
    sharpe: '1.48',
    vol: '8.42%',
    suitabilityNote: '[GORULES_JDM]: Allocation within Moderate Suitability bounds.',
  },
  {
    name: 'B3 & Domestic Fixed Income',
    meta: 'SINACOR / Tesouro Direto',
    netWorth: 'R$ 1.095.400,00',
    annualReturn: '+12.94% a.a. (116.0% CDI)',
    driftPct: '+13.20%',
    cdi: '11.15%',
    sharpe: '1.62',
    vol: '5.10%',
    suitabilityNote: '[GORULES_JDM]: Conservative sovereign & FGC-covered sleeve.',
  },
  {
    name: 'Offshore & Crypto Desk',
    meta: 'Interactive Brokers + Binance',
    netWorth: 'R$ 387.510,45',
    annualReturn: '+18.65% a.a. (167.3% CDI)',
    driftPct: '+20.40%',
    cdi: '11.15%',
    sharpe: '1.29',
    vol: '14.85%',
    suitabilityNote: '[GORULES_JDM]: High-beta offshore & self-custody sleeve.',
  },
];

const QUICK_NAV_PILLS: Array<{ label: string; href: string; matchExact?: boolean }> = [
  { label: 'Overview', href: '/', matchExact: true },
  { label: 'Calendario Bifasico', href: '/investimentos', matchExact: true },
  { label: 'Minha Carteira', href: '/investimentos/carteira', matchExact: true },
  { label: 'Objetivos Bps', href: '/investimentos/objetivos', matchExact: true },
  { label: 'Conexoes & Vault', href: '/investimentos/conexoes', matchExact: true },
  { label: 'Produtos (12 Slugs)', href: '/produtos' },
  { label: 'Quant & ZEN Agent', href: '/agent' },
];

type CommandPaletteEntry = {
  id: string;
  label: string;
  badge: string;
  href: string;
  badgeTone: 'quant' | 'positive';
};

const COMMAND_PALETTE_ITEMS: CommandPaletteEntry[] = [
  {
    id: 'cmd-markowitz',
    label: 'Run Markowitz Covariance Matrix (11 Asset Classes)',
    badge: '< 5ms',
    href: '/agent?engine=markowitz',
    badgeTone: 'quant',
  },
  {
    id: 'cmd-coe-audit',
    label: 'Audit COE Opportunity Cost vs 100% CDI',
    badge: '0 Tokens',
    href: '/produtos/coe',
    badgeTone: 'positive',
  },
  {
    id: 'cmd-sinacor-import',
    label: 'Import B3 / SINACOR Brokerage Note (PDF/CSV)',
    badge: 'Local Parser',
    href: '/investimentos/conexoes',
    badgeTone: 'positive',
  },
  {
    id: 'cmd-calendar',
    label: 'Open Biphasic Financial Calendar (P10 / P50 / P90)',
    badge: 'Calendario',
    href: '/investimentos',
    badgeTone: 'quant',
  },
  {
    id: 'cmd-custody',
    label: 'Inspect Custody Breakdown & Liquidity Ladder (10.000 bps)',
    badge: '10.000 bps',
    href: '/investimentos/carteira',
    badgeTone: 'positive',
  },
  {
    id: 'cmd-dcf',
    label: 'Launch Intrinsic Valuation (DCF) & Black-Litterman',
    badge: 'Quant Engine',
    href: '/agent?engine=dcf',
    badgeTone: 'quant',
  },
  {
    id: 'cmd-goals',
    label: 'Configure Fractional Goal Allocation (ZEN Guard)',
    badge: 'ZEN Guard',
    href: '/investimentos/objetivos',
    badgeTone: 'positive',
  },
  {
    id: 'cmd-products',
    label: 'Browse 12 Product Class Analyzers (5-Block Audit)',
    badge: 'Catalogo',
    href: '/produtos',
    badgeTone: 'quant',
  },
];

const escalateNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'cmd-search', title: 'Command & Ticker Lookup', icon: Search, shortcut: '⌘K' },
      { id: 'overview', title: 'Consolidated Net Worth', href: '/', icon: LayoutDashboard, allocationPct: '100.0%' },
      { id: 'ingestion', title: 'SINACOR / B3 / OCR Import', href: '/investimentos/conexoes', icon: UploadCloud, badge: '0-TOKEN' },
      { id: 'quant-copilot', title: 'Quant AI Copilot', href: '/agent', icon: Sparkles, badge: 'CVM-SAFE' },
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
          { id: 'asset-tesouro', title: 'Tesouro Direto (IPCA+/Selic)', href: '/produtos/tesouro-direto', icon: Landmark, allocationPct: '18.0%', returnPct: '+11.4%', isPositive: true },
          { id: 'asset-rf-priv', title: 'Renda Fixa (CDB/LCI/LCA/Deb)', href: '/produtos/renda-fixa', icon: Landmark, allocationPct: '19.5%', returnPct: '+12.8%', isPositive: true },
          { id: 'asset-prev', title: 'Previdencia (PGBL/VGBL)', href: '/produtos/previdencia', icon: Landmark, allocationPct: '5.0%', returnPct: '+9.2%', isPositive: true },
        ],
      },
      {
        id: 'group-equities',
        title: 'Equities & Public Offers',
        icon: TrendingUp,
        allocationPct: '31.0%',
        children: [
          { id: 'asset-b3', title: 'Bolsa B3 (Acoes & FIIs)', href: '/produtos/bolsa-br', icon: TrendingUp, allocationPct: '16.0%', returnPct: '+6.4%', isPositive: true },
          { id: 'asset-intl', title: 'Global Equities (NYSE/Nasdaq)', href: '/produtos/bolsa-global', icon: Globe, allocationPct: '12.0%', returnPct: '+19.1%', isPositive: true },
          { id: 'asset-ipo', title: 'Public Offerings (IPOs/Follow-on)', href: '/produtos/ofertas-publicas', icon: Activity, allocationPct: '3.0%', returnPct: '-1.8%', isPositive: false },
        ],
      },
      {
        id: 'group-funds-structured',
        title: 'Funds, ETFs & Structured',
        icon: Briefcase,
        allocationPct: '14.5%',
        children: [
          { id: 'asset-funds', title: 'Fundos CVM (CNPJ Daily Quota)', href: '/produtos/fundos', icon: Briefcase, allocationPct: '6.5%', returnPct: '+10.1%', isPositive: true },
          { id: 'asset-etfs', title: 'Thematic & Index ETFs', href: '/produtos/etfs', icon: Globe, allocationPct: '5.5%', returnPct: '+14.3%', isPositive: true },
          { id: 'asset-coe', title: 'COE (Opportunity Cost Audit)', href: '/produtos/coe', icon: Scale, allocationPct: '2.5%', returnPct: '+4.1%', isPositive: false },
        ],
      },
      {
        id: 'group-alternatives',
        title: 'Crypto, FX & Commodities',
        icon: Coins,
        allocationPct: '12.0%',
        children: [
          { id: 'asset-crypto', title: 'Crypto (Binance Read-Only)', href: '/produtos/cripto', icon: Coins, allocationPct: '7.0%', returnPct: '+34.2%', isPositive: true },
          { id: 'asset-gold', title: 'Gold (OZ1D / Spot IAU)', href: '/produtos/ouro', icon: Coins, allocationPct: '3.0%', returnPct: '+15.0%', isPositive: true },
          { id: 'asset-fx', title: 'FX Currencies (USD/EUR PTAX)', href: '/produtos/cambio', icon: Globe, allocationPct: '2.0%', returnPct: '+5.4%', isPositive: true },
        ],
      },
    ],
  },
  {
    heading: 'Quantitative Engines',
    items: [
      { id: 'quant-markowitz', title: 'Markowitz Efficient Frontier', href: '/agent?engine=markowitz', icon: Sliders },
      { id: 'quant-dcf', title: 'Intrinsic Valuation (DCF)', href: '/agent?engine=dcf', icon: FileSpreadsheet },
      { id: 'quant-bl', title: 'Black-Litterman Macro Views', href: '/agent?engine=black-litterman', icon: Cpu },
      { id: 'trading-warm', title: 'Trading Desk (GARCH/Kalman)', href: '/agent?engine=trading', icon: Activity, badge: 'ISOLATED' },
    ],
  },
];

const bottomSystemItems: NavItemData[] = [
  { id: 'gorules-audit', title: 'GoRules JDM Guardrails', href: '/agent?engine=gorules', icon: ShieldCheck, badge: '<1ms' },
  { id: 'vault-settings', title: 'AES-256-GCM API Vault', href: '/investimentos/conexoes?tab=vault', icon: Lock, shortcut: '⌘,' },
];

function flattenNavItems(groups: NavGroupData[], extra: NavItemData[]): NavItemData[] {
  const flat: NavItemData[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      flat.push(item);
      if (item.children) {
        flat.push(...item.children);
      }
    }
  }
  flat.push(...extra);
  return flat;
}

const ALL_NAV_ITEMS = flattenNavItems(escalateNavGroups, bottomSystemItems);

function resolveActiveIdFromRoute(
  pathname: string | null,
  engineParam: string | null,
  tabParam: string | null,
): string | null {
  if (!pathname) return null;
  if (pathname === '/') return 'overview';
  if (pathname === '/investimentos/conexoes') {
    return tabParam === 'vault' ? 'vault-settings' : 'ingestion';
  }
  if (pathname === '/agent') {
    if (engineParam === 'markowitz') return 'quant-markowitz';
    if (engineParam === 'dcf') return 'quant-dcf';
    if (engineParam === 'black-litterman') return 'quant-bl';
    if (engineParam === 'trading') return 'trading-warm';
    if (engineParam === 'gorules') return 'gorules-audit';
    return 'quant-copilot';
  }
  if (pathname === '/produtos/bolsa') return 'asset-b3';
  const matched = ALL_NAV_ITEMS.find((it) => it.href && it.href.split('?')[0] === pathname);
  if (matched) return matched.id;
  if (pathname.startsWith('/investimentos')) return 'overview';
  return null;
}

function SearchParamsRouteSync({
  pathname,
  onResolveId,
}: {
  pathname: string | null;
  onResolveId: (id: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const engine = searchParams?.get('engine') ?? null;
    const tab = searchParams?.get('tab') ?? null;
    const resolved = resolveActiveIdFromRoute(pathname, engine, tab);
    if (resolved) {
      onResolveId(resolved);
    }
  }, [pathname, searchParams, onResolveId]);

  return null;
}

function CustodyPortfolioSwitcher({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (portfolio: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentObj = PORTFOLIO_PRESETS.find((p) => p.name === selected) || PORTFOLIO_PRESETS[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 mb-3 rounded-lg bg-[var(--ds-surface-card)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] transition-colors text-left cursor-pointer"
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
            {PORTFOLIO_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={selected === p.name}
                onClick={() => {
                  onSelect(p.name);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 mx-1 text-left rounded-md transition-colors flex flex-col cursor-pointer ${
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
  onSelect: (item: NavItemData) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const hasActiveChild = Boolean(item.children?.some((child) => child.id === activeId));
  const [isOpen, setIsOpen] = useState((level === 0 && item.id === 'group-rf') || hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item);
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
        className={`group flex items-center justify-between pr-2.5 py-[6px] rounded-[6px] transition-colors select-none text-left cursor-pointer ${
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
  showOverviewCards?: boolean;
}

function OverviewTelemetryGrid({ currentPortfolio }: { currentPortfolio: PortfolioPreset }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Card 1: Markowitz & Sharpe Summary */}
      <div className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-text-secondary)]">
            Consolidated Equity &amp; Fixed Income
          </span>
          <span className="text-[11px] tabular-financial text-[var(--ds-market-positive)] bg-[var(--ds-market-positive)]/10 px-2 py-0.5 rounded">
            {currentPortfolio.annualReturn}
          </span>
        </div>
        <div className="my-4">
          <div className="text-[26px] font-semibold tabular-financial text-[var(--ds-text-primary)]">
            {currentPortfolio.netWorth}
          </div>
          <div className="text-[11px] text-[var(--ds-text-secondary)] mt-1 tabular-financial">
            Optimal Markowitz Drift (μ): {currentPortfolio.driftPct} | Current Vol (σ): {currentPortfolio.vol}
          </div>
        </div>
        <div className="text-[11px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)] pt-3 font-[family-name:var(--ds-font-mono)]">
          {currentPortfolio.suitabilityNote}
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
  );
}

export function EscalateTerminalShell({
  children,
  initialActiveId = 'overview',
  showOverviewCards = false,
}: EscalateTerminalShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState(() => {
    const resolved = resolveActiveIdFromRoute(pathname, null, null);
    return resolved ?? initialActiveId;
  });
  const [activePortfolio, setActivePortfolio] = useState(PORTFOLIO_PRESETS[0].name);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSyncActiveId = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => {
          const next = !prev;
          if (!next) setSearchQuery('');
          return next;
        });
      } else if (e.key === 'Escape') {
        setIsCommandOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNavSelect = (item: NavItemData) => {
    if (item.id === 'cmd-search') {
      setIsCommandOpen(true);
      return;
    }
    setActiveId(item.id);
    if (item.href) {
      router.push(item.href);
    }
  };

  const currentPortfolio = useMemo(
    () => PORTFOLIO_PRESETS.find((p) => p.name === activePortfolio) ?? PORTFOLIO_PRESETS[0],
    [activePortfolio],
  );

  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COMMAND_PALETTE_ITEMS;
    return COMMAND_PALETTE_ITEMS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.badge.toLowerCase().includes(q) ||
        cmd.href.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const executeCommand = (href: string) => {
    setIsCommandOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  const isQuickPillActive = (href: string, matchExact?: boolean) => {
    if (!pathname) return false;
    if (matchExact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex w-full h-screen bg-[var(--ds-bg-primary)] text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-sans)] overflow-hidden select-none">
      <Suspense fallback={null}>
        <SearchParamsRouteSync pathname={pathname} onResolveId={handleSyncActiveId} />
      </Suspense>

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
              className="p-1.5 rounded-md text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)] transition-colors cursor-pointer"
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
              <span className="text-[var(--ds-text-primary)] tabular-financial">
                {currentPortfolio.cdi}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ds-text-secondary)]">PORTFOLIO SHARPE:</span>
              <span className="text-[var(--ds-market-positive)] tabular-financial">
                {currentPortfolio.sharpe}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ds-text-secondary)]">MARKOWITZ VOL (σ):</span>
              <span className="text-[var(--ds-market-warning)] tabular-financial">
                {currentPortfolio.vol}
              </span>
            </div>
            <div className="px-2 py-0.5 rounded bg-[var(--ds-market-positive)]/10 border border-[var(--ds-market-positive)]/30 text-[var(--ds-market-positive)] tabular-financial">
              [CVM_GUARD: ENFORCED]
            </div>
          </div>
        </header>

        {/* Quick-Navigation Workspace Strip */}
        <nav
          aria-label="Terminal Quick Navigation"
          className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg-primary)] px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0"
        >
          <div className="flex flex-wrap items-center gap-1">
            {QUICK_NAV_PILLS.map((pill) => {
              const active = isQuickPillActive(pill.href, pill.matchExact);
              return (
                <Link
                  key={pill.href}
                  href={pill.href}
                  className={`px-2 py-1 rounded-md text-[11px] font-[family-name:var(--ds-font-mono)] whitespace-nowrap border transition-colors ${
                    active
                      ? 'bg-[var(--ds-surface-elevated)] border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] font-medium'
                      : 'bg-[var(--ds-surface-card)] border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)]'
                  }`}
                >
                  {pill.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-[11px] font-[family-name:var(--ds-font-mono)]">
            <Link
              href="/sobre"
              className="px-2 py-1 rounded text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors whitespace-nowrap"
            >
              ADRs &amp; Docs
            </Link>
            <Link
              href="/login"
              className="px-2 py-1 rounded border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-card)] hover:bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] transition-colors whitespace-nowrap"
            >
              Autenticar
            </Link>
          </div>
        </nav>

        {/* Workspace Content Grid */}
        <div className="flex-1 p-6 overflow-y-auto select-text space-y-6">
          {(showOverviewCards || !children) && (
            <OverviewTelemetryGrid currentPortfolio={currentPortfolio} />
          )}
          {children}
        </div>
      </main>

      {/* Command Palette Overlay (⌘K / Ctrl+K) */}
      {isCommandOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Deterministic Quant Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-[var(--ds-bg-primary)]/80 backdrop-blur-sm px-4"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setIsCommandOpen(false);
              setSearchQuery('');
            }}
          />
          <div className="relative w-full max-w-xl bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center px-4 border-b border-[var(--ds-border-subtle)]">
              <Terminal className="w-4 h-4 text-[var(--ds-accent-quant)] mr-3 shrink-0" strokeWidth={1.5} />
              <input
                autoFocus
                aria-label="Command palette search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCommands.length > 0) {
                    e.preventDefault();
                    executeCommand(filteredCommands[0].href);
                  }
                }}
                className="flex-1 bg-transparent py-3.5 outline-none text-[13px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-secondary)]"
                placeholder="Run DCF valuation, simulate Markowitz weight, or import SINACOR PDF..."
              />
              <kbd
                onClick={() => {
                  setIsCommandOpen(false);
                  setSearchQuery('');
                }}
                className="px-1.5 py-0.5 text-[10px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded cursor-pointer hover:text-[var(--ds-text-primary)]"
              >
                ESC
              </kbd>
              <button
                type="button"
                aria-label="Close command palette"
                onClick={() => {
                  setIsCommandOpen(false);
                  setSearchQuery('');
                }}
                className="ml-2 p-1 rounded text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 font-[family-name:var(--ds-font-mono)] text-[12px] text-[var(--ds-text-secondary)] flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ds-text-secondary)] mb-1">
                Deterministic Quant Actions (Zero-LLM Gate)
              </div>
              {filteredCommands.length === 0 ? (
                <div className="px-3 py-4 text-center text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)] rounded">
                  Nenhum comando encontrado para &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executeCommand(cmd.href)}
                    className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                      idx === 0
                        ? 'bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)]'
                        : 'hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text-primary)]'
                    }`}
                  >
                    <span>{cmd.label}</span>
                    <span
                      className={`tabular-financial shrink-0 ml-3 ${
                        cmd.badgeTone === 'quant'
                          ? 'text-[var(--ds-accent-quant)]'
                          : 'text-[var(--ds-market-positive)]'
                      }`}
                    >
                      {cmd.badge}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EscalateTerminalShell;
