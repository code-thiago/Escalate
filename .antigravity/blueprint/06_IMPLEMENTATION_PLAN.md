# 06 — Atomic TDD Execution Roadmap (`06_IMPLEMENTATION_PLAN.md`)
**Project**: Escalate — Project Midas (`simulador-financeiro`)
**Governance Framework**: `AGENTS.md` (`v3.0.0-ULTRA-MESH`)
**Document Status**: `APPROVED_AND_LOCKED` (`5/5` Signatures — `30/30` Total)
**Target Release**: Hybrid Monorepo & WP-01 Alignment on `develop` branch
**Lead Personas**: `@agent-orchestrator` & `@agent-software-engineer` (Co-Reviewed by `@agent-design`, `@agent-cybersecurity`, `@agent-qa`)

---

## 1. Git & Branching Governance Guardrails (`AGENTS.md`)

1. **Production Branch (`main`)**: Strictly read-only. NEVER commit, push, or merge to `main` autonomously.
2. **Target Execution Branch (`develop`)**: All WP-01, Design System, and Blueprint synchronization work executes exclusively on `develop`.

---

## 2. Work Package Roadmap (`Red -> Green -> Refactor`)

### WP-00: Hybrid Monorepo, Security & 3-Tier Design Tokens (`packages/ui-tokens`, `apps/web`)
* **`T-0.1`**: Configure `package.json` workspaces (`apps/*`, `packages/*`), `pnpm-workspace.yaml`, `turbo.json`, `.gitleaks.toml`, `tsconfig.json` aliases (`@escalate/contracts`, `@escalate/ui-tokens`), and `vitest.config.ts` (`apps/**/*.test.ts`). Keep `"dev": "next dev"` and add `"dev:doppler": "doppler run -- turbo run dev"` + `"dev:local": "turbo run dev"`.
* **`T-0.2`**: Create `packages/ui-tokens/src/tokens.css` with Tier 1 `--raw-*`, Tier 2 `--ds-*` (WCAG 2.2 AAA verified on `#09090b`), Tier 3 slot tokens (`--ds-sidebar-width`, `--ds-topbar-height`), and `.tabular-financial`. Import into `src/app/globals.css`.
* **`T-0.3`**: Implement `apps/web/src/components/shell/EscalateTerminalShell.tsx` using strictly `--ds-*` CSS tokens (zero hardcoded hex classes) and `.tabular-financial`, re-exported via `src/components/shell/EscalateTerminalShell.tsx` and `src/components/shell/PlatformShell.tsx`.

### WP-01: Polymorphic Contracts, Decimal.js Quant Engine & GoRules CVM Guardrail (`TDD`)
* **`T-1.1` (`CONTRACT`)**: Implement `packages/contracts/src/asset-vector.ts` exporting `AssetClassEnum`, `BenchmarkIndexerEnum`, `TaxRegimeEnum`, `UnifiedAssetMathVectorSchema`, `DCFInputSchema` (`wacc > terminalGrowthRate`), and `enforceCvmResolution20Grammar`.
* **`T-1.2` (`QUANT ENGINE`)**: Implement `apps/api/src/modules/quant/quant-engine.ts` (`calculateDiscountedCashFlow`, `calculatePortfolioSharpe`) using `decimal.js` (`precision: 36`, `ROUND_HALF_EVEN`).
* **`T-1.3` (`GORULES JDM`)**: Create `src/core/decision/graphs/cvm-suitability-guard.jdm.json` and `src/core/decision/graphs/token-metering-gate.jdm.json`; register both in `src/core/decision/zen.ts` `preloadGraphs()`.
* **`T-1.4` (`TDD VERIFY`)**: Author and pass `apps/api/tests/quant-and-cvm-guard.test.ts` (DCF Enterprise Value, `GORULES_MATH_GUARD`, `TESOURO` + `CRYPTO` Sharpe calculation, and CVM Resolution 20 imperative verb blocking).

### WP-02: Governance Matrix & Quality Verification Gates
* **`T-2.1` (`DOCS`)**: Author root `DESIGN.md` and synchronize `.antigravity/blueprint/01_PRD.md` through `06_IMPLEMENTATION_PLAN.md`, `BLUEPRINT_STATUS.json`, and `WAR_ROOM.md`.
* **`T-2.2` (`VERIFY`)**: Execute `npm run typecheck` (`tsc --noEmit`) and `npm test` (`vitest run`) across all legacy (`src/`, `tests/`) and new (`apps/api/tests/`) suites — `100%` pass required.
* **`T-2.3` (`SECOND BRAIN & GIT`)**: Execute `second-brain-cli.ps1 log`, `second-brain-cli.ps1 sync`, and commit on `develop` using `caveman-commit` semantics.

### Legacy Waves 1–4 (Baseline Simulator Features — Maintained)
* Preserves pure validator (`src/core/validadorSimulacao.ts` / `src/core/finance/`), Drizzle RLS (`src/db/schema.ts`), and Upstash rate-limited API handlers (`src/app/api/*`).

---

## 3. Master Cross-Document Traceability Matrix (`DESIGN` + `01`..`06`)

| Story / Pillar | `DESIGN.md` & `04_DESIGN` | `03_APP_FLOW.md` | `05_BACKEND_SCHEMA.md` | `02_TRD.md` | `06_IMPLEMENTATION_PLAN.md` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`US-01..US-06` (Baseline)** | Legacy `globals.css` vars + `.tabular-nums` | `/app`, `/app/comparador`, `/minhas-simulacoes` | `simulacoes` + `pgPolicy` RLS + STRIDE | Pure `src/core/`, Upstash Dual-Tier RL | Legacy suites (`src/**/*.test.ts`, `tests/**/*.test.ts`) |
| **`US-07` (`EscalateTerminalShell`)** | `--ds-*` 3-Tier WCAG 2.2 AAA + `.tabular-financial` | Custody Accordion + `Cmd+K` Command Palette | `portfolio_positions` + `custody_api_vault` DDL | Hybrid Turborepo (`apps/web`, `packages/ui-tokens`) | `T-0.1`, `T-0.2`, `T-0.3` |
| **`US-07` (Quant & CVM Guard)** | `[CVM_GUARD: ENFORCED]` Topbar Telemetry | Deterministic Worker + GoRules Token Gate Flow | `UnifiedAssetMathVectorSchema` + `DCFInputSchema` + JDM | `decimal.js` (precision 36) + `@gorules/zen-engine` | `T-1.1`, `T-1.2`, `T-1.3`, `T-1.4`, `T-2.2` |

---

## 4. Governance Sign-Off (`06_IMPLEMENTATION_PLAN.md` — 5/5 Slot)

| Persona | Role | Status | Note |
| :--- | :--- | :---: | :--- |
| **`@human-developer`** | Product Owner & Architect | `APPROVED` | Approved Option A execution (`30/30` Blueprint Consensus). |
| **`@agent-orchestrator`** | Swarm PM & Triage Lead | `APPROVED` | Traceability across all 7 canonical documents verified. |
| **`@agent-design`** | UI/UX & Design System Lead | `APPROVED` | `EscalateTerminalShell` tokens and `.tabular-financial` locked. |
| **`@agent-software-engineer`** | Principal Full-Stack Architect | `APPROVED` | WP-01 TDD gates (`tsc --noEmit` + `vitest run`) locked. |
| **`@agent-cybersecurity`** | Shift-Left AppSec Gatekeeper | `APPROVED` | `develop` branch guardrail and `.gitleaks.toml` enforced. |
