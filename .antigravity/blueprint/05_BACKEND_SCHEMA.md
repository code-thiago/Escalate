# 05 — Database Schema, Contracts & Zero-Trust Guardrails (`05_BACKEND_SCHEMA.md`)
**Project**: Escalate — Project Midas (`simulador-financeiro`)
**Governance Framework**: `AGENTS.md` (`v3.0.0-ULTRA-MESH`)
**Document Status**: `APPROVED_AND_LOCKED` (`5/5` Signatures)
**Target Horizon**: Canonical Baseline + Escalate Quantitative & Custody Schema (`v1.2.0` / `v2.0.0`)
**Lead Personas**: `@agent-software-engineer` & `@agent-cybersecurity` (Co-Reviewed by `@agent-orchestrator`, `@agent-design`, `@agent-data`)

---

## 1. PostgreSQL + TimescaleDB + pgvector DDL Architecture

Escalate persists relational tenant data on **Neon Serverless PostgreSQL** via **Drizzle ORM** (`src/db/schema.ts`), extended for time-series custody telemetry (`TimescaleDB`) and semantic macro/regulatory embeddings (`pgvector`):

### 1.1 Active Relational & Better Auth Tables (`src/db/schema.ts`)
* `user` (`uuid PK`, `name`, `email UK`, `email_verified`, `created_at`, `updated_at`) — Cascade deletes downstream tenant records per LGPD Art. 18.
* `session`, `account`, `verification` — Better Auth session and credential storage.
* `simulacoes` (`uuid PK`, `user_id FK`, `tipo`, `nome`, `parametros jsonb`, `criado_em`) — Enforces `MAX_SIMULACOES_POR_USUARIO = 50` and Drizzle declarative `pgPolicy("simulacoes_tenant_isolation_policy")`.

### 1.2 Escalate Target Quantitative & Custody DDL (PostgreSQL + TimescaleDB + pgvector)

