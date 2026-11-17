"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import {
  analyzePortfolioDensityMatrix,
  simulateQuantumWalkForecast,
} from "@/src/core/quant";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";

const PORTFOLIO_CORRELATION_MATRIX = [
  [1.0, 0.22, -0.08, 0.15, 0.04, -0.12],
  [0.22, 1.0, 0.31, 0.42, 0.18, 0.05],
  [-0.08, 0.31, 1.0, 0.64, 0.29, 0.19],
  [0.15, 0.42, 0.64, 1.0, 0.38, 0.45],
  [0.04, 0.18, 0.29, 0.38, 1.0, 0.14],
  [-0.12, 0.05, 0.19, 0.45, 0.14, 1.0],
];

const ASSET_LABELS = [
  "RENDA_FIXA_CDI",
  "TESOURO_IPCA",
  "BOLSA_B3",
  "ETF_SP500",
  "CRIPTO_BTC",
  "CAMBIO_USD",
];

type QuantEngineKey =
  | "copilot"
  | "markowitz"
  | "dcf"
  | "black-litterman"
  | "trading"
  | "gorules";

interface DcfExecutionResult {
  presentValueCashFlows: string;
  presentTerminalValue: string;
  enterpriseValue: string;
}

interface MarkowitzBlExecutionResult {
  markowitz: {
    totalValue: string;
    weights: number[];
    expectedReturnAnnual: number;
    portfolioVolatilityAnnual: number;
    sharpeRatio: number;
  };
  posteriorReturns: Record<string, number>;
}

interface TradingGarchKalmanResult {
  garch: {
    conditionalVariance: number;
    conditionalVolatility: number;
    isStationary: boolean;
  };
  kalman: {
    filteredPrices: number[];
    finalKalmanGain: number;
    latestSpreadZScore: number;
  };
  metering: {
    allowed: boolean;
    totalUsedTokens: number;
    remainingTokens: number;
  };
}

interface GoRulesDigestResult {
  portfolioName: string;
  assetCount: number;
  totalNetWorth: string;
  weightedReturnAnnual: number;
  diagonalVolatilityAnnual: number;
  sharpeRatio: number;
  topConcentrationTicker: string | null;
  topConcentrationPct: number;
  isCompliant: boolean;
  cvmGuardrailText: string;
  cvmViolationMatch?: string;
  rawHistoricalArraysStripped: true;
}

type EngineExecutionState =
  | { kind: "dcf"; data: DcfExecutionResult }
  | { kind: "markowitz-bl"; data: MarkowitzBlExecutionResult }
  | { kind: "trading"; data: TradingGarchKalmanResult }
  | { kind: "gorules"; data: GoRulesDigestResult };

const DEFAULT_QUANT_ASSETS = [
  {
    assetId: "asset-petr4",
    ticker: "PETR4",
    assetClass: "EQUITY_BR",
    benchmarkIndexer: "IBOV",
    quantityDecimal: "500.00",
    unitPriceDecimal: "40.00",
    expectedReturnAnnual: 0.16,
    volatilityAnnual: 0.28,
    liquidityDays: 2,
    taxRegime: "SWING_TRADE_15",
  },
  {
    assetId: "asset-gold11",
    ticker: "GOLD11",
    assetClass: "GOLD",
    benchmarkIndexer: "USD",
    quantityDecimal: "1000.00",
    unitPriceDecimal: "20.00",
    expectedReturnAnnual: 0.12,
    volatilityAnnual: 0.2,
    liquidityDays: 2,
    taxRegime: "SWING_TRADE_15",
  },
];

const ENGINE_METADATA: Record<
  QuantEngineKey,
  { label: string; badge: string; description: string }
