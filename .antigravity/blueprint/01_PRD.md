# 01 — Product Requirements Document (PRD)
**Project**: Escalate — Project Midas (`simulador-financeiro`)
**Governance Framework**: `AGENTS.md` (`v3.0.0-ULTRA-MESH`)
**Document Status**: `APPROVED_AND_LOCKED` (`5/5` Signatures)
**Target Horizon**: Canonical Baseline (`v1.1.1`) + Evolutionary Terminal Milestone (`v1.2.0` / `v2.0.0`)
**Lead Persona**: `@agent-orchestrator` (Co-Reviewed by `@agent-design`, `@agent-software-engineer`, `@agent-cybersecurity`)

---

## 1. Executive Summary & Product Vision

**Escalate (Project Midas)** is an institutional-grade Brazilian wealth intelligence, quantitative portfolio optimization, and fixed-income simulation terminal. It eliminates IEEE-754 floating-point drift across both legacy integer-cent compounding (`src/core/`) and high-precision 128-bit `decimal.js` quantitative operations (`apps/api/src/modules/quant/`), enforced by sub-millisecond **GoRules ZEN Engine** deterministic compliance guardrails.

This PRD unifies:
1. **Canonical Baseline (`v1.1.1`)**: Compound Interest Simulator, Fixed Income Comparator (CDB, Tesouro Selic, Poupanca under Law 12,703/2012 and regressive IR), Live Market Telemetry (Brapi B3 + Alpha Vantage Forex with Upstash dual-tier rate limiting), and Parameter-Only Scenario Persistence (`jsonb`).
2. **Escalate Terminal Evolution (`v1.2.0` / `v2.0.0`)**:
   * **11-Class Portfolio Custody Normalization**: Unified polymorphic vector (`UnifiedAssetMathVector`) covering `FIXED_INCOME`, `TESOURO`, `EQUITY_BR`, `EQUITY_INTL`, `FUND`, `ETF`, `PREV`, `COE`, `GOLD`, `FX`, `CRYPTO`, and `IPO`.
   * **Zero-Cost Custody Ingestion**: Deterministic local parsers for SINACOR PDF brokerage notes and B3 CSV exports (`0` LLM tokens), on-demand Gemini 2.5 Flash OCR strictly for unstructured private bank statements, and read-only Binance API sync encrypted at rest via `AES-256-GCM`.
   * **Deterministic Quant & CVM Resolution 20 Guardrail**: All DCF, Markowitz, Sharpe, and Black-Litterman calculations execute inside isolated Node.js Worker Threads with `decimal.js` (`precision: 36`, `ROUND_HALF_EVEN`). GoRules JDM blocks imperative investment advice verbs (*Compre, Venda, Aloque, Invista, Resgate, Troque*).
   * **Zero-`.env` Secret Injection & Tenant Isolation**: Secrets injected exclusively in-memory via Doppler CLI (`doppler run`), scanned via `.gitleaks.toml`, paired with Neon PostgreSQL RLS and LGPD Art. 18 data minimization.

---

## 2. Target Audience & User Personas

| Persona ID | Role / Archetype | Core Needs | Pain Points Addressed |
| :--- | :--- | :--- | :--- |
| **`P-01`** | **Retail Brazilian Investor (PF)** | Compare net post-tax returns across CDB (% CDI), Tesouro Selic, and Poupanca, and audit COE opportunity costs. | Naive calculators ignore regressive IR (22.5% to 15.0%), B3 0.20% p.a. custody fees, and hidden option spreads. |
| **`P-02`** | **Long-Horizon & Quant Wealth Planner** | Project compound growth and analyze Markowitz risk/return, Sharpe ratio, and DCF intrinsic valuation across 11 asset classes. | Floating-point errors distort long-term compounding; fragmented spreadsheets lack multi-asset normalization. |
| **`P-03`** | **Privacy-Conscious Authenticated User** | Import B3/SINACOR statements and store financial scenarios with tenant isolation, zero plain-text secrets, and LGPD erasure rights. | Fear of cross-tenant leaks, leaked exchange API keys, or bloated LLM subscription costs. |

---

## 3. Core Functional Capabilities & 11-Class Custody Scope

### 3.1 Legacy Pure Financial Core (`src/core/`)
* **Cent-Based Integer Arithmetic (`Math.round`)**: All compound interest and fixed income comparative calculations convert BRL to integer cents prior to monthly compounding.
* **Statutory Brazilian Regressive Income Tax (IR)**: `22.5%` (<= 6m), `20.0%` (7-12m), `17.5%` (13-24m), `15.0%` (> 24m).
* **Poupanca (Law 12,703/2012)**: Tax-exempt; `0.5% p.m. + TR` when `Selic > 8.5%`, or `70% * i_mensal_Selic + TR` when `Selic <= 8.5%`.

### 3.2 Polymorphic 11-Class Asset Vector (`packages/contracts/src/asset-vector.ts`)
All heterogeneous instruments normalize into `UnifiedAssetMathVectorSchema`:
* **Fixed Income & Sovereign**: `FIXED_INCOME` (CDB/LCI/LCA/Debentures), `TESOURO` (IPCA+/Selic/Prefixado), `PREV` (PGBL/VGBL).
* **Equities & Public Offers**: `EQUITY_BR` (B3 Equities & FIIs), `EQUITY_INTL` (NYSE/Nasdaq), `IPO` (Public Offerings / Follow-ons).
* **Funds & Structured Products**: `FUND` (CVM CNPJ Daily Quota), `ETF` (Thematic & Index), `COE` (Opportunity Cost Audit vs CDI).
* **Alternatives & Currencies**: `CRYPTO` (Binance Read-Only), `GOLD` (OZ1D / Spot IAU), `FX` (USD/EUR PTAX).

