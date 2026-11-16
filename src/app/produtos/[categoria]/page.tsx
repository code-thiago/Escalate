"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/src/components/shell/PlatformShell";
import {
  getProductCategoryBySlug,
  PRODUCT_CATEGORIES_CATALOG,
  runCatalogProductAnalysis,
} from "@/src/core/finance/products/catalog";
import { formatBpsPercent, formatCentsBRL } from "@/src/lib/formatters";
import ComparadorInvestimentos from "@/src/components/ComparadorInvestimentos";
import AcoesB3Widget from "@/src/components/market/AcoesB3Widget";
import CambioWidget from "@/src/components/market/CambioWidget";

export default function ProdutoCategoriaCriticalAnalysisPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = use(params);
  const meta = getProductCategoryBySlug(categoria);

  if (!meta) {
    notFound();
  }

  const [activeRendaFixaTab, setActiveRendaFixaTab] = useState<"analise" | "comparador">("analise");
  const [investedReais, setInvestedReais] = useState<number>(
    Number(meta.defaultInvestedCents) / 100,
  );
  const [annualRateBps, setAnnualRateBps] = useState<number>(
    meta.defaultAnnualRateBps,
  );
  const [holdingDays, setHoldingDays] = useState<number>(
    meta.defaultHoldingDays,
  );
  const [feeBps, setFeeBps] = useState<number>(meta.defaultFeeBps);
  const [isExemptTax, setIsExemptTax] = useState<boolean>(false);

  const analysis = useMemo(
    () =>
      runCatalogProductAnalysis(meta, {
        investedCents: BigInt(Math.max(100, Math.round(investedReais * 100))),
        annualRateBps,
        holdingDays,
        feeBps,
        isExemptTax,
      }),
    [meta, investedReais, annualRateBps, holdingDays, feeBps, isExemptTax],
  );

  // Compute deterministic ZEN Score locally mirroring product-critical-analysis.jdm.json
  const deterministicScore = useMemo(() => {
    if (meta.productClass === "coe") {
      return {
        score: 30,
        grade: "CRITICAL",
        verdict: "AVOID_EXCESSIVE_SPREAD_AND_ASYMMETRY",
      };
    }
    if (holdingDays < 30 && !isExemptTax) {
      return {
        score: 35,
        grade: "HIGH",
        verdict: "EXTEND_HOLDING_BEYOND_30_DAYS_TO_AVOID_IOF",
      };
    }
    if (meta.productClass === "fundos" && feeBps > 200) {
      return {
        score: 40,
        grade: "HIGH",
        verdict: "REPLACE_WITH_LOW_COST_ETF_OR_DIRECT_ASSET",
      };
    }
    if (meta.productClass === "tesouro_direto" && holdingDays >= 720) {
      return {
        score: 95,
        grade: "LOW",
        verdict: "SOVEREIGN_SAFETY_AND_MINIMAL_IR_BRACKET",
      };
    }
    if (meta.productClass === "etfs" && feeBps <= 50) {
      return {
        score: 92,
        grade: "LOW",
        verdict: "EXCELLENT_LOW_COST_CORE_VEHICLE",
      };
    }
    if (
      meta.productClass === "renda_fixa" &&
      analysis.guaranteeMatrix.fgcEligible &&
      isExemptTax
    ) {
      return {
        score: 95,
        grade: "LOW",
        verdict: "MAXIMUM_TAX_EFFICIENCY_AND_FGC_SAFETY",
      };
    }
    return {
      score: 78,
      grade: "MODERATE",
      verdict: "EVALUATE_NET_SPREAD_AND_HOLDING_HORIZON",
    };
  }, [meta.productClass, holdingDays, isExemptTax, feeBps, analysis.guaranteeMatrix.fgcEligible]);

  return (
    <PlatformShell
      title={`Analise Critica System Design — ${meta.title}`}
      subtitle={meta.systemDesignFocus}
      actions={
        <Link
          href="/produtos"
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          Todas as 8 Categorias
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Category Switcher Bar */}
        <nav
          aria-label="Navegacao entre as 8 Classes de Produtos"
          className="flex flex-wrap gap-2 pb-2"
        >
          {PRODUCT_CATEGORIES_CATALOG.map((c) => {
            const active = c.slug === meta.slug;
            return (
              <Link
                key={c.slug}
                href={`/produtos/${c.slug}`}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  active
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-[#0f172a] border border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {c.shortTitle}
              </Link>
            );
          })}
        </nav>

        {/* Renda Fixa Sub-Tabs */}
        {meta.slug === "renda-fixa" && (
          <div className="flex items-center gap-2 p-1 bg-[#0f172a] rounded-lg border border-slate-800 w-fit">
            <button
              onClick={() => setActiveRendaFixaTab("analise")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeRendaFixaTab === "analise"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Analise Critica System Design
            </button>
            <button
              onClick={() => setActiveRendaFixaTab("comparador")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                activeRendaFixaTab === "comparador"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Comparador Interativo (CDB x Selic x Poupanca)
            </button>
          </div>
        )}

        {/* Bolsa de Valores Live B3 Ticker Widget */}
        {meta.slug === "bolsa" && <AcoesB3Widget />}

        {/* Cambio e Remessas Live FX Widget */}
        {meta.slug === "cambio" && <CambioWidget />}

        {/* Conditional Content for Renda Fixa Comparador */}
        {meta.slug === "renda-fixa" && activeRendaFixaTab === "comparador" ? (
          <div className="pt-2">
            <ComparadorInvestimentos />
          </div>
        ) : (
          <>
            {/* Interactive Simulation Input Controls */}
            <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-100">
                Parametros de Estresse & Simulacao Critica ({meta.defaultProductName})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label
                    htmlFor="input-invested"
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Capital Alocado (R$)
                  </label>
                  <input
                    id="input-invested"
                    type="number"
                    min={100}
                    step={1000}
                    value={investedReais}
                    onChange={(e) => setInvestedReais(Number(e.target.value) || 1000)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-rate"
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Taxa Bruta Nominal (bps a.a.)
                  </label>
                  <input
                    id="input-rate"
                    type="number"
                    min={0}
                    max={10000}
                    step={25}
                    value={annualRateBps}
                    onChange={(e) => setAnnualRateBps(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-days"
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Prazo de Retencao (Dias)
                  </label>
                  <input
                    id="input-days"
                    type="number"
                    min={1}
                    max={7200}
                    step={30}
                    value={holdingDays}
                    onChange={(e) => setHoldingDays(Number(e.target.value) || 30)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-fee"
                    className="block text-xs font-mono text-slate-400 mb-1"
                  >
                    Taxa / Spread / Custodia (bps)
                  </label>
                  <input
                    id="input-fee"
                    type="number"
                    min={0}
                    max={2000}
                    step={10}
                    value={feeBps}
                    onChange={(e) => setFeeBps(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isExemptTax}
                      onChange={(e) => setIsExemptTax(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Isento de IR (LCI/LCA/CRI)
                  </label>
                </div>
              </div>
            </section>

            {/* THE 5 MANDATORY SYSTEM DESIGN CRITICAL ANALYSIS BLOCKS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BLOCK 1: Net Real Return Engine */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="font-mono text-[10px] uppercase text-indigo-400">
                    Bloco 01 — Motor Tributario & Inflacionario
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Retorno Liquido Real (Equacao Exata de Fisher)
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Rendimento Bruto</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {formatCentsBRL(analysis.netRealReturn.grossYieldCents)} (
                      {formatBpsPercent(analysis.netRealReturn.grossYieldBps)})
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Imposto de Renda Retido</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">
                      {formatCentsBRL(analysis.netRealReturn.irCents)} (
                      {formatBpsPercent(analysis.netRealReturn.effectiveTaxRateBps)})
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Erosao Inflacionaria (IPCA)</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">
                      {formatCentsBRL(analysis.netRealReturn.inflationDiscountCents)}

                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Ganho Real Liquido Final</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {formatCentsBRL(analysis.netRealReturn.realNetYieldCents)} (
                      {formatBpsPercent(analysis.netRealReturn.realNetYieldBps, true)})
                    </div>
                  </div>
                </div>
              </section>

              {/* BLOCK 2: Hidden Costs & Asymmetry Scanner */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="font-mono text-[10px] uppercase text-amber-400">
                    Bloco 02 — Auditoria de Friccao & Assimetria
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Scanner de Custos Ocultos (Drag Total:{" "}
                    {formatBpsPercent(analysis.hiddenCosts.totalHiddenCostBps)})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {analysis.hiddenCosts.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 border border-slate-800 rounded p-3 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {item.name}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs tabular-nums shrink-0">
                        <div className="text-amber-400 font-semibold">
                          {formatBpsPercent(item.costBps)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatCentsBRL(item.costCents)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* BLOCK 3: Guarantee & Credit Risk Matrix */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="font-mono text-[10px] uppercase text-cyan-400">
                    Bloco 03 — Risco de Contraparte & Garantias
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Matriz FGC & Risco de Credito ({analysis.guaranteeMatrix.creditRiskType})
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Cobertura FGC Ativa</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {formatCentsBRL(analysis.guaranteeMatrix.fgcCoveredCents)}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-slate-400">Saldo Descoberto (Risco Direto)</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">
                      {formatCentsBRL(analysis.guaranteeMatrix.fgcUncoveredCents)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded p-3 leading-relaxed">
                  {analysis.guaranteeMatrix.explanation}
                </p>
              </section>

              {/* BLOCK 4 & 5: Opportunity Cost Benchmarking & GoRules ZEN Deterministic Scorecard */}
              <section className="bg-[#0f172a] border border-indigo-500/40 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-indigo-400">
                      Blocos 04 & 05 — Custo de Oportunidade & GoRules ZEN Engine
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100">
                      Scorecard Deterministico ({analysis.benchmarking.benchmarkComparisonName})
                    </h4>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-2xl font-bold text-indigo-400">
                      {deterministicScore.score}/100
                    </span>
                    <div className="text-[10px] text-slate-400">
                      RISCO: {deterministicScore.grade}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                    <div className="text-[10px] text-slate-400">Spread vs CDI</div>
                    <div className="font-semibold text-slate-100 mt-0.5">
                      {formatBpsPercent(analysis.benchmarking.cdiSpreadBps, true)}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                    <div className="text-[10px] text-slate-400">Spread vs Selic</div>
                    <div className="font-semibold text-slate-100 mt-0.5">
                      {formatBpsPercent(analysis.benchmarking.selicSpreadBps, true)}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                    <div className="text-[10px] text-slate-400">Alpha vs Livre de Risco</div>
                    <div className="font-semibold text-emerald-400 mt-0.5">
                      {formatCentsBRL(
                        analysis.benchmarking.opportunityCostVsRiskFreeCents,
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-950/30 border border-indigo-500/40 rounded p-3 font-mono text-xs text-indigo-200">
                  [DECISAO JDM]: {deterministicScore.verdict}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </PlatformShell>
  );
}