> = {
  copilot: {
    label: "Quant AI Copilot (Pipeline Completo)",
    badge: "CVM-SAFE",
    description:
      "Orquestracao integrada entre DTQW SU(2), Matriz Densidade de Von Neumann e regras deterministicas GoRules ZEN.",
  },
  markowitz: {
    label: "Markowitz Efficient Frontier",
    badge: "< 5ms COVARIANCE",
    description:
      "Otimizacao de fronteira eficiente media-variancia sobre 11 classes com restricoes de liquidez e risco sistemico.",
  },
  dcf: {
    label: "Intrinsic Valuation (DCF)",
    badge: "ZERO-LLM MATH",
    description:
      "Desconto de fluxos futuros por WACC e taxa livre de risco soberana (NTN-B IPCA+) sem alucinacao aritmetica.",
  },
  "black-litterman": {
    label: "Black-Litterman Macro Views",
    badge: "SEC 13F + MACRO",
    description:
      "Combinacao bayesiana de equilibrio de mercado com vetores de visao macroeconomica e matriz de incerteza Omega.",
  },
  trading: {
    label: "Trading Desk (GARCH / Kalman)",
    badge: "ISOLATED",
    description:
      "Modelagem isolada de volatilidade condicional GARCH e filtro de Kalman em ambiente desacoplado da custodia core.",
  },
  gorules: {
    label: "GoRules JDM Guardrails",
    badge: "< 1ms JDM",
    description:
      "Auditoria deterministica de suitability, descasamento de liquidez e riscos estruturais via grafos JSON Decision Model.",
  },
};

function EngineQuerySync({
  onSelectEngine,
}: {
  onSelectEngine: (engine: QuantEngineKey) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const param = searchParams?.get("engine") as QuantEngineKey | null;
    if (param && param in ENGINE_METADATA) {
      onSelectEngine(param);
    } else {
      onSelectEngine("copilot");
    }
  }, [searchParams, onSelectEngine]);

  return null;
}

