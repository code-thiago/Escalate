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

### WP-02: Custody Vault, SINACOR/COE Ingestion, Markowitz/Black-Litterman & Pre-LLM Agent Bridge (`TDD`)
* **`WP-02.1` (`VAULT & CONTRACTS`)**: Expand `packages/contracts/src/asset-vector.ts` (`EncryptedApiVaultRecordSchema`, `BlackLittermanViewSchema`, `CoeOpportunityAuditSchema`) and implement `apps/api/src/modules/security/envelope-vault.ts` (`encryptBrokerApiKey`, `decryptBrokerApiKey`). Verified by `apps/api/tests/wp02-1-vault.test.ts`.
* **`WP-02.2` (`SINACOR & COE INGESTION`)**: Implement deterministic B3/SINACOR parser (`apps/api/src/modules/portfolio/sinacor-b3-parser.ts`) and COE opportunity cost auditor (`auditCoeAgainstCdi`). Verified by `apps/api/tests/wp02-2-sinacor-coe.test.ts`.
* **`WP-02.3` (`MARKOWITZ & BLACK-LITTERMAN`)**: Expand `apps/api/src/modules/quant/quant-engine.ts` with Markowitz covariance/weights and Black-Litterman posterior return blending. Verified by `apps/api/tests/wp02-3-markowitz-bl.test.ts`.
* **`WP-02.4` (`PRE-LLM BRIDGE & BLUEPRINT SYNC`)**: Implement `apps/api/src/modules/portfolio/custody-quant-bridge.ts` (`buildCompactPortfolioDigestForAgent` `< 1400` chars with CVM Resolution 20 grammar enforcement), verify via `apps/api/tests/wp02-4-bridge.test.ts`, synchronize `.antigravity/blueprint/` (`03_APP_FLOW.md`, `05_BACKEND_SCHEMA.md`, `06_IMPLEMENTATION_PLAN.md`, `BLUEPRINT_STATUS.json`), and pass full `vitest` + `tsc --noEmit` gates.

### WP-03: Custody & Quant API Routes, 6-Hour Multi-Tenant Semantic Cache & Off-Thread Worker Pool (`TDD`)
* **`WP-03.1` (`CUSTODY & VAULT API`)**: Implement custody ingestion (SINACOR/B3 CSV + COE audit) and AES-256-GCM broker key vault handlers. Verified by `apps/api/tests/wp03-1-custody-api.test.ts`.
* **`WP-03.2` (`QUANT & AGENT DIGEST API`)**: Implement DCF, Markowitz covariance, Black-Litterman posterior, and pre-LLM agent digest route handlers with CVM Resolution 20 guardrails. Verified by `apps/api/tests/wp03-2-quant-api.test.ts`.
* **`WP-03.3` (`SEMANTIC 6H CACHE & WORKER POOL`)**: Implement `SemanticAssetCache` (`apps/api/src/modules/agent/semantic-asset-cache.ts`, `21_600_000 ms` TTL with concurrent in-flight coalescing) and `runQuantTaskIsolated` (`apps/api/src/modules/quant/quant-worker-pool.ts`). Verified by `apps/api/tests/wp03-3-worker-cache.test.ts`.

### WP-04: Stochastic Trading Engine (GARCH/Kalman), Atomic SaaS Token Metering & OCR Statement Normalizer (`TDD`)
* **`WP-04.1` (`GARCH(1,1) & KALMAN ENGINE`)**: Implement `calculateGarch11ConditionalVolatility` (`alpha + beta < 1` stationarity guardrail) and `runKalmanFilterPriceSeries` in `apps/api/src/modules/quant/trading-stochastic-engine.ts`. Verified by `apps/api/tests/wp04-1-garch-kalman.test.ts`.
* **`WP-04.2` (`SAAS TOKEN METER & OCR NORMALIZER`)**: Implement `SaaSTokenMeter` (`apps/api/src/modules/billing/saas-token-meter.ts`) and `normalizeOcrExtractedHoldings` (`apps/api/src/modules/portfolio/ocr-statement-normalizer.ts`, `confidenceScore >= 0.80` threshold). Verified by `apps/api/tests/wp04-2-ocr-metering.test.ts`.
* **`WP-04.3` (`UNIFIED TRADING & OCR API ROUTE`)**: Implement `POST /api/escalate/trading-ocr` (`src/app/api/escalate/trading-ocr/route.ts`) supporting `RUN_GARCH_KALMAN` (`0` LLM tokens) and `INGEST_OCR_STATEMENT` (HTTP `429` quota gate). Verified by `apps/api/tests/wp04-3-trading-ocr-api.test.ts`.

