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
          <div className="flex items-center gap-1 p-1 bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSubTab("metas")}
              className={`px-3 py-1.5 rounded text-xs font-[family-name:var(--ds-font-mono)] font-semibold transition-colors cursor-pointer ${
                activeSubTab === "metas"
                  ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                  : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              Metas &amp; Alocacao (bps)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("simulador")}
              className={`px-3 py-1.5 rounded text-xs font-[family-name:var(--ds-font-mono)] font-semibold transition-colors cursor-pointer ${
                activeSubTab === "simulador"
                  ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                  : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              Projecao de Juros &amp; Historico
            </button>
          </div>
          <Link
            href="/investimentos/carteira"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors"
          >
            Minha Carteira
          </Link>
        </div>
      }
    >
      {activeSubTab === "metas" ? (
        <>
          {/* Interactive Fractional Slider Control */}
          <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                  Simulador de Fracionamento em Basis Points (CDB-ITAU-DI -&gt; Reserva de Liquidez)
                </h2>
                <p className="text-xs text-[var(--ds-text-secondary)] tabular-financial">
                  Ajuste a fracao do ativo CDB-ITAU-DI destinada ao Objetivo #1 (100 bps = 1,00% | 10.000 bps = 100,00%).
                </p>
              </div>
              <span className="text-sm font-bold text-[var(--ds-accent-quant)] tabular-financial">
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
              className="w-full accent-[var(--ds-accent-quant)] cursor-pointer"
            />
          </section>

          {/* Goals Breakdown Cards */}
          <div className="space-y-6">
            {goalsComputed.map(({ meta, progress }) => (
              <section
                key={progress.goalId}
                className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--ds-text-primary)]">
                        {progress.title}
                      </h3>
                      <span className="tabular-financial text-[11px] px-2 py-0.5 rounded bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)]">
                        Meta: {meta.targetDate}
                      </span>
                      <span className="tabular-financial text-[11px] px-2 py-0.5 rounded bg-[var(--ds-accent-quant)]/10 border border-[var(--ds-accent-quant)]/30 text-[var(--ds-accent-quant)]">
                        Liquidez Max: {meta.requiredLiquidityMaxTier ?? "ANY"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ds-text-secondary)] mt-1 tabular-financial">
                      Alocado: {formatCentsBRL(progress.totalAllocatedCents)} de{" "}
                      {formatCentsBRL(progress.targetAmountCents)} | Restante:{" "}
                      {formatCentsBRL(progress.remainingCents)}
                    </p>
                  </div>

                  <div className="text-right tabular-financial">
                    <div className="text-xl font-bold text-[var(--ds-accent-quant)]">
                      {formatBpsPercent(progress.progressBps)}
                    </div>
                    <div className="text-[11px] text-[var(--ds-text-secondary)]">
                      {progress.isCompleted ? "META ATINGIDA" : "EM CONSTRUCAO"}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-[var(--ds-surface-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      progress.isCompleted
                        ? "bg-[var(--ds-market-positive)]"
                        : "bg-[var(--ds-accent-quant)]"
                    }`}
                    style={{ width: `${Math.min(100, progress.progressBps / 100)}%` }}
                  />
                </div>

                {/* ZEN Engine / Liquidity Mismatch Warnings */}
                {progress.warnings.length > 0 && (
                  <div className="bg-[var(--ds-market-warning)]/10 border border-[var(--ds-market-warning)]/40 rounded-lg p-3 space-y-1">
                    <div className="text-xs font-[family-name:var(--ds-font-mono)] font-semibold text-[var(--ds-market-warning)]">
                      ALERTA DETERMINISTICO DE LIQUIDEZ / VENCIMENTO (ZEN GUARD):
                    </div>
                    {progress.warnings.map((w, idx) => (
                      <p key={idx} className="text-xs text-[var(--ds-text-primary)] font-[family-name:var(--ds-font-mono)]">
                        - {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Allocated Assets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-mono)]">
                        <th className="py-2 pr-4">Ativo</th>
                        <th className="py-2 pr-4">Liquidez</th>
                        <th className="py-2 pr-4">Vencimento</th>
                        <th className="py-2 pr-4 text-right">Fracao Alocada</th>
                        <th className="py-2 pr-4 text-right">Saldo do Ativo</th>
                        <th className="py-2 text-right">Valor Contribuido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ds-border-subtle)] tabular-financial">
                      {progress.breakdown.map((item) => (
                        <tr key={item.assetId} className="text-[var(--ds-text-primary)]">
                          <td className="py-2.5 pr-4">
                            <span className="font-semibold">{item.tickerOrCode}</span>{" "}
                            <span className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                              ({item.assetName})
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] tabular-financial ${
                                item.hasLiquidityMismatch
                                  ? "bg-[var(--ds-market-warning)]/15 text-[var(--ds-market-warning)] border border-[var(--ds-market-warning)]/40"
                                  : "bg-[var(--ds-surface-elevated)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)]"
                              }`}
                            >
                              {item.liquidityTier}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--ds-text-secondary)] tabular-financial">
                            {item.maturityDate ?? "Sem Vencimento"}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-[var(--ds-accent-quant)] font-semibold tabular-financial">
                            {item.allocatedBps} bps ({formatBpsPercent(item.allocatedBps)})
                          </td>
                          <td className="py-2.5 pr-4 text-right text-[var(--ds-text-secondary)] tabular-financial">
                            {formatCentsBRL(item.assetNetCents)}
                          </td>
                          <td className="py-2.5 text-right text-[var(--ds-market-positive)] font-semibold tabular-financial">
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