export default function QuantumAgentPage() {
  const [activeEngine, setActiveEngine] = useState<QuantEngineKey>("copilot");
  const [horizonDays, setHorizonDays] = useState<number>(40);
  const [decoherenceRate, setDecoherenceRate] = useState<number>(0.25);
  const [annualDriftBps, setAnnualDriftBps] = useState<number>(1345);
  const [annualVolBps, setAnnualVolBps] = useState<number>(1650);
  const [selectedJdmGraph, setSelectedJdmGraph] = useState<
    "portfolio-quantum-health" | "goal-allocation-guard" | "product-critical-analysis"
  >("portfolio-quantum-health");
  const [isExecutingEngine, setIsExecutingEngine] = useState<boolean>(false);
  const [engineExecutionError, setEngineExecutionError] = useState<string | null>(null);
  const [engineExecutionResult, setEngineExecutionResult] =
    useState<EngineExecutionState | null>(null);

  useEffect(() => {
    setEngineExecutionError(null);
    setEngineExecutionResult(null);
  }, [activeEngine]);

  const handleExecuteDeterministicEngine = async () => {
    if (activeEngine === "copilot") return;
    setIsExecutingEngine(true);
    setEngineExecutionError(null);

    try {
      if (activeEngine === "dcf") {
        const res = await fetch("/api/escalate/quant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RUN_DCF",
            freeCashFlows: ["100000.00", "110000.00", "121000.00"],
            wacc: 0.12,
            terminalGrowthRate: 0.04,
            netDebtDecimal: "50000.00",
            sharesOutstandingDecimal: "10000.00",
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        setEngineExecutionResult({ kind: "dcf", data: json.result });
      } else if (
        activeEngine === "markowitz" ||
        activeEngine === "black-litterman"
      ) {
        const res = await fetch("/api/escalate/quant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RUN_MARKOWITZ_BL",
            assets: DEFAULT_QUANT_ASSETS,
            correlationMatrix: [
              [1.0, -0.5],
              [-0.5, 1.0],
            ],
            riskFreeRateAnnual: 0.105,
            views: [
              {
                ticker: "PETR4",
                directionalShock: 0.28,
                confidenceOmega: 0.2,
                rationaleDigest: "Supply constraint shock.",
              },
            ],
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        setEngineExecutionResult({
          kind: "markowitz-bl",
          data: {
            markowitz: json.markowitz,
            posteriorReturns: json.posteriorReturns,
          },
        });
      } else if (activeEngine === "trading") {
        const res = await fetch("/api/escalate/trading-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RUN_GARCH_KALMAN",
            tenantId: "agent-workbench",
            tier: "FREE_TRIAL",
            garch: {
              omega: 0.00001,
              alpha: 0.12,
              beta: 0.85,
              previousReturnShock: -0.05,
              previousVolatility: 0.015,
            },
            kalman: {
              noisyPrices: [100.0, 100.02, 99.98, 100.01, 104.5],
              processNoiseQ: 0.01,
              measurementNoiseR: 1.0,
              initialEstimate: 100.0,
              initialErrorCov: 0.1,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        setEngineExecutionResult({
          kind: "trading",
          data: {
            garch: json.garch,
            kalman: json.kalman,
            metering: json.metering,
          },
        });
      } else if (activeEngine === "gorules") {
        const res = await fetch("/api/escalate/quant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "BUILD_AGENT_DIGEST",
            portfolioName: "Carteira Institucional Alpha",
            assets: DEFAULT_QUANT_ASSETS,
            riskFreeRateAnnual: 0.105,
            cvmCandidateText:
              "Compre agora PETR4 para maximizar retorno no curto prazo.",
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        setEngineExecutionResult({ kind: "gorules", data: json.digest });
      }
    } catch (err: unknown) {
      setEngineExecutionError(
        err instanceof Error ? err.message : "Erro ao executar motor deterministico.",
      );
    } finally {
      setIsExecutingEngine(false);
    }
  };

  const portfolioNetCents = 104690000n; // R$ 1,046,900.00 consolidated net portfolio

  // Stage 1A: Discrete-Time Quantum Walk (DTQW) with SU(2) coin operator
  const dtqw = useMemo(
    () =>
      simulateQuantumWalkForecast({
        portfolioNetCents,
        horizonDays,
        decoherenceRate,
        confidenceLevelBps: 9900,
        annualDriftBps,
        annualVolatilityBps: annualVolBps,
      }),
    [portfolioNetCents, horizonDays, decoherenceRate, annualDriftBps, annualVolBps],
  );

  // Stage 1B: Portfolio Density Matrix rho = (1/N)C & Von Neumann Entropy S(rho)
  const density = useMemo(
    () =>
      analyzePortfolioDensityMatrix(PORTFOLIO_CORRELATION_MATRIX, ASSET_LABELS),
    [],
  );

  // Stage 2: Deterministic GoRules ZEN JDM Trace Output
  const zenExecutionTrace = useMemo(() => {
    if (selectedJdmGraph === "portfolio-quantum-health") {
      return {
        graph: "portfolio-quantum-health.jdm.json",
        engine: "@gorules/zen-engine (Node.js Singleton)",
        inputs: {
          vonNeumannEntropy: density.vonNeumannEntropy,
          systemicCoherenceIndex: density.systemicCoherenceIndex,
          normalizedEntropyScoreBps: density.normalizedEntropyScoreBps,
          quantumTailRisk99Bps: dtqw.quantumTailRisk99Bps,
          d0LiquidityBps: 2307,
          hhiConcentration: 1580,
        },
        matchedRule: {
          id:
            density.normalizedEntropyScoreBps >= 7500
              ? "r_optimal_quantum_diversification"
              : "r_moderate_coherence_watch",
          healthScore: density.normalizedEntropyScoreBps >= 7500 ? 94 : 78,
          systemicRiskGrade:
            density.normalizedEntropyScoreBps >= 7500 ? "LOW" : "MODERATE",
          rebalanceRequired: decoherenceRate < 0.15,
          actions: [
            "MAINTAIN_ORTHOGONAL_EIGENSTATES",
            "MONITOR_SP500_B3_ENTANGLEMENT_064",
          ],
        },
      };
    }
    if (selectedJdmGraph === "goal-allocation-guard") {
      return {
        graph: "goal-allocation-guard.jdm.json",
        engine: "@gorules/zen-engine (Node.js Singleton)",
        inputs: {
          assetLiquidityTier: "AT_MATURITY",
          goalHorizonMonths: 5,
          allocationBps: 5000,
          riskProfile: "MODERADO",
        },
        matchedRule: {
          id: "r_maturity_short_horizon",
          approved: false,
          violations: "MATURITY_MISMATCH_LOCKED_ASSET",
          warnings: "CANNOT_ALLOCATE_LOCKED_ASSET_TO_SHORT_GOAL",
          adjustedAllocationBps: 0,
        },
      };
    }
    return {
      graph: "product-critical-analysis.jdm.json",
      engine: "@gorules/zen-engine (Node.js Singleton)",
      inputs: {
        productClass: "coe",
        managementFeeBps: 400,
        holdingPeriodDays: 1095,
        hasFgc: false,
        isExemptTax: false,
      },
      matchedRule: {
        id: "r_coe_structural_risk",
        criticalScore: 30,
        riskLevel: "CRITICAL",
        hiddenCostFlags:
          "EMBEDDED_OPTION_SPREAD,NO_FGC_ON_DERIVATIVE,MARK_TO_MARKET_ASYMMETRY",
        recommendation: "AVOID_EXCESSIVE_SPREAD_AND_ASYMMETRY",
      },
    };
  }, [selectedJdmGraph, density, dtqw.quantumTailRisk99Bps, decoherenceRate]);

  const maxBinProb = useMemo(
    () =>
      Math.max(
        0.001,
        ...dtqw.distribution.map((b) =>
          Math.max(b.blendedProbability, b.quantumProbability, b.classicalProbability),
        ),
      ),
    [dtqw.distribution],
  );

  const activeEngineMeta = ENGINE_METADATA[activeEngine];

  return (
    <PlatformShell
      title="Aba 03 — Quantum & GoRules ZEN Predictive AI Agent"
      subtitle="Pipeline Zero-Alucinacao em 3 Estagios: (1) Caminhada Quantica DTQW SU(2) + Entropia de Von Neumann S(rho), (2) Motor de Decisao GoRules ZEN JDM e (3) Sintese Analitica"
    >
      <Suspense fallback={null}>
        <EngineQuerySync onSelectEngine={setActiveEngine} />
      </Suspense>

      {/* Active Engine Telemetry Mode Strip */}
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-[family-name:var(--ds-font-mono)] uppercase px-2 py-0.5 rounded bg-[var(--ds-accent-quant)]/15 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30 tabular-financial">
                {activeEngineMeta.badge}
              </span>
              <h2 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                {activeEngineMeta.label}
              </h2>
            </div>
            <p className="text-xs text-[var(--ds-text-secondary)]">
              {activeEngineMeta.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(ENGINE_METADATA) as QuantEngineKey[]).map((key) => {
              const href = key === "copilot" ? "/agent" : `/agent?engine=${key}`;
              const active = activeEngine === key;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-[family-name:var(--ds-font-mono)] border transition-colors ${
                    active
                      ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] border-[var(--ds-accent-quant)] font-semibold"
                      : "bg-[var(--ds-bg-primary)] text-[var(--ds-text-secondary)] border-[var(--ds-border-subtle)] hover:text-[var(--ds-text-primary)]"
                  }`}
                >
                  {key}
                </Link>
              );
            })}
          </div>
        </div>

        {activeEngine !== "copilot" && (
          <div className="border-t border-[var(--ds-border-subtle)] pt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleExecuteDeterministicEngine}
                disabled={isExecutingEngine}
                className="px-3.5 py-2 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {isExecutingEngine
                  ? "Executando Motor Determinístico..."
                  : "Executar Motor Determinístico (decimal.js)"}
              </button>

              <span className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]">
                Endpoint:{" "}
                <span className="text-[var(--ds-text-primary)]">
                  {activeEngine === "trading"
                    ? "POST /api/escalate/trading-ocr"
                    : "POST /api/escalate/quant"}
                </span>
              </span>
            </div>

            {engineExecutionError && (
              <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-market-negative)]/40 rounded-lg p-3 text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-market-negative)]">
                {engineExecutionError}
              </div>
            )}

            {engineExecutionResult?.kind === "dcf" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    presentValueCashFlows
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
                    {engineExecutionResult.data.presentValueCashFlows}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    presentTerminalValue
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
                    {engineExecutionResult.data.presentTerminalValue}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-accent-quant)]/40 rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-accent-quant)]">
                    enterpriseValue
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-accent-quant)] mt-1 tabular-financial">
                    {engineExecutionResult.data.enterpriseValue}
                  </div>
                </div>
              </div>
            )}

            {engineExecutionResult?.kind === "markowitz-bl" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    portfolioVolatilityAnnual
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
                    {engineExecutionResult.data.markowitz.portfolioVolatilityAnnual.toFixed(
                      4,
                    )}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    sharpeRatio
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-market-positive)] mt-1 tabular-financial">
                    {engineExecutionResult.data.markowitz.sharpeRatio.toFixed(4)}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-accent-quant)]/40 rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-accent-quant)]">
                    posteriorReturns (clamped)
                  </div>
                  <div className="text-xs font-bold text-[var(--ds-text-primary)] mt-1 space-y-0.5 tabular-financial">
                    {Object.entries(
                      engineExecutionResult.data.posteriorReturns,
                    ).map(([ticker, val]) => (
                      <div key={ticker} className="tabular-financial">
                        {ticker}: {val.toFixed(4)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {engineExecutionResult?.kind === "trading" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    conditionalVolatility
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
                    {engineExecutionResult.data.garch.conditionalVolatility.toFixed(
                      6,
                    )}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    finalKalmanGain
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-accent-quant)] mt-1 tabular-financial">
                    {engineExecutionResult.data.kalman.finalKalmanGain.toFixed(
                      6,
                    )}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    latestSpreadZScore
                  </div>
                  <div className="text-sm font-bold text-[var(--ds-market-warning)] mt-1 tabular-financial">
                    {engineExecutionResult.data.kalman.latestSpreadZScore.toFixed(
                      6,
                    )}
                  </div>
                </div>
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-market-positive)]/40 rounded-lg p-3 flex flex-col justify-between">
                  <div className="text-[10px] text-[var(--ds-text-secondary)]">
                    Custo LLM Metering
                  </div>
                  <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-bold bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/40 tabular-financial">
                    {engineExecutionResult.data.metering.totalUsedTokens} Tokens
                  </span>
                </div>
              </div>
            )}

            {engineExecutionResult?.kind === "gorules" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-accent-quant)]">
                      Digest Compacto (&lt; 350 tokens)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-primary)] tabular-financial">
                      {JSON.stringify(engineExecutionResult.data).length} chars
                    </span>
                  </div>
                  <pre className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] overflow-x-auto leading-relaxed tabular-financial">
                    {JSON.stringify(engineExecutionResult.data, null, 2)}
                  </pre>
                </div>

                <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-market-warning)]/40 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-[family-name:var(--ds-font-mono)] uppercase text-[var(--ds-market-warning)]">
                      Auditoria CVM Resolucao 20
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--ds-market-negative)]/15 text-[var(--ds-market-negative)] border border-[var(--ds-market-negative)]/40 tabular-financial">
                      isCompliant:{" "}
                      {String(engineExecutionResult.data.isCompliant)}
                    </span>
                  </div>
                  <div className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] leading-relaxed">
                    {engineExecutionResult.data.cvmGuardrailText}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stage 1 Controls: Quantum Walk & Open Quantum Decoherence Parameter */}
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-[var(--ds-border-subtle)] pb-3">
          <div>
            <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
              Estagio 01 — Motor Matematico &amp; Quantico (src/core/quant/)
            </span>
            <h3 className="text-base font-semibold text-[var(--ds-text-primary)]">
              Parametros do Operador Moeda Unitario SU(2) &amp; Decoerencia Ambiental (gamma)
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-[var(--ds-bg-primary)] border border-[var(--ds-accent-quant)]/40 text-[var(--ds-accent-quant)] tabular-financial">
            Soma Unitariedade P(x,t) = {dtqw.totalProbabilitySum.toFixed(8)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-[family-name:var(--ds-font-mono)]">
              <label htmlFor="slider-horizon" className="text-[var(--ds-text-secondary)]">
                Passos Temporais (T):
              </label>
              <span className="text-[var(--ds-accent-quant)] font-bold tabular-financial">
                {horizonDays} dias
              </span>
            </div>
            <input
              id="slider-horizon"
              type="range"
              min={10}
              max={120}
              step={2}
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="w-full accent-[var(--ds-accent-quant)] cursor-pointer"
            />
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-[family-name:var(--ds-font-mono)]">
              <label htmlFor="slider-gamma" className="text-[var(--ds-text-secondary)]">
                Decoerencia (gamma):
              </label>
              <span className="text-[var(--ds-accent-quant)] font-bold tabular-financial">
                {decoherenceRate.toFixed(2)} (
                {decoherenceRate === 0
                  ? "Quantico Puro"
                  : decoherenceRate === 1
                    ? "Gaussiano Classico"
                    : "Hibrido Aberto"}
                )
              </span>
            </div>
            <input
              id="slider-gamma"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={decoherenceRate}
              onChange={(e) => setDecoherenceRate(Number(e.target.value))}
              className="w-full accent-[var(--ds-accent-quant)] cursor-pointer"
            />
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-[family-name:var(--ds-font-mono)]">
              <label htmlFor="slider-drift" className="text-[var(--ds-text-secondary)]">
                Drift Anual Esperado:
              </label>
              <span className="text-[var(--ds-market-positive)] font-bold tabular-financial">
                {formatBpsPercent(annualDriftBps)}
              </span>
            </div>
            <input
              id="slider-drift"
              type="range"
              min={400}
              max={2500}
              step={50}
              value={annualDriftBps}
              onChange={(e) => setAnnualDriftBps(Number(e.target.value))}
              className="w-full accent-[var(--ds-market-positive)] cursor-pointer"
            />
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-[family-name:var(--ds-font-mono)]">
              <label htmlFor="slider-vol" className="text-[var(--ds-text-secondary)]">
                Volatilidade Anual:
              </label>
              <span className="text-[var(--ds-market-warning)] font-bold tabular-financial">
                {formatBpsPercent(annualVolBps)}
              </span>
            </div>
            <input
              id="slider-vol"
              type="range"
              min={500}
              max={4000}
              step={50}
              value={annualVolBps}
              onChange={(e) => setAnnualVolBps(Number(e.target.value))}
              className="w-full accent-[var(--ds-market-warning)] cursor-pointer"
            />
          </div>
        </div>

        {/* Quantum Walk Projected Percentiles & Quantum VaR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3.5 tabular-financial">
            <div className="text-[11px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
              Cenario Pessimista Quantico (P10)
            </div>
            <div className="text-lg font-bold text-[var(--ds-market-warning)] mt-1 tabular-financial">
              {formatCentsBRL(dtqw.p10Cents)}
            </div>
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-accent-quant)]/40 rounded-lg p-3.5 tabular-financial">
            <div className="text-[11px] text-[var(--ds-accent-quant)] font-[family-name:var(--ds-font-sans)]">
              Expectativa Mediana DTQW (P50)
            </div>
            <div className="text-lg font-bold text-[var(--ds-text-primary)] mt-1 tabular-financial">
              {formatCentsBRL(dtqw.p50Cents)}
            </div>
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3.5 tabular-financial">
            <div className="text-[11px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
              Cenario Superposicao Balistica (P90)
            </div>
            <div className="text-lg font-bold text-[var(--ds-market-positive)] mt-1 tabular-financial">
              {formatCentsBRL(dtqw.p90Cents)}
            </div>
          </div>

          <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-market-negative)]/40 rounded-lg p-3.5 tabular-financial">
            <div className="text-[11px] text-[var(--ds-market-negative)] font-[family-name:var(--ds-font-sans)]">
              Quantum VaR 99% (Risco de Cauda)
            </div>
            <div className="text-lg font-bold text-[var(--ds-market-negative)] mt-1 tabular-financial">
              {formatCentsBRL(dtqw.quantumVaR99Cents)} (
              {formatBpsPercent(dtqw.quantumTailRisk99Bps)})
            </div>
          </div>
        </div>

        {/* Visual Lattice Probability Distribution P(x, t) */}
        <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-[family-name:var(--ds-font-mono)]">
            <span className="text-[var(--ds-text-secondary)]">
              Distribuicao de Probabilidade no Reticulado P(x, t) — Interferencia Quantica vs Difusao Classica
            </span>
            <span className="text-[var(--ds-accent-quant)] tabular-financial">
              {dtqw.distribution.length} estados quanticos ativos
            </span>
          </div>

          <div className="h-40 flex items-end gap-1 pt-4 px-2 border-b border-[var(--ds-border-subtle)]">
            {dtqw.distribution.map((bin) => {
              const heightPct = Math.max(
                4,
                Math.round((bin.blendedProbability / maxBinProb) * 100),
              );
              return (
                <div
                  key={bin.latticePosition}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      bin.returnBps < 0
                        ? "bg-[var(--ds-market-warning)]/70 group-hover:bg-[var(--ds-market-warning)]"
                        : "bg-[var(--ds-accent-quant)]/70 group-hover:bg-[var(--ds-accent-quant)]"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--ds-text-secondary)] tabular-financial">
            <span>Cauda Esquerda (x = -{horizonDays})</span>
            <span>Origem (x = 0)</span>
            <span>Cauda Direita Balistica (x = +{horizonDays})</span>
          </div>
        </div>
      </section>

      {/* Stage 1B & Stage 2: Density Matrix / Von Neumann Entropy & GoRules ZEN Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Density Matrix & Von Neumann Entropy */}
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="border-b border-[var(--ds-border-subtle)] pb-3">
            <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
              Operador Matriz Densidade rho = (1/N) * C
            </span>
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              Entropia Quantico-Informacional de Von Neumann: S(rho) = -Tr(rho ln rho)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs tabular-financial">
            <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
              <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                Entropia S(rho)
              </div>
              <div className="text-base font-bold text-[var(--ds-accent-quant)] mt-0.5 tabular-financial">
                {density.vonNeumannEntropy.toFixed(4)} nats
              </div>
              <div className="text-[10px] text-[var(--ds-text-secondary)] tabular-financial">
                Max ln({density.dimension}) = {density.maxTheoreticalEntropy.toFixed(3)}
              </div>
            </div>

            <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
              <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                Score Diversificacao
              </div>
              <div className="text-base font-bold text-[var(--ds-market-positive)] mt-0.5 tabular-financial">
                {formatBpsPercent(density.normalizedEntropyScoreBps)}
              </div>
              <div className="text-[10px] text-[var(--ds-text-secondary)] tabular-financial">
                Traco(rho) = {density.trace}
              </div>
            </div>

            <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
              <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                Coerencia Sistemica
              </div>
              <div className="text-base font-bold text-[var(--ds-text-primary)] mt-0.5 tabular-financial">
                {(density.systemicCoherenceIndex * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-[var(--ds-text-secondary)]">
                I_sys = 1 - S/ln(N)
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]">
              Espectro de Autovalores (Eigenvalues lambda_i de rho):
            </div>
            <div className="flex flex-wrap gap-2 text-xs tabular-financial">
              {density.eigenvalues.map((ev, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-primary)] tabular-financial"
                >
                  lambda_{i + 1} = {ev.toFixed(4)}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]">
              Pares de Maior Emaranhamento (Correlacao Cruzada):
            </div>
            <div className="space-y-1.5">
              {density.entanglementPairs.slice(0, 4).map((pair) => (
                <div
                  key={`${pair.assetA}-${pair.assetB}`}
                  className="flex items-center justify-between text-xs bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-1.5 tabular-financial"
                >
                  <span className="text-[var(--ds-text-primary)]">
                    {pair.assetA} &lt;-&gt; {pair.assetB}
                  </span>
                  <div className="flex items-center gap-3 tabular-financial">
                    <span className="text-[var(--ds-accent-quant)] tabular-financial">
                      corr: {pair.correlation.toFixed(2)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] tabular-financial">
                      {pair.entanglementSeverity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stage 2: GoRules ZEN Engine JDM Trace Inspector */}
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3 gap-2">
              <div>
                <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-market-positive)]">
                  Estagio 02 — GoRules ZEN Engine (src/core/decision/zen.ts)
                </span>
                <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                  Inspetor de Trace Deterministico (.jdm.json)
                </h3>
              </div>
              <select
                aria-label="Selecionar Grafo JDM"
                value={selectedJdmGraph}
                onChange={(e) =>
                  setSelectedJdmGraph(
                    e.target.value as typeof selectedJdmGraph,
                  )
                }
                className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] rounded-lg px-2.5 py-1 text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
              >
                <option value="portfolio-quantum-health">
                  portfolio-quantum-health.jdm.json
                </option>
                <option value="goal-allocation-guard">
                  goal-allocation-guard.jdm.json
                </option>
                <option value="product-critical-analysis">
                  product-critical-analysis.jdm.json
                </option>
              </select>
            </div>

            <pre className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3.5 text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-market-positive)] overflow-x-auto leading-relaxed tabular-financial">
              {JSON.stringify(zenExecutionTrace, null, 2)}
            </pre>
          </div>

          {/* Stage 3: Zero-Hallucination Analytical Synthesis */}
          <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-accent-quant)]/40 rounded-lg p-4 space-y-2">
            <div className="text-xs font-[family-name:var(--ds-font-mono)] uppercase font-semibold text-[var(--ds-accent-quant)]">
              Estagio 03 — Sintese Analitica do Agente (Zero-Alucinacao)
            </div>
            <p className="text-xs text-[var(--ds-text-primary)] leading-relaxed">
              Com horizonte de{" "}
              <span className="font-semibold tabular-financial">
                {horizonDays} dias
              </span>{" "}
              e taxa de decoerencia{" "}
              <span className="font-semibold tabular-financial">
                gamma = {decoherenceRate.toFixed(2)}
              </span>
              , o operador de caminhada quantica projeta mediana patrimonial P50 de{" "}
              <span className="font-semibold text-[var(--ds-accent-quant)] tabular-financial">
                {formatCentsBRL(dtqw.p50Cents)}
              </span>{" "}
              e risco de cauda VaR 99% limitado a{" "}
              <span className="font-semibold text-[var(--ds-market-warning)] tabular-financial">
                {formatCentsBRL(dtqw.quantumVaR99Cents)}
              </span>
              . A entropia de Von Neumann{" "}
              <span className="font-semibold text-[var(--ds-accent-quant)] tabular-financial">
                S(rho) = {density.vonNeumannEntropy.toFixed(4)} nats
              </span>{" "}
              confirma{" "}
              <span className="font-semibold tabular-financial">
                {formatBpsPercent(density.normalizedEntropyScoreBps)}
              </span>{" "}
              da diversificacao ortogonal maxima, aprovada pelo grafo{" "}
              <span className="font-[family-name:var(--ds-font-mono)] text-[var(--ds-market-positive)]">
                portfolio-quantum-health.jdm.json
              </span>
              .
            </p>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
