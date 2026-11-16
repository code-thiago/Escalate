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
      title="Aba 02 — Produtos Financeiros: Analise Critica System Design (8 Classes)"
      subtitle="Inspecao estrutural padronizada em 5 Blocos: Retorno Liquido Real (Fisher), Custos Ocultos & Assimetria, Matriz FGC/Risco de Credito, Custo de Oportunidade vs. Selic/CDI e Scorecard Deterministico GoRules ZEN"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PRODUCT_CATEGORIES_CATALOG.map((cat) => {
          const sample = runCatalogProductAnalysis(cat);

          return (
            <article
              key={cat.slug}
              className="bg-[#0f172a] border border-slate-800 hover:border-indigo-500/60 rounded-lg p-5 flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {cat.productClass}
                  </span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                      sample.guaranteeMatrix.fgcEligible
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    FGC: {sample.guaranteeMatrix.fgcEligible ? "COBERTO" : "NAO ELEGIVEL"}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-100">
                  {cat.title}
                </h3>
                <p className="text-xs text-indigo-300 font-mono">{cat.subtitle}</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cat.systemDesignFocus}
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800/80 rounded p-3 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">Retorno Real Fisher</div>
                  <div className="text-emerald-400 font-semibold mt-0.5">
                    {formatBpsPercent(sample.netRealReturn.realNetYieldBps, true)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Drag Oculto</div>
                  <div className="text-amber-400 font-semibold mt-0.5">
                    {formatBpsPercent(sample.hiddenCosts.totalHiddenCostBps)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Valor Final Liquido</div>
                  <div className="text-slate-100 font-semibold mt-0.5">
                    {formatCentsBRL(sample.netRealReturn.finalNetValueCents)}
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Risco: {sample.guaranteeMatrix.creditRiskType} ({sample.guaranteeMatrix.riskRating})
                </span>
                <Link
                  href={`/produtos/${cat.slug}`}
                  className="px-3.5 py-1.5 rounded text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
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