### Legacy Waves 1–4 (Baseline Simulator Features — Maintained)
* Preserves pure validator (`src/core/validadorSimulacao.ts` / `src/core/finance/`), Drizzle RLS (`src/db/schema.ts`), and Upstash rate-limited API handlers (`src/app/api/*`).

---

## 3. Master Cross-Document Traceability Matrix (`DESIGN` + `01`..`06`)

| Story / Pillar | `DESIGN.md` & `04_DESIGN` | `03_APP_FLOW.md` | `05_BACKEND_SCHEMA.md` | `02_TRD.md` | `06_IMPLEMENTATION_PLAN.md` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`US-01..US-06` (Baseline)** | Legacy `globals.css` vars + `.tabular-nums` | `/app`, `/app/comparador`, `/minhas-simulacoes` | `simulacoes` + `pgPolicy` RLS + STRIDE | Pure `src/core/`, Upstash Dual-Tier RL | Legacy suites (`src/**/*.test.ts`, `tests/**/*.test.ts`) |
| **`US-07` (`EscalateTerminalShell`)** | `--ds-*` 3-Tier WCAG 2.2 AAA + `.tabular-financial` | Custody Accordion + `Cmd+K` Command Palette | `portfolio_positions` + `custody_api_vault` DDL | Hybrid Turborepo (`apps/web`, `packages/ui-tokens`) | `T-0.1`, `T-0.2`, `T-0.3` |
| **`US-07` (Quant & CVM Guard)** | `[CVM_GUARD: ENFORCED]` Topbar Telemetry | Deterministic Worker + GoRules Token Gate Flow | `UnifiedAssetMathVectorSchema` + `DCFInputSchema` + JDM | `decimal.js` (precision 36) + `@gorules/zen-engine` | `T-1.1`, `T-1.2`, `T-1.3`, `T-1.4`, `quant-and-cvm-guard.test.ts` |
| **`WP-02.1..WP-02.4` (Vault, SINACOR, Markowitz/BL, Digest Bridge)** | `.tabular-financial` Custody & Copilot Telemetry | `FLOW-INGESTION-SINACOR-01`, `FLOW-VAULT-AES256-01`, `FLOW-AGENT-DIGEST-01` | `EncryptedApiVaultRecordSchema`, `BlackLittermanViewSchema`, `CoeOpportunityAuditSchema` | AES-256-GCM + B3 Parser + Markowitz/BL + `< 350` Token Digest | `wp02-1-vault.test.ts`, `wp02-2-sinacor-coe.test.ts`, `wp02-3-markowitz-bl.test.ts`, `wp02-4-bridge.test.ts` |
| **`WP-03.1..WP-03.3` (Custody/Quant APIs, 6h Cache, Worker Pool)** | Terminal API Telemetry & Cache Badges | Deterministic Worker + 6h Cache Gate (`21_600_000 ms`) | Custody/Quant API Contracts & CVM Guard | `SemanticAssetCache` + `runQuantTaskIsolated` | `wp03-1-custody-api.test.ts`, `wp03-2-quant-api.test.ts`, `wp03-3-worker-cache.test.ts` |
| **`WP-04.1..WP-04.3` (GARCH/Kalman, Token Meter, OCR Normalizer & API)** | `.tabular-financial` Volatility, Z-Score & Quota Telemetry | Zero-Token `RUN_GARCH_KALMAN` + `INGEST_OCR_STATEMENT` (`429` Gate) | `trading-stochastic-engine.ts`, `ocr-statement-normalizer.ts`, `saas-token-meter.ts` | GARCH(1,1) + 1D Kalman Filter + ADR-002 Token Quota | `wp04-1-garch-kalman.test.ts`, `wp04-2-ocr-metering.test.ts`, `wp04-3-trading-ocr-api.test.ts` |

---

## 4. Governance Sign-Off (`06_IMPLEMENTATION_PLAN.md` — 5/5 Slot)

| Persona | Role | Status | Note |
| :--- | :--- | :---: | :--- |
| **`@human-developer`** | Product Owner & Architect | `APPROVED` | Approved Option A execution (`30/30` Blueprint Consensus). |
| **`@agent-orchestrator`** | Swarm PM & Triage Lead | `APPROVED` | Traceability across all 7 canonical documents verified. |
| **`@agent-design`** | UI/UX & Design System Lead | `APPROVED` | `EscalateTerminalShell` tokens and `.tabular-financial` locked. |
| **`@agent-software-engineer`** | Principal Full-Stack Architect | `APPROVED` | WP-01 TDD gates (`tsc --noEmit` + `vitest run`) locked. |
| **`@agent-cybersecurity`** | Shift-Left AppSec Gatekeeper | `APPROVED` | `develop` branch guardrail and `.gitleaks.toml` enforced. |
