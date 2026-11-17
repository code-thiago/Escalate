# DESIGN.md — Escalate Financial Terminal Design System

**Project**: Escalate (Project Midas)
**Codename**: Obsidian Telemetry Terminal (`WCAG 2.2 AAA`)
**Token Source**: [`packages/ui-tokens/src/tokens.css`](file:///c:/Dev/Projetos/Project%20Midas/simulador-financeiro/packages/ui-tokens/src/tokens.css)
**Global Bridge**: [`src/app/globals.css`](file:///c:/Dev/Projetos/Project%20Midas/simulador-financeiro/src/app/globals.css)
**Primary Shell**: [`apps/web/src/components/shell/EscalateTerminalShell.tsx`](file:///c:/Dev/Projetos/Project%20Midas/simulador-financeiro/apps/web/src/components/shell/EscalateTerminalShell.tsx)

---

## 1. Design Philosophy & Anti-Slop Governance

Escalate operates as a high-signal institutional financial terminal. Decorative shadows, generic translucent overlays (`bg-black/5`, `text-muted-foreground/50`), and unaligned proportional digits in financial readouts are strictly prohibited. Every color token is verified for **WCAG 2.2 AAA** luminance contrast (`>= 7.0:1`) over the `#09090b` void primary canvas.

---

## 2. 3-Tier `--ds-*` CSS Token Taxonomy

Defined canonically in `packages/ui-tokens/src/tokens.css` inside `@layer base { :root { ... } }` and imported into `src/app/globals.css`.

### Tier 1: Primitives (`--raw-*`)

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| `--raw-void-950` | `#09090b` | Deepest terminal canvas background |
| `--raw-void-900` | `#121215` | Card, sidebar, and topbar surface |
| `--raw-void-850` | `#18181c` | Hover and elevated interactive states |
| `--raw-void-800` | `#27272a` | Hairline borders and active nav track |
| `--raw-slate-100` | `#fafafa` | High-contrast primary typography |
| `--raw-slate-300` | `#d4d4d8` | Secondary legible UI copy |
| `--raw-slate-400` | `#a1a1aa` | Subtitles, column headers, axis labels |
| `--raw-emerald-400` | `#34d399` | Positive return, compliant guardrail, 0-token badge |
| `--raw-crimson-400` | `#f87171` | Negative spread, negative yield, destructive state |
| `--raw-amber-400` | `#fbbf24` | Markowitz volatility warning, risk threshold |
| `--raw-cyan-400` | `#38bdf8` | Quantitative engine accent, active icon highlight |

### Tier 2: Semantic Tokens (`--ds-*`) & WCAG 2.2 AAA Verification on `#09090b`

| Semantic Variable | Mapped Primitive | Measured Contrast Ratio (on `#09090b`) | Conformance |
| :--- | :--- | :---: | :--- |
| `--ds-bg-primary` | `var(--raw-void-950)` | Base Surface (`#09090b`) | Canvas |
| `--ds-surface-card` | `var(--raw-void-900)` | Elevated Card (`#121215`) | Surface |
| `--ds-surface-elevated` | `var(--raw-void-850)` | Interactive Hover (`#18181c`) | Surface |
| `--ds-border-subtle` | `var(--raw-void-800)` | Structural Hairline (`#27272a`) | Divider |
| `--ds-text-primary` | `var(--raw-slate-100)` | `19.3:1` | WCAG 2.2 AAA |
| `--ds-text-secondary` | `var(--raw-slate-400)` | `7.8:1` | WCAG 2.2 AAA |
| `--ds-market-positive` | `var(--raw-emerald-400)` | `10.4:1` | WCAG 2.2 AAA |
| `--ds-market-negative` | `var(--raw-crimson-400)` | `7.2:1` | WCAG 2.2 AAA |
| `--ds-market-warning` | `var(--raw-amber-400)` | `12.1:1` | WCAG 2.2 AAA |
| `--ds-accent-quant` | `var(--raw-cyan-400)` | `9.6:1` | WCAG 2.2 AAA |

### Tier 3: Component Slots (`--ds-*`)

| Slot Variable | Value | Usage |
| :--- | :--- | :--- |
| `--ds-sidebar-width` | `272px` | Collapsible terminal sidebar width (`aside`) |
| `--ds-topbar-height` | `56px` | Telemetry topbar height (`header`) |
| `--ds-font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` | Structural labels and navigation items |
| `--ds-font-mono` | `'Geist Mono', 'JetBrains Mono', monospace` | Quantitative metrics, tickers, and badges |

---

## 3. Mandatory Tabular Numerals (`.tabular-financial`)

Every monetary readout (`R$`), percentage (`%`), allocation share, Sharpe ratio, volatility metric, and token quota counter MUST apply the `.tabular-financial` utility class:

```css
.tabular-financial {
  font-family: var(--ds-font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

---

## 4. `EscalateTerminalShell` Compound Component Contract

1. **Collapsible Custody Sidebar (`w-[var(--ds-sidebar-width)]`)**:
   - **CustodyPortfolioSwitcher**: Dropdown selector switching between Consolidated Master Vault (`R$ 1.482.910,45`), B3 & Domestic Fixed Income (`R$ 1.095.400,00`), and Offshore & Crypto Desk (`R$ 387.510,45`).
   - **11-Asset-Class Custody Tree (12 `AssetClassCode` keys)**: Uses smooth CSS `grid-rows-[1fr] / grid-rows-[0fr]` transitions across four asset families:
     - *Fixed Income & Sovereign*: `TESOURO`, `FIXED_INCOME`, `PREV`
     - *Equities & Public Offers*: `EQUITY_BR`, `EQUITY_INTL`, `IPO`
     - *Funds, ETFs & Structured*: `FUND`, `ETF`, `COE`
     - *Crypto, FX & Commodities*: `CRYPTO`, `GOLD`, `FX`
   - **Quantitative Engines**: Direct shortcuts for Markowitz Efficient Frontier, Intrinsic Valuation (DCF), Black-Litterman Macro Views, and Trading Desk (GARCH/Kalman).
   - **Bottom System Bar**: Direct telemetry triggers for `GoRules JDM Guardrails` (`<1ms`) and `AES-256-GCM API Vault`.
2. **Telemetry Topbar (`h-[var(--ds-topbar-height)]`)**:
   - Sidebar collapse toggle (`PanelLeftClose` / `PanelLeftOpen`), breadcrumb (`ActivePortfolio / ACTIVE_VIEW`), and real-time tabular strip (`CDI`, `PORTFOLIO SHARPE`, `MARKOWITZ VOL (sigma)`, `[CVM_GUARD: ENFORCED]`).
3. **Command Palette (`Cmd+K` / `Ctrl+K`)**:
   - Deterministic modal (`role="dialog"`, `aria-modal="true"`) triggered via keyboard shortcut or sidebar action, surfacing zero-LLM quantitative triggers and local SINACOR/B3 file import.