### 3.3 Zero-Cost Ingestion & Quantitative Engine (`apps/api/src/modules/`)
* **SINACOR / B3 Deterministic Parser**: Parses standardized brokerage PDFs and CEI/B3 CSV files locally at `0` token cost.
* **On-Demand OCR (`Gemini 2.5 Flash`)**: Invoked strictly when deterministic parsers fail on unstructured bank PDFs, gated by GoRules `token-metering-gate.jdm.json`.
* **Read-Only Exchange Custody**: Exchange API keys stored strictly via `AES-256-GCM` envelope encryption with withdrawal permissions rejected.
* **128-bit Precision Quant Engine (`decimal.js`)**: Computes DCF Enterprise Value (`WACC > g` enforced) and Portfolio Sharpe Ratio (`precision: 36`, `ROUND_HALF_EVEN`).

---

## 4. Traceable User Stories & Acceptance Criteria

* **`US-01`**: Compound Interest Wealth Projection (integer cents, Month 0 injection, `tabular-nums`, bounded ceilings `valorInicial <= 1e9`, `periodoMeses <= 1200`, `valorTotal <= 1e15`).
* **`US-02`**: Fixed Income Net Yield Comparison (CDB, Tesouro Selic, Poupanca with collapsible Advanced Parameters `taxaCustodiaTesouroAnual` & `taxaReferencialMensal`).
* **`US-03`**: Parameter-Only Cloud Scenario Persistence & Server Validation (`validadorSimulacao.ts`, Upstash rate limiting, `MAX_SIMULACOES_POR_USUARIO = 50`).
* **`US-04`**: Saved Scenario Hydration (`?valorInicial=...`) & Inline Deletion (`DELETE /api/simulacoes/[id]` with `404` anti-enumeration).
* **`US-05`**: Zero-Trust Tenant Isolation (`pgPolicy` RLS), LGPD Art. 18 Cascade Erasure, Doppler In-Memory Secret Injection (`doppler run`), and `.gitleaks.toml` key scanning.
* **`US-06`**: Live Market Telemetry Bar with Dual-Tier Upstash Rate Limiting (`Brapi` + `Alpha Vantage`).
* **`US-07`** *(Escalate WP-01)*: Unified 11-Class Asset Normalization (`UnifiedAssetMathVectorSchema`), Deterministic DCF & Portfolio Sharpe Engine (`decimal.js`), and GoRules CVM Resolution 20 Grammar Enforcement (`enforceCvmResolution20Grammar` blocking imperative recommendation verbs).

---

## 5. Non-Functional Requirements (NFRs)

| Category | Requirement ID | Specification | Target Metric |
| :--- | :--- | :--- | :--- |
| **Mathematical Precision** | `NFR-MATH-01` | Zero IEEE-754 drift across compounding (`Math.round` cents) and Quant DCF/Sharpe (`decimal.js` precision 36). | `100%` unit test pass rate in `src/core/` & `apps/api/tests/`. |
| **Regulatory Guardrail** | `NFR-COMP-01` | Deterministic CVM Resolution 20 grammar filter + `WACC > g` invariant via GoRules ZEN Engine. | `< 1ms` evaluation latency; `0` imperative verbs emitted. |
| **Secret Hygiene** | `NFR-SEC-01` | Doppler CLI runtime secret injection (`doppler run`) + `.gitleaks.toml` scan + Neon Postgres RLS. | `0` committed keys; `0` cross-tenant leaks. |
| **Accessibility** | `NFR-A11Y-01` | 3-tier `--ds-*` tokens on `#09090b` verified for **WCAG 2.2 AAA** (`>= 7.0:1`), mandatory `.tabular-financial`, keyboard `Cmd/Ctrl+K` navigation. | `>= 7.0:1` text contrast across terminal UI. |

---

## 6. Governance Sign-Off (`01_PRD.md` — 5/5 Slot)

| Persona | Role | Status | Note |
| :--- | :--- | :---: | :--- |
| **`@human-developer`** | Product Owner & Architect | `APPROVED` | Approved Option A Hybrid Monorepo & Escalate Terminal scope (`US-01..US-07`). |
| **`@agent-orchestrator`** | Swarm PM & Triage Lead | `APPROVED` | Full traceability across `DESIGN.md` and `01`..`06` verified. |
| **`@agent-design`** | UI/UX & Design System Lead | `APPROVED` | WCAG 2.2 AAA `--ds-*` tokens & `EscalateTerminalShell` aligned. |
| **`@agent-software-engineer`** | Principal Full-Stack Architect | `APPROVED` | `UnifiedAssetMathVector` & `decimal.js` Quant Engine locked. |
| **`@agent-cybersecurity`** | Shift-Left AppSec Gatekeeper | `APPROVED` | CVM Res 20 guardrail, Doppler CLI, and `.gitleaks.toml` verified. |
