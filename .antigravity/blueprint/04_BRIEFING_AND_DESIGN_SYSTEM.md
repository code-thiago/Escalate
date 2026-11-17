# 04 — Visual Briefing & 3-Tier Design System (`04_BRIEFING_AND_DESIGN_SYSTEM.md`)
**Project**: Escalate — Project Midas (`simulador-financeiro`)
**Governance Framework**: `AGENTS.md` (`v3.0.0-ULTRA-MESH`)
**Document Status**: `APPROVED_AND_LOCKED` (`5/5` Signatures)
**Design System Codename**: **Escalate Obsidian Terminal** (`WCAG 2.2 AAA`)
**Lead Persona**: `@agent-design` (Co-Reviewed by `@agent-orchestrator`, `@agent-software-engineer`, `@agent-cybersecurity`)

---

## 1. Visual Direction & Synchronized `DESIGN.md` Reference

This document is synchronized 1:1 with root [`DESIGN.md`](file:///c:/Dev/Projetos/Project%20Midas/simulador-financeiro/DESIGN.md) and [`packages/ui-tokens/src/tokens.css`](file:///c:/Dev/Projetos/Project%20Midas/simulador-financeiro/packages/ui-tokens/src/tokens.css). All terminal components strictly consume `--ds-*` semantic CSS variables over `#09090b` canvas, avoiding arbitrary translucent overlays (`bg-black/5`, `text-muted-foreground/50`) or hardcoded hex classes inside JSX.

---

## 2. 3-Tier `--ds-*` CSS Token Taxonomy (`packages/ui-tokens/src/tokens.css`)

### Tier 1: Global Primitives (`--raw-*`)
* Neutral Void Surfaces: `--raw-void-950` (`#09090b`), `--raw-void-900` (`#121215`), `--raw-void-850` (`#18181c`), `--raw-void-800` (`#27272a`)
* High-Contrast Slates: `--raw-slate-100` (`#fafafa`), `--raw-slate-300` (`#d4d4d8`), `--raw-slate-400` (`#a1a1aa`)
* Financial Telemetry Accents: `--raw-emerald-400` (`#34d399`), `--raw-crimson-400` (`#f87171`), `--raw-amber-400` (`#fbbf24`), `--raw-cyan-400` (`#38bdf8`)

### Tier 2: Semantic Tokens (`--ds-*`) Verified on `#09090b` (WCAG 2.2 AAA >= 7.0:1)

| Semantic Token | Primitive Mapping | Contrast on `#09090b` | Usage |
| :--- | :--- | :---: | :--- |
| `--ds-bg-primary` | `var(--raw-void-950)` | Base (`#09090b`) | Main terminal viewport & modal backdrop |
| `--ds-surface-card` | `var(--raw-void-900)` | Surface (`#121215`) | Collapsible sidebar, telemetry topbar, metric cards, Command Palette |
| `--ds-surface-elevated` | `var(--raw-void-850)` | Surface (`#18181c`) | Hover states & highlighted palette commands |
| `--ds-border-subtle` | `var(--raw-void-800)` | Hairline (`#27272a`) | Structural dividers, active item pills, accordion guide lines |
| `--ds-text-primary` | `var(--raw-slate-100)` | `19.3:1` AAA | Net worth totals, headings, active labels |
| `--ds-text-secondary` | `var(--raw-slate-400)` | `7.8:1` AAA | Section headers, metadata, inactive nav items |
| `--ds-market-positive` | `var(--raw-emerald-400)` | `10.4:1` AAA | Positive returns, `[CVM_GUARD: ENFORCED]`, `0-TOKEN` indicators |
| `--ds-market-negative` | `var(--raw-crimson-400)` | `7.2:1` AAA | Negative spreads, COE drag, `ISOLATED`/warning deltas |
| `--ds-market-warning` | `var(--raw-amber-400)` | `12.1:1` AAA | Markowitz volatility (`sigma`) & threshold warnings |
| `--ds-accent-quant` | `var(--raw-cyan-400)` | `9.6:1` AAA | Active nav icons, Quant engine badges, terminal prompts |

### Tier 3: Component Slots (`--ds-*`)
* `--ds-sidebar-width`: `272px`
* `--ds-topbar-height`: `56px`
* `--ds-font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
* `--ds-font-mono`: `'Geist Mono', 'JetBrains Mono', monospace`

---

## 3. Mandatory Tabular Financial Typography

Defined in `packages/ui-tokens/src/tokens.css` and imported in `src/app/globals.css`:
* Class `.tabular-financial` sets `font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.02em;`.
* Applied across all BRL currency amounts, percentage return badges, allocation weights, Sharpe ratio, volatility (`sigma`), and token metering telemetry.

---

## 4. `EscalateTerminalShell.tsx` Component Architecture

Located in `apps/web/src/components/shell/EscalateTerminalShell.tsx` (re-exported in `src/components/shell/EscalateTerminalShell.tsx` and `src/components/shell/PlatformShell.tsx`):
1. **`CustodyPortfolioSwitcher`**: Interactive dropdown (`aria-expanded`, `role="listbox"`) switching across `Consolidated Master Vault`, `B3 & Domestic Fixed Income`, and `Offshore & Crypto Desk`.
2. **`TerminalNavItem` (11 Asset Classes)**: Recursive accordion utilizing CSS `grid-rows-[1fr]` / `grid-rows-[0fr]` transitions across 4 custody families (`Fixed Income & Sovereign`, `Equities & Public Offers`, `Funds, ETFs & Structured`, `Crypto, FX & Commodities`) plus Quantitative Engines and System Footer (`GoRules JDM Guardrails`, `AES-256-GCM API Vault`).
3. **Telemetry Topbar**: Collapsible sidebar control (`PanelLeftClose` / `PanelLeftOpen`), breadcrumb, and tabular strip (`CDI`, `PORTFOLIO SHARPE`, `MARKOWITZ VOL (sigma)`, `[CVM_GUARD: ENFORCED]`).
4. **Command Palette (`Cmd+K` / `Ctrl+K`)**: Keyboard-accessible modal (`role="dialog"`, `aria-modal="true"`) presenting deterministic Zero-LLM actions (`< 5ms` Markowitz covariance, `0 Tokens` COE audit, `Local Parser` SINACOR/B3 import).
5. **Legacy Compatibility**: `src/app/globals.css` retains legacy `--background`, `--foreground`, `--investido`, and `--juros` variables for existing simulator charts (`GraficoEvolucao`, `GraficoComparacao`, `ComparadorInvestimentos`, `SimuladorJurosCompostos`).

---

## 5. Governance Sign-Off (`04_BRIEFING_AND_DESIGN_SYSTEM.md` — 5/5 Slot)

| Persona | Role | Status | Note |
| :--- | :--- | :---: | :--- |
| **`@human-developer`** | Product Owner & Architect | `APPROVED` | Approved strict replacement of hex classes with `--ds-*` tokens. |
| **`@agent-orchestrator`** | Swarm PM & Triage Lead | `APPROVED` | Synchronized 1:1 with root `DESIGN.md`. |
| **`@agent-design`** | UI/UX & Design System Lead | `APPROVED` | WCAG 2.2 AAA contrast ratios and `.tabular-financial` verified. |
| **`@agent-software-engineer`** | Principal Full-Stack Architect | `APPROVED` | Clean CSS import chain and zero breaking changes to legacy routes. |
| **`@agent-cybersecurity`** | Shift-Left AppSec Gatekeeper | `APPROVED` | Accessible ARIA semantics and deterministic badge honesty verified. |
