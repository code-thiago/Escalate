"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const VALID_CLASSES: ReadonlySet<ProductClass> = new Set<ProductClass>([
  "renda_fixa",
  "fundos",
  "bolsa",
  "coe",
  "cripto",
  "tesouro_direto",
  "cambio",
  "etfs",
]);

function ClasseQuerySync({
  onSelectClass,
}: {
  onSelectClass: (cls: ProductClass | "ALL") => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const param = searchParams?.get("classe");
    if (param && VALID_CLASSES.has(param as ProductClass)) {
      onSelectClass(param as ProductClass);
    } else if (param === "ALL") {
      onSelectClass("ALL");
    }
  }, [searchParams, onSelectClass]);

  return null;
}

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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors"
          >
            Calendario Bifasico
          </Link>
          <Link
            href="/investimentos/objetivos"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity"
          >
            Objetivos &amp; Metas
          </Link>
        </div>
      }
    >
      <Suspense fallback={null}>
        <ClasseQuerySync onSelectClass={setSelectedClass} />
      </Suspense>

      {/* Section 1: Asset Classes & 5-Tier Liquidity Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Asset Class (Hare-Niemeyer 10000 bps) */}
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                1. Distribuicao por Classe de Ativo
              </h2>
              <p className="text-xs text-[var(--ds-text-secondary)] tabular-financial">
                Invariante Hare-Niemeyer: Soma Exata = {totalBpsCheck} bps (
                {formatBpsPercent(totalBpsCheck)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClass("ALL")}
              className="text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-accent-quant)] hover:underline cursor-pointer"
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
                    className={`w-full text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--ds-surface-elevated)] border-[var(--ds-accent-quant)]"
                        : "bg-[var(--ds-bg-primary)] border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-quant)]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-[family-name:var(--ds-font-mono)] uppercase font-semibold text-[var(--ds-text-primary)]">
                        {cls.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-4 tabular-financial">
                        <span className="text-[var(--ds-text-secondary)]">
                          {formatCentsBRL(alloc.totalCents)}
                        </span>
                        <span className="text-[var(--ds-accent-quant)] font-bold w-16 text-right">
                          {formatBpsPercent(alloc.shareBps)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--ds-surface-elevated)] rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[var(--ds-accent-quant)]"
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
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
          <div className="border-b border-[var(--ds-border-subtle)] pb-3">
            <h2 className="text-sm font-semibold text-[var(--ds-text-primary)]">
              2. Liquidez dos Ativos (Escada em 5 Niveis)
            </h2>
            <p className="text-xs text-[var(--ds-text-secondary)]">
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
                  className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)]">
                      {LIQUIDITY_LABELS[tier]}
                    </span>
                    <div className="flex items-center gap-3 tabular-financial">
                      <span className="text-[var(--ds-market-positive)] font-semibold">
                        {formatCentsBRL(bucketCents)}
                      </span>
                      <span className="text-[var(--ds-text-secondary)] w-14 text-right">
                        {formatBpsPercent(shareBps)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--ds-surface-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--ds-market-positive)]"
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
      <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--ds-border-subtle)] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
              3. Produtos Individuais &amp; Rentabilidade Liquida ({filteredPositions.length}{" "}
              Ativos)
              {selectedClass !== "ALL" && (
                <span className="ml-2 text-xs text-[var(--ds-accent-quant)] uppercase">
                  [Filtro: {selectedClass.replace("_", " ")}]
                </span>
              )}
            </h2>
            <p className="text-xs text-[var(--ds-text-secondary)]">
              Rentabilidade individual descontada de IR regressivo/custodia, indexador contratual e status de cobertura FGC.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-mono)]">
                <th className="py-2.5 pr-4">Codigo / Produto</th>
                <th className="py-2.5 pr-4">Classe</th>
                <th className="py-2.5 pr-4">Indexador &amp; Taxa</th>
                <th className="py-2.5 pr-4">Liquidez</th>
                <th className="py-2.5 pr-4 text-right">Valor Investido</th>
                <th className="py-2.5 pr-4 text-right">Saldo Liquido</th>
                <th className="py-2.5 pr-4 text-right">Rentabilidade</th>
                <th className="py-2.5 text-center">FGC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)] tabular-financial">
              {filteredPositions.map((pos) => {
                const netGainCents = pos.currentNetCents - pos.investedCents;
                const netGainBps =
                  pos.investedCents > 0n
                    ? Number((netGainCents * 10000n) / pos.investedCents)
                    : 0;

                return (
                  <tr
                    key={pos.tickerOrCode}
                    className="hover:bg-[var(--ds-surface-elevated)] transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-bold text-[var(--ds-text-primary)]">
                        {pos.tickerOrCode}
                      </div>
                      <div className="font-[family-name:var(--ds-font-sans)] text-[11px] text-[var(--ds-text-secondary)]">
                        {pos.assetName}
                      </div>
                    </td>
                    <td className="py-3 pr-4 uppercase text-[var(--ds-accent-quant)]">
                      {pos.productClass.replace("_", " ")}
                    </td>
                    <td className="py-3 pr-4 text-[var(--ds-text-secondary)] tabular-financial">
                      {pos.indexer} ({formatBpsPercent(pos.annualRateBps)} a.a.)
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] text-[11px] tabular-financial">
                        {pos.liquidityTier}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--ds-text-secondary)] tabular-financial">
                      {formatCentsBRL(pos.investedCents)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-[var(--ds-text-primary)] tabular-financial">
                      {formatCentsBRL(pos.currentNetCents)}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--ds-market-positive)] font-semibold tabular-financial">
                      +{formatBpsPercent(netGainBps)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tabular-financial ${
                          pos.fgcCovered
                            ? "bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30"
                            : "bg-[var(--ds-surface-elevated)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)]"
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