```sql
-- Extension alignment for time-series custody & macro RAG
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;

-- Normalized 11-Class Portfolio Custody Positions
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN (
    'FIXED_INCOME', 'TESOURO', 'EQUITY_BR', 'EQUITY_INTL',
    'FUND', 'ETF', 'PREV', 'COE', 'GOLD', 'FX', 'CRYPTO', 'IPO'
  )),
  benchmark_indexer TEXT NOT NULL CHECK (benchmark_indexer IN (
    'CDI', 'IPCA', 'SELIC', 'IBOV', 'SP500', 'USD', 'BTC', 'PRE'
  )),
  quantity_decimal NUMERIC(36, 12) NOT NULL,
  unit_price_decimal NUMERIC(36, 12) NOT NULL,
  expected_return_annual DOUBLE PRECISION NOT NULL,
  volatility_annual DOUBLE PRECISION NOT NULL,
  liquidity_days INTEGER NOT NULL CHECK (liquidity_days >= 0),
  tax_regime TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Encrypted Read-Only Custody Credentials (AES-256-GCM Envelope)
CREATE TABLE IF NOT EXISTS custody_api_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  iv_hex TEXT NOT NULL,
  auth_tag_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TimescaleDB Hypertable for Portfolio Telemetry Snapshots
CREATE TABLE IF NOT EXISTS portfolio_telemetry_ts (
  recorded_at TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  net_worth_decimal NUMERIC(36, 2) NOT NULL,
  sharpe_ratio DOUBLE PRECISION NOT NULL,
  markowitz_volatility DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (recorded_at, user_id)
);
-- SELECT create_hypertable('portfolio_telemetry_ts', 'recorded_at', if_not_exists => TRUE);

-- pgvector Macro & Regulatory Embeddings (SEC 13F / BCB / CVM)
CREATE TABLE IF NOT EXISTS macro_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ref TEXT NOT NULL,
  content_chunk TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Shared Polymorphic Contracts (`packages/contracts/src/asset-vector.ts`)

1. **`UnifiedAssetMathVectorSchema`**:
   - Validates `assetId`, `ticker`, `assetClass` (12 enum literals across the 11 custody classes), `benchmarkIndexer`, `quantityDecimal` (`/^\d+(\.\d+)?$/`), `unitPriceDecimal` (`/^\d+(\.\d+)?$/`), `expectedReturnAnnual`, `volatilityAnnual`, `liquidityDays`, and `taxRegime`.
2. **`DCFInputSchema`**:
   - Validates `freeCashFlows`, `wacc` `(0, 1)`, `terminalGrowthRate` `[-0.05, 1)`, `netDebtDecimal`, `sharesOutstandingDecimal` with strict refinement `data.wacc > data.terminalGrowthRate`.
3. **`enforceCvmResolution20Grammar(text: string)`**:
   - Deterministic regex barrier detecting `/\b(compre|venda|aloque|invista|resgate|troque|compre\s+agora|venda\s+agora)\b/i`.
   - Blocks non-compliant strings and appends mandatory `[DISCLAIMER CVM]` on analytical outputs.
4. **`EncryptedApiVaultRecordSchema`**:
   - Validates AES-256-GCM envelope records (`keyId`, `provider` in `['BINANCE_READONLY', 'B3_CEI']`, `ciphertextHex`, `ivHex` length `24`, `authTagHex` length `32`, `createdAt` ISO datetime).
5. **`BlackLittermanViewSchema`**:
   - Validates Bayesian qualitative market views (`ticker`, `directionalShock` in `[-0.30, 0.30]`, `confidenceOmega` in `[0.01, 0.99]`, `rationaleDigest` max `280` chars).
6. **`CoeOpportunityAuditSchema`**:
   - Validates structured COE opportunity cost audits (`coeTicker`, `expectedReturnAnnual`, `cdiBenchmarkAnnual`, `liquidityDays >= 0`, `illiquidityPenaltyAnnual`, `netSpreadVsCdiAnnual`, `verdict` in `['SUBOPTIMAL_VS_CDI', 'COMPETITIVE']`).
7. **WP-04 Stochastic Trading, OCR Normalization & SaaS Token Metering Contracts (`apps/api/src/modules/`, `src/app/api/escalate/trading-ocr/route.ts`)**:
   - **`trading-stochastic-engine.ts`**: Enforces GARCH(1,1) stationarity (`alpha + beta < 1`, `omega > 0`, `alpha >= 0`, `beta >= 0` -> throws `GARCH_NON_STATIONARY_PARAMS`) and recursive 1D Kalman Filter (`noisyPrices.length >= 2`, `processNoiseQ > 0`, `measurementNoiseR > 0`).
   - **`ocr-statement-normalizer.ts`**: Rejects unstructured OCR items with `confidenceScore < 0.80` into `rejectedLowConfidence` and validates accepted COE/Previdencia/Fixed-Income/Fund items against `UnifiedAssetMathVectorSchema`.
   - **`saas-token-meter.ts` & `POST /api/escalate/trading-ocr`**: Enforces subscription tier quotas (`FREE_TRIAL: 25,000`, `PRO_QUANT: 250,000`, `INSTITUTIONAL: 1,000,000`), bypasses debit on `isZeroTokenDeterministicRoute: true`, and returns HTTP `429` (`SAAS_TOKEN_QUOTA_EXCEEDED`) when exhausted.

---

## 3. GoRules ZEN Engine JDM Decision Graphs (`src/core/decision/graphs/`)

1. **`cvm-suitability-guard.jdm.json`**:
   - Inputs: `hasImperativeVerb`, `waccGtGrowth`, `riskProfile`, `volatilityBps`.
   - Outputs: `isCompliant`, `guardAction`, `reasonCode`.
   - Rules: Blocks imperative verbs (`CVM_RESOLUTION_20_IMPERATIVE_VERB`), aborts DCF on `WACC <= g` (`GORULES_MATH_GUARD_WACC_LE_G`), and flags suitability drift (`CONSERVADOR > 800 bps`, `MODERADO > 1800 bps`).
2. **`token-metering-gate.jdm.json`**:
   - Inputs: `isDeterministicParser`, `cacheHit`, `monthlyTokensUsed`, `monthlyQuotaLimit`.
   - Outputs: `allowLlmInvocation`, `routeTarget`, `cacheTtlSeconds`.
   - Rules: Routes deterministic parsers to `DETERMINISTIC_WORKER` (`0` tokens), serves 6h cached assets via `REDIS_CACHE_6H` (`21600s`), and blocks LLM calls above `250,000` monthly tokens.

---

## 4. STRIDE Threat Model & Zero-Secret-Leak Policy

| STRIDE Category | Threat Vector | Target Surface | Concrete Mitigation | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Spoofing** | Auth brute force / session hijack | `/api/auth/*` | Better Auth `HttpOnly` sessions + Upstash `5/60s` sliding limiter. | Locked |
| **Tampering** | NaN/negative/JSONB pollution or invalid DCF `WACC <= g` | `POST /api/simulacoes`, `quant-engine.ts` | `validadorSimulacao.ts` + `DCFInputSchema` + `GORULES_MATH_GUARD`. | Locked |
| **Repudiation** | Cross-tenant modification or unlogged advice | `DELETE /api/simulacoes/[id]`, Copilot | Ownership compound predicates + `zenService` execution trace. | Locked |
| **Info Disclosure** | Committed `.env`, Binance API key, or LLM key leak | Repository / Client bundle | Doppler CLI (`doppler run`) in-memory injection + `.gitleaks.toml` + `AES-256-GCM`. | Locked |
| **Denial of Service** | Unbounded loops or runaway LLM token costs | Quant workers, AI Copilot | `periodoMeses <= 1200`, `token-metering-gate.jdm.json`, Upstash rate limiters. | Locked |
| **Elevation** | Unscoped Drizzle queries or withdrawal keys | DB `simulacoes`, Binance connector | Declarative `pgPolicy` RLS + Binance Read-Only API validation. | Locked |

---

## 5. Governance Sign-Off (`05_BACKEND_SCHEMA.md` — 5/5 Slot)

| Persona | Role | Status | Note |
| :--- | :--- | :---: | :--- |
| **`@human-developer`** | Product Owner & Architect | `APPROVED` | Approved PostgreSQL + TimescaleDB + pgvector DDL and `DCFInputSchema` fix. |
| **`@agent-orchestrator`** | Swarm PM & Triage Lead | `APPROVED` | Full traceability between `packages/contracts` and `02_TRD.md`. |
| **`@agent-design`** | UI/UX & Design System Lead | `APPROVED` | Guardrail error/reason codes map cleanly to terminal badges. |
| **`@agent-software-engineer`** | Principal Full-Stack Architect | `APPROVED` | `UnifiedAssetMathVector` and GoRules JDM schemas locked. |
| **`@agent-cybersecurity`** | Shift-Left AppSec Gatekeeper | `APPROVED` | STRIDE controls, `.gitleaks.toml`, and CVM Resolution 20 guard verified. |
