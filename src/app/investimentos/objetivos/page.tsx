"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import SimuladorJurosCompostos from "@/src/components/SimuladorJurosCompostos";
import HistoricoSimulacoes from "@/src/components/simulacoes/HistoricoSimulacoes";
import {
  INITIAL_INVESTMENT_GOALS,
  INITIAL_PORTFOLIO_POSITIONS,
} from "@/src/core/finance/demo-portfolio";
import { computeGoalProgress } from "@/src/core/finance/goals";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";
import type { GoalAllocationWithAsset } from "@/src/core/finance/types";

export default function ObjetivosPage() {
  const [activeSubTab, setActiveSubTab] = useState<"metas" | "simulador">("metas");
  const [customAllocBps, setCustomAllocBps] = useState<number>(8500);

  const goalsComputed = useMemo(() => {
    const posByTicker = new Map(
      INITIAL_PORTFOLIO_POSITIONS.map((p) => [p.tickerOrCode, p]),
    );

    return INITIAL_INVESTMENT_GOALS.map((entry, idx) => {
      const resolved: GoalAllocationWithAsset[] = [];
      for (const item of entry.allocations) {
        const asset = posByTicker.get(item.tickerOrCode);
        if (asset) {
          const effectiveBps =
            idx === 0 && item.tickerOrCode === "CDB-ITAU-DI"
              ? customAllocBps
              : item.allocatedBps;
          resolved.push({ asset, allocatedBps: effectiveBps });
        }
      }
      return {
        meta: entry.goal,
        progress: computeGoalProgress(entry.goal, resolved),
      };
    });
  }, [customAllocBps]);

  return (
    <PlatformShell
      title="Objetivos Financeiros — Alocacao Fracionada de Ativos (1 a 10.000 bps)"
      subtitle="Agrupamento flexivel de ativos por meta especifica com validacao automatica de descasamento de liquidez e vencimento (GoRules ZEN Guard)"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveSubTab("metas")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeSubTab === "metas"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Metas &amp; Alocacao (bps)
            </button>
            <button
              onClick={() => setActiveSubTab("simulador")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeSubTab === "simulador"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Projecao de Juros &amp; Historico
            </button>
          </div>
          <Link
            href="/investimentos/carteira"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Minha Carteira
          </Link>
        </div>
      }
    >
      {activeSubTab === "metas" ? (
        <>
          {/* Interactive Fractional Slider Control */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Simulador de Fracionamento em Basis Points (CDB-ITAU-DI -&gt; Reserva de Liquidez)
            </h3>
            <p className="text-xs text-slate-400">
              Ajuste a fracao do ativo CDB-ITAU-DI destinada ao Objetivo #1 (100 bps = 1,00% | 10.000 bps = 100,00%).
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-indigo-400 tabular-nums">
            {customAllocBps} bps ({formatBpsPercent(customAllocBps)})
          </span>
        </div>

        <input
          type="range"
          min={500}
          max={10000}
          step={100}
          value={customAllocBps}
          onChange={(e) => setCustomAllocBps(Number(e.target.value))}
          aria-label="Fracao alocada em basis points"
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </section>

      {/* Goals Breakdown Cards */}
      <div className="space-y-6">
        {goalsComputed.map(({ meta, progress }) => (
          <section
            key={progress.goalId}
            className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-100">
                    {progress.title}
                  </h3>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    Meta: {meta.targetDate}
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-300">
                    Liquidez Max: {meta.requiredLiquidityMaxTier ?? "ANY"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  Alocado: {formatCentsBRL(progress.totalAllocatedCents)} de{" "}
                  {formatCentsBRL(progress.targetAmountCents)} | Restante:{" "}
                  {formatCentsBRL(progress.remainingCents)}
                </p>
              </div>

              <div className="text-right font-mono tabular-nums">
                <div className="text-xl font-bold text-indigo-400">
                  {formatBpsPercent(progress.progressBps)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {progress.isCompleted ? "META ATINGIDA" : "EM CONSTRUCAO"}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  progress.isCompleted ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(100, progress.progressBps / 100)}%` }}
              />
            </div>

            {/* ZEN Engine / Liquidity Mismatch Warnings */}
            {progress.warnings.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-500/50 rounded p-3 space-y-1">
                <div className="text-xs font-mono font-semibold text-amber-300">
                  ALERTA DETERMINISTICO DE LIQUIDEZ / VENCIMENTO (ZEN GUARD):
                </div>
                {progress.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-amber-200/90 font-mono">
                    - {w}
                  </p>
                ))}
              </div>
            )}

            {/* Allocated Assets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2 pr-4">Ativo</th>
                    <th className="py-2 pr-4">Liquidez</th>
                    <th className="py-2 pr-4">Vencimento</th>
                    <th className="py-2 pr-4 text-right">Fracao Alocada</th>
                    <th className="py-2 pr-4 text-right">Saldo do Ativo</th>
                    <th className="py-2 text-right">Valor Contribuido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {progress.breakdown.map((item) => (
                    <tr key={item.assetId} className="text-slate-200">
                      <td className="py-2.5 pr-4">
                        <span className="font-semibold">{item.tickerOrCode}</span>{" "}
                        <span className="text-slate-400 font-sans">
                          ({item.assetName})
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            item.hasLiquidityMismatch
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.liquidityTier}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">
                        {item.maturityDate ?? "Sem Vencimento"}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-indigo-300 font-semibold">
                        {item.allocatedBps} bps ({formatBpsPercent(item.allocatedBps)})
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-400">
                        {formatCentsBRL(item.assetNetCents)}
                      </td>
                      <td className="py-2.5 text-right text-emerald-400 font-semibold">
                        {formatCentsBRL(item.allocatedCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
        </>
      ) : (
        <div className="space-y-6">
          <SimuladorJurosCompostos />
          <HistoricoSimulacoes />
        </div>
      )}
    </PlatformShell>
  );
}
