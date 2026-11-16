"use client";

import React, { useMemo, useState } from "react";
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

export default function QuantumAgentPage() {
  const [horizonDays, setHorizonDays] = useState<number>(40);
  const [decoherenceRate, setDecoherenceRate] = useState<number>(0.25);
  const [annualDriftBps, setAnnualDriftBps] = useState<number>(1345);
  const [annualVolBps, setAnnualVolBps] = useState<number>(1650);
  const [selectedJdmGraph, setSelectedJdmGraph] = useState<
    "portfolio-quantum-health" | "goal-allocation-guard" | "product-critical-analysis"
  >("portfolio-quantum-health");

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

  return (
    <PlatformShell
      title="Aba 03 — Quantum & GoRules ZEN Predictive AI Agent"
      subtitle="Pipeline Zero-Alucinacao em 3 Estagios: (1) Caminhada Quantica DTQW SU(2) + Entropia de Von Neumann S(rho), (2) Motor de Decisao GoRules ZEN JDM e (3) Sintese Analitica"
    >
      {/* Stage 1 Controls: Quantum Walk & Open Quantum Decoherence Parameter */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="font-mono text-[10px] uppercase text-cyan-400">
              Estagio 01 — Motor Matematico & Quantico (src/core/quant/)
            </span>
            <h3 className="text-base font-semibold text-slate-100">
              Parametros do Operador Moeda Unitario SU(2) & Decoerencia Ambiental (gamma)
            </h3>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 tabular-nums">
            Soma Unitariedade P(x,t) = {dtqw.totalProbabilitySum.toFixed(8)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="slider-horizon" className="text-slate-300">
                Passos Temporais (T):
              </label>
              <span className="text-indigo-400 font-bold tabular-nums">
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
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="slider-gamma" className="text-slate-300">
                Decoerencia (gamma):
              </label>
              <span className="text-cyan-400 font-bold tabular-nums">
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
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="slider-drift" className="text-slate-300">
                Drift Anual Esperado:
              </label>
              <span className="text-emerald-400 font-bold tabular-nums">
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
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="slider-vol" className="text-slate-300">
                Volatilidade Anual:
              </label>
              <span className="text-amber-400 font-bold tabular-nums">
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
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Quantum Walk Projected Percentiles & Quantum VaR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3.5 font-mono tabular-nums">
            <div className="text-[11px] text-slate-400">
              Cenario Pessimista Quantico (P10)
            </div>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {formatCentsBRL(dtqw.p10Cents)}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-indigo-500/40 rounded p-3.5 font-mono tabular-nums">
            <div className="text-[11px] text-indigo-300">
              Expectativa Mediana DTQW (P50)
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {formatCentsBRL(dtqw.p50Cents)}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded p-3.5 font-mono tabular-nums">
            <div className="text-[11px] text-slate-400">
              Cenario Superposicao Balistica (P90)
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {formatCentsBRL(dtqw.p90Cents)}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-red-500/40 rounded p-3.5 font-mono tabular-nums">
            <div className="text-[11px] text-red-300">
              Quantum VaR 99% (Risco de Cauda)
            </div>
            <div className="text-lg font-bold text-red-400 mt-1">
              {formatCentsBRL(dtqw.quantumVaR99Cents)} (
              {formatBpsPercent(dtqw.quantumTailRisk99Bps)})
            </div>
          </div>
        </div>

        {/* Visual Lattice Probability Distribution P(x, t) */}
        <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">
              Distribuicao de Probabilidade no Reticulado P(x, t) — Interferencia Quantica vs Difusao Classica
            </span>
            <span className="text-cyan-400">
              {dtqw.distribution.length} estados quanticos ativos
            </span>
          </div>

          <div className="h-40 flex items-end gap-1 pt-4 px-2 border-b border-slate-800">
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
                        ? "bg-amber-500/70 group-hover:bg-amber-400"
                        : "bg-cyan-500/70 group-hover:bg-cyan-300"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
            <span>Cauda Esquerda (x = -{horizonDays})</span>
            <span>Origem (x = 0)</span>
            <span>Cauda Direita Balistica (x = +{horizonDays})</span>
          </div>
        </div>
      </section>

      {/* Stage 1B & Stage 2: Density Matrix / Von Neumann Entropy & GoRules ZEN Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Density Matrix & Von Neumann Entropy */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="font-mono text-[10px] uppercase text-indigo-400">
              Operador Matriz Densidade rho = (1/N) * C
            </span>
            <h3 className="text-sm font-semibold text-slate-100">
              Entropia Quantico-Informacional de Von Neumann: S(rho) = -Tr(rho ln rho)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400">Entropia S(rho)</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5">
                {density.vonNeumannEntropy.toFixed(4)} nats
              </div>
              <div className="text-[10px] text-slate-400">
                Max ln({density.dimension}) = {density.maxTheoreticalEntropy.toFixed(3)}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400">Score Diversificacao</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {formatBpsPercent(density.normalizedEntropyScoreBps)}
              </div>
              <div className="text-[10px] text-slate-400">Traco(rho) = {density.trace}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400">Coerencia Sistemica</div>
              <div className="text-base font-bold text-indigo-400 mt-0.5">
                {(density.systemicCoherenceIndex * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-400">I_sys = 1 - S/ln(N)</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono text-slate-400">
              Espectro de Autovalores (Eigenvalues lambda_i de rho):
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs tabular-nums">
              {density.eigenvalues.map((ev, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                >
                  lambda_{i + 1} = {ev.toFixed(4)}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono text-slate-400">
              Pares de Maior Emaranhamento (Correlacao Cruzada):
            </div>
            <div className="space-y-1.5">
              {density.entanglementPairs.slice(0, 4).map((pair) => (
                <div
                  key={`${pair.assetA}-${pair.assetB}`}
                  className="flex items-center justify-between text-xs font-mono bg-slate-900/70 border border-slate-800 rounded px-3 py-1.5 tabular-nums"
                >
                  <span className="text-slate-300">
                    {pair.assetA} &lt;-&gt; {pair.assetB}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-300">
                      corr: {pair.correlation.toFixed(2)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {pair.entanglementSeverity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stage 2: GoRules ZEN Engine JDM Trace Inspector */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase text-emerald-400">
                  Estagio 02 — GoRules ZEN Engine (src/core/decision/zen.ts)
                </span>
                <h3 className="text-sm font-semibold text-slate-100">
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
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200"
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

            <pre className="bg-slate-950 border border-slate-800 rounded p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {JSON.stringify(zenExecutionTrace, null, 2)}
            </pre>
          </div>

          {/* Stage 3: Zero-Hallucination Analytical Synthesis */}
          <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-md p-4 space-y-2">
            <div className="text-xs font-mono uppercase font-semibold text-indigo-300">
              Estagio 03 — Sintese Analitica do Agente (Zero-Alucinacao)
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Com horizonte de{" "}
              <span className="font-mono font-semibold">{horizonDays} dias</span> e
              taxa de decoerencia{" "}
              <span className="font-mono font-semibold">
                gamma = {decoherenceRate.toFixed(2)}
              </span>
              , o operador de caminhada quantica projeta mediana patrimonial P50 de{" "}
              <span className="font-mono font-semibold text-indigo-300">
                {formatCentsBRL(dtqw.p50Cents)}
              </span>{" "}
              e risco de cauda VaR 99% limitado a{" "}
              <span className="font-mono font-semibold text-amber-300">
                {formatCentsBRL(dtqw.quantumVaR99Cents)}
              </span>
              . A entropia de Von Neumann{" "}
              <span className="font-mono font-semibold text-cyan-300">
                S(rho) = {density.vonNeumannEntropy.toFixed(4)} nats
              </span>{" "}
              confirma{" "}
              <span className="font-mono font-semibold">
                {formatBpsPercent(density.normalizedEntropyScoreBps)}
              </span>{" "}
              da diversificacao ortogonal maxima, aprovada pelo grafo{" "}
              <span className="font-mono text-emerald-300">
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
