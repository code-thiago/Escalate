"use client";

import React from "react";
import Link from "next/link";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import {
  PRODUCT_CATEGORIES_CATALOG,
  runCatalogProductAnalysis,
} from "@/src/core/finance/products/catalog";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";

export default function ProdutosHubPage() {
  return (
    <PlatformShell
      title="Aba 02 — Produtos Financeiros: Analise Critica System Design (11 Classes)"
      subtitle="Inspecao estrutural padronizada em 5 Blocos: Retorno Liquido Real (Fisher), Custos Ocultos & Assimetria, Matriz FGC/Risco de Credito, Custo de Oportunidade vs. Selic/CDI e Scorecard Deterministico GoRules ZEN"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PRODUCT_CATEGORIES_CATALOG.map((cat) => {
          const sample = runCatalogProductAnalysis(cat);

          return (
            <article
              key={cat.slug}
              className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-quant)] rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-[family-name:var(--ds-font-mono)] text-[11px] uppercase px-2 py-0.5 rounded bg-[var(--ds-accent-quant)]/15 text-[var(--ds-accent-quant)] border border-[var(--ds-accent-quant)]/30">
                    {cat.shortTitle} ({cat.productClass})
                  </span>
                  <span
                    className={`font-[family-name:var(--ds-font-mono)] text-[11px] px-2 py-0.5 rounded tabular-financial ${
                      sample.guaranteeMatrix.fgcEligible
                        ? "bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border border-[var(--ds-market-positive)]/30"
                        : "bg-[var(--ds-surface-elevated)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-subtle)]"
                    }`}
                  >
                    FGC: {sample.guaranteeMatrix.fgcEligible ? "COBERTO" : "NAO ELEGIVEL"}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-[var(--ds-text-primary)]">
                  {cat.title}
                </h2>
                <p className="text-xs text-[var(--ds-accent-quant)] font-[family-name:var(--ds-font-mono)]">
                  {cat.subtitle}
                </p>
                <p className="text-xs text-[var(--ds-text-secondary)] leading-relaxed">
                  {cat.systemDesignFocus}
                </p>
              </div>

              <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 grid grid-cols-3 gap-2 text-xs tabular-financial">
                <div>
                  <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                    Retorno Real Fisher
                  </div>
                  <div className="text-[var(--ds-market-positive)] font-semibold mt-0.5 tabular-financial">
                    {formatBpsPercent(sample.netRealReturn.realNetYieldBps, true)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                    Drag Oculto
                  </div>
                  <div className="text-[var(--ds-market-warning)] font-semibold mt-0.5 tabular-financial">
                    {formatBpsPercent(sample.hiddenCosts.totalHiddenCostBps)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                    Valor Final Liquido
                  </div>
                  <div className="text-[var(--ds-text-primary)] font-semibold mt-0.5 tabular-financial">
                    {formatCentsBRL(sample.netRealReturn.finalNetValueCents)}
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between gap-3">
                <span className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] tabular-financial">
                  Risco: {sample.guaranteeMatrix.creditRiskType} ({sample.guaranteeMatrix.riskRating})
                </span>
                <Link
                  href={`/produtos/${cat.slug}`}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity shrink-0"
                >
                  Abrir Analise Critica (5 Blocos) -&gt;
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </PlatformShell>
  );
}
