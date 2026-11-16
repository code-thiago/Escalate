"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import { computeFullPortfolioDashboardState } from "@/src/core/finance/demo-portfolio";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";
import type { LiquidityTier, ProductClass } from "@/src/connectors/types";

const LIQUIDITY_LABELS: Record<LiquidityTier, string> = {
  D_0: "D+0 (Liquidez Imediata)",
  D_1_TO_5: "D+1 a D+5 (Curto Prazo)",
  D_6_TO_30: "D+6 a D+30 (Intermediaria)",
  D_PLUS_30: "D+30+ (Ciclo Longo)",
  AT_MATURITY: "No Vencimento (Travado)",
};

export default function MinhaCarteiraPage() {
  const [selectedClass, setSelectedClass] = useState<ProductClass | "ALL">("ALL");
  const dashboard = useMemo(() => computeFullPortfolioDashboardState(), []);

  const filteredPositions = useMemo(() => {
    if (selectedClass === "ALL") return dashboard.positions;
    return dashboard.positions.filter((p) => p.productClass === selectedClass);
  }, [dashboard.positions, selectedClass]);

  const totalBpsCheck = useMemo(() => {
    return Object.values(dashboard.consolidation.classAllocations).reduce(
      (sum, item) => sum + (item?.shareBps ?? 0),
      0,
    );
  }, [dashboard.consolidation.classAllocations]);

  return (
    <PlatformShell
      title="Minha Carteira — Classes, Rentabilidade Individual & Liquidez"
      subtitle="Consolidacao multi-custodia com metodo do Maior Resto (Hare-Niemeyer 10.000 bps), escada de liquidez em 5 niveis e auditoria FGC"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/investimentos"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Calendario Bifasico
          </Link>
          <Link
            href="/investimentos/objetivos"
            className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Objetivos & Metas
          </Link>
        </div>
      }
    >
      {/* Section 1: Asset Classes & 5-Tier Liquidity Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Asset Class (Hare-Niemeyer 10000 bps) */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                1. Distribuicao por Classe de Ativo
              </h3>
              <p className="text-xs text-slate-400">
                Invariante Hare-Niemeyer: Soma Exata = {totalBpsCheck} bps (
                {formatBpsPercent(totalBpsCheck)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClass("ALL")}
              className="text-xs font-mono text-indigo-400 hover:underline"
            >
              Limpar Filtro
            </button>
          </div>

          <div className="space-y-2.5">
            {Object.entries(dashboard.consolidation.classAllocations).map(
              ([cls, alloc]) => {
                if (!alloc) return null;
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() =>
                      setSelectedClass(
                        isSelected ? "ALL" : (cls as ProductClass),
                      )
                    }
                    className={`w-full text-left rounded p-3 border transition-colors ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono uppercase font-semibold text-slate-200">
                        {cls.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-4 font-mono tabular-nums">
                        <span className="text-slate-300">
                          {formatCentsBRL(alloc.totalCents)}
                        </span>
                        <span className="text-indigo-400 font-bold w-16 text-right">
                          {formatBpsPercent(alloc.shareBps)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${alloc.shareBps / 100}%` }}
                      />
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* 5-Tier Liquidity Ladder */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-100">
              2. Liquidez dos Ativos (Escada em 5 Niveis)
            </h3>
            <p className="text-xs text-slate-400">
              Mapeamento de disponibilidade de caixa do D+0 ate o vencimento contratual
            </p>
          </div>

          <div className="space-y-3">
            {(Object.keys(LIQUIDITY_LABELS) as LiquidityTier[]).map((tier) => {
              const bucketCents = dashboard.liquidityLadder.buckets[tier] ?? 0n;
              const shareBps =
                dashboard.consolidation.totalNetCents > 0n
                  ? Number(
                      (bucketCents * 10000n) /
                        dashboard.consolidation.totalNetCents,
                    )
                  : 0;

              return (
                <div
                  key={tier}
                  className="bg-slate-900/70 border border-slate-800 rounded p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-200">
                      {LIQUIDITY_LABELS[tier]}
                    </span>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-emerald-400 font-semibold">
                        {formatCentsBRL(bucketCents)}
                      </span>
                      <span className="text-slate-400 w-14 text-right">
                        {formatBpsPercent(shareBps)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.min(100, shareBps / 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Section 2: Individual Products & Net Profitability Table */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              3. Produtos Individuais & Rentabilidade Liquida ({filteredPositions.length}{" "}
              Ativos)
            </h3>
            <p className="text-xs text-slate-400">
              Rentabilidade individual descontada de IR regressivo/custodia, indexador contratual e status de cobertura FGC.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 pr-4">Codigo / Produto</th>
                <th className="py-2.5 pr-4">Classe</th>
                <th className="py-2.5 pr-4">Indexador & Taxa</th>
                <th className="py-2.5 pr-4">Liquidez</th>
                <th className="py-2.5 pr-4 text-right">Valor Investido</th>
                <th className="py-2.5 pr-4 text-right">Saldo Liquido</th>
                <th className="py-2.5 pr-4 text-right">Rentabilidade</th>
                <th className="py-2.5 text-center">FGC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {filteredPositions.map((pos) => {
                const netGainCents = pos.currentNetCents - pos.investedCents;
                const netGainBps =
                  pos.investedCents > 0n
                    ? Number((netGainCents * 10000n) / pos.investedCents)
                    : 0;

                return (
                  <tr
                    key={pos.tickerOrCode}
                    className="hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-bold text-slate-100">
                        {pos.tickerOrCode}
                      </div>
                      <div className="font-sans text-[11px] text-slate-400">
                        {pos.assetName}
                      </div>
                    </td>
                    <td className="py-3 pr-4 uppercase text-indigo-300">
                      {pos.productClass.replace("_", " ")}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {pos.indexer} ({formatBpsPercent(pos.annualRateBps)} a.a.)
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {pos.liquidityTier}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-300">
                      {formatCentsBRL(pos.investedCents)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-100">
                      {formatCentsBRL(pos.currentNetCents)}
                    </td>
                    <td className="py-3 pr-4 text-right text-emerald-400 font-semibold">
                      +{formatBpsPercent(netGainBps)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          pos.fgcCovered
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {pos.fgcCovered ? "SIM" : "NAO"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
