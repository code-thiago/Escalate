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

  // WP-05.3: Auditor de Custo de Oportunidade vs. CDI (0-Token Engine)
  const isStructuredOrFixedIncome =
    meta.slug === "coe" ||
    meta.slug === "renda-fixa" ||
    meta.slug === "tesouro-direto" ||
    meta.slug === "previdencia" ||
    meta.slug === "fundos";
  const [coeTicker, setCoeTicker] = useState<string>(
    meta.slug === "coe"
      ? "COE-SP500-LOCK-2029"
      : `${meta.slug.toUpperCase()}-LOCK-2027`,
  );
  const [cdiBenchmarkBps, setCdiBenchmarkBps] = useState<number>(1115);
  const [liveAuditState, setLiveAuditState] = useState<{
    illiquidityPenaltyAnnual: number;
    netSpreadVsCdiAnnual: number;
    verdict: "SUBOPTIMAL_VS_CDI" | "COMPETITIVE";
    source: "INLINE_0_TOKEN" | "API_CUSTODY_AUDIT_COE";
    loading: boolean;
    error: string | null;
  } | null>(null);

  const inlineCoeAudit = useMemo(() => {
    const expectedReturnAnnual = annualRateBps / 10000;
    const cdiBenchmarkAnnual = cdiBenchmarkBps / 10000;
    const illiquidityPenaltyAnnual = Number(
      ((holdingDays / 365) * 0.0075).toFixed(6),
    );
    const netSpreadVsCdiAnnual = Number(
      (
        expectedReturnAnnual -
        cdiBenchmarkAnnual -
        illiquidityPenaltyAnnual
      ).toFixed(6),
    );
    const verdict: "SUBOPTIMAL_VS_CDI" | "COMPETITIVE" =
      netSpreadVsCdiAnnual < 0 ? "SUBOPTIMAL_VS_CDI" : "COMPETITIVE";
    return {
      illiquidityPenaltyAnnual,
      netSpreadVsCdiAnnual,
      verdict,
    };
  }, [annualRateBps, cdiBenchmarkBps, holdingDays]);

  const activeCoeAudit = liveAuditState ?? {
    ...inlineCoeAudit,
    source: "INLINE_0_TOKEN" as const,
    loading: false,
    error: null,
  };

  async function handleRunLiveCoeAudit() {
    setLiveAuditState((prev) => ({
      ...(prev ?? {
        ...inlineCoeAudit,
        source: "INLINE_0_TOKEN",
        error: null,
      }),
      loading: true,
      error: null,
    }));
    try {
      const response = await fetch("/api/escalate/custody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUDIT_COE",
          coeTicker: coeTicker.trim() || "COE-LOCK-AUDIT",
          expectedReturnAnnual: annualRateBps / 10000,
          cdiBenchmarkAnnual: cdiBenchmarkBps / 10000,
          liquidityDays: holdingDays,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        audit?: {
          illiquidityPenaltyAnnual: number;
          netSpreadVsCdiAnnual: number;
          verdict: "SUBOPTIMAL_VS_CDI" | "COMPETITIVE";
        };
      };
      if (!data.audit) {
        throw new Error("AUDIT_PAYLOAD_MISSING");
      }
      setLiveAuditState({
        illiquidityPenaltyAnnual: data.audit.illiquidityPenaltyAnnual,
        netSpreadVsCdiAnnual: data.audit.netSpreadVsCdiAnnual,
        verdict: data.audit.verdict,
        source: "API_CUSTODY_AUDIT_COE",
        loading: false,
        error: null,
      });
    } catch {
      setLiveAuditState({
        ...inlineCoeAudit,
        source: "INLINE_0_TOKEN",
        loading: false,
        error: "Fallback deterministico local ativo (0-Token Engine).",
      });
    }
  }

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

  const showEquityTickerWidget =
    meta.slug === "bolsa" || meta.slug === "bolsa-br" || meta.slug === "bolsa-global";

  return (
    <PlatformShell
      title={`Analise Critica System Design — ${meta.title}`}
      subtitle={meta.systemDesignFocus}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/investimentos/carteira?classe=${meta.productClass}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 transition-opacity"
          >
            Ver Posicoes na Carteira -&gt;
          </Link>
          <Link
            href="/produtos"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent-quant)] text-[var(--ds-text-primary)] border border-[var(--ds-border-subtle)] transition-colors"
          >
            Todas as Categorias
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Category Switcher Bar */}
        <nav
          aria-label="Navegacao entre as Classes de Produtos"
          className="flex flex-wrap gap-2 pb-2"
        >
          {PRODUCT_CATEGORIES_CATALOG.map((c) => {
            const active = c.slug === meta.slug;
            return (
              <Link
                key={c.slug}
                href={`/produtos/${c.slug}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] transition-colors border ${
                  active
                    ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] border-[var(--ds-accent-quant)] font-semibold"
                    : "bg-[var(--ds-surface-card)] border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:border-[var(--ds-accent-quant)] hover:text-[var(--ds-text-primary)]"
                }`}
              >
                {c.shortTitle}
              </Link>
            );
          })}
        </nav>

        {/* Renda Fixa Sub-Tabs */}
        {meta.slug === "renda-fixa" && (
          <div className="flex items-center gap-2 p-1 bg-[var(--ds-surface-card)] rounded-lg border border-[var(--ds-border-subtle)] w-fit">
            <button
              type="button"
              onClick={() => setActiveRendaFixaTab("analise")}
              className={`px-3 py-1.5 rounded text-xs font-[family-name:var(--ds-font-mono)] font-semibold transition-colors cursor-pointer ${
                activeRendaFixaTab === "analise"
                  ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                  : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              Analise Critica System Design
            </button>
            <button
              type="button"
              onClick={() => setActiveRendaFixaTab("comparador")}
              className={`px-3 py-1.5 rounded text-xs font-[family-name:var(--ds-font-mono)] font-semibold transition-colors cursor-pointer ${
                activeRendaFixaTab === "comparador"
                  ? "bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)]"
                  : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              Comparador Interativo (CDB x Selic x Poupanca)
            </button>
          </div>
        )}

        {/* Bolsa de Valores Live B3 Ticker Widget */}
        {showEquityTickerWidget && <AcoesB3Widget />}

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
            <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                Parametros de Estresse &amp; Simulacao Critica ({meta.defaultProductName})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label
                    htmlFor="input-invested"
                    className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
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
                    className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-rate"
                    className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
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
                    className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-days"
                    className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
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
                    className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-fee"
                    className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
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
                    className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isExemptTax}
                      onChange={(e) => setIsExemptTax(e.target.checked)}
                      className="accent-[var(--ds-accent-quant)]"
                    />
                    Isento de IR (LCI/LCA/CRI)
                  </label>
                </div>
              </div>
            </section>

            {/* THE 5 MANDATORY SYSTEM DESIGN CRITICAL ANALYSIS BLOCKS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BLOCK 1: Net Real Return Engine */}
              <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
                <div className="border-b border-[var(--ds-border-subtle)] pb-3">
                  <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
                    Bloco 01 — Motor Tributario &amp; Inflacionario
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                    Retorno Liquido Real (Equacao Exata de Fisher)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs tabular-financial">
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Rendimento Bruto
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.netRealReturn.grossYieldCents)} (
                      {formatBpsPercent(analysis.netRealReturn.grossYieldBps)})
                    </div>
                  </div>

                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Imposto de Renda Retido
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-market-negative)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.netRealReturn.irCents)} (
                      {formatBpsPercent(analysis.netRealReturn.effectiveTaxRateBps)})
                    </div>
                  </div>

                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Erosao Inflacionaria (IPCA)
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-market-warning)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.netRealReturn.inflationDiscountCents)}
                    </div>
                  </div>

                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Ganho Real Liquido Final
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-market-positive)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.netRealReturn.realNetYieldCents)} (
                      {formatBpsPercent(analysis.netRealReturn.realNetYieldBps, true)})
                    </div>
                  </div>
                </div>
              </section>

              {/* BLOCK 2: Hidden Costs & Asymmetry Scanner */}
              <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
                <div className="border-b border-[var(--ds-border-subtle)] pb-3">
                  <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-market-warning)]">
                    Bloco 02 — Auditoria de Friccao &amp; Assimetria
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] tabular-financial">
                    Scanner de Custos Ocultos (Drag Total:{" "}
                    {formatBpsPercent(analysis.hiddenCosts.totalHiddenCostBps)})
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {analysis.hiddenCosts.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[var(--ds-text-primary)]">
                          {item.name}
                        </div>
                        <p className="text-[11px] text-[var(--ds-text-secondary)] mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right text-xs tabular-financial shrink-0">
                        <div className="text-[var(--ds-market-warning)] font-semibold tabular-financial">
                          {formatBpsPercent(item.costBps)}
                        </div>
                        <div className="text-[11px] text-[var(--ds-text-secondary)] tabular-financial">
                          {formatCentsBRL(item.costCents)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* BLOCK 3: Guarantee & Credit Risk Matrix */}
              <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl p-5 space-y-4">
                <div className="border-b border-[var(--ds-border-subtle)] pb-3">
                  <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
                    Bloco 03 — Risco de Contraparte &amp; Garantias
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                    Matriz FGC &amp; Risco de Credito ({analysis.guaranteeMatrix.creditRiskType})
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs tabular-financial">
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Cobertura FGC Ativa
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-text-primary)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.guaranteeMatrix.fgcCoveredCents)}
                    </div>
                  </div>
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Saldo Descoberto (Risco Direto)
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-market-warning)] mt-0.5 tabular-financial">
                      {formatCentsBRL(analysis.guaranteeMatrix.fgcUncoveredCents)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--ds-text-secondary)] bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3 leading-relaxed">
                  {analysis.guaranteeMatrix.explanation}
                </p>
              </section>

              {/* BLOCK 4 & 5: Opportunity Cost Benchmarking & GoRules ZEN Deterministic Scorecard */}
              <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-accent-quant)]/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
                  <div>
                    <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
                      Blocos 04 &amp; 05 — Custo de Oportunidade &amp; GoRules ZEN Engine
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                      Scorecard Deterministico ({analysis.benchmarking.benchmarkComparisonName})
                    </h3>
                  </div>
                  <div className="text-right tabular-financial">
                    <span className="text-2xl font-bold text-[var(--ds-accent-quant)] tabular-financial">
                      {deterministicScore.score}/100
                    </span>
                    <div className="text-[10px] text-[var(--ds-text-secondary)] tabular-financial">
                      RISCO: {deterministicScore.grade}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs tabular-financial">
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Spread vs CDI
                    </div>
                    <div className="font-semibold text-[var(--ds-text-primary)] mt-0.5 tabular-financial">
                      {formatBpsPercent(analysis.benchmarking.cdiSpreadBps, true)}
                    </div>
                  </div>
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Spread vs Selic
                    </div>
                    <div className="font-semibold text-[var(--ds-text-primary)] mt-0.5 tabular-financial">
                      {formatBpsPercent(analysis.benchmarking.selicSpreadBps, true)}
                    </div>
                  </div>
                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--ds-text-secondary)] font-[family-name:var(--ds-font-sans)]">
                      Alpha vs Livre de Risco
                    </div>
                    <div className="font-semibold text-[var(--ds-market-positive)] mt-0.5 tabular-financial">
                      {formatCentsBRL(
                        analysis.benchmarking.opportunityCostVsRiskFreeCents,
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-accent-quant)]/40 rounded-lg p-3 font-[family-name:var(--ds-font-mono)] text-xs text-[var(--ds-text-primary)]">
                  [DECISAO JDM]: {deterministicScore.verdict}
                </div>
              </section>
            </div>

            {/* WP-05.3: Auditor de Custo de Oportunidade vs. CDI (0-Token Engine) */}
            {isStructuredOrFixedIncome && (
              <section
                aria-label="Auditor de Custo de Oportunidade vs. CDI"
                className={`bg-[var(--ds-surface-card)] rounded-xl p-5 space-y-4 border ${
                  meta.slug === "coe"
                    ? "border-[var(--ds-market-warning)]/60"
                    : "border-[var(--ds-border-subtle)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-3">
                  <div>
                    <span className="font-[family-name:var(--ds-font-mono)] text-[10px] uppercase text-[var(--ds-accent-quant)]">
                      WP-05.3 — Auditoria Estruturada (0-Token Engine)
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">
                      Auditor de Custo de Oportunidade vs. CDI
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-[family-name:var(--ds-font-mono)] font-semibold tabular-financial border ${
                        activeCoeAudit.verdict === "SUBOPTIMAL_VS_CDI"
                          ? "bg-[var(--ds-market-negative)]/15 text-[var(--ds-market-negative)] border-[var(--ds-market-negative)]/40"
                          : "bg-[var(--ds-market-positive)]/15 text-[var(--ds-market-positive)] border-[var(--ds-market-positive)]/40"
                      }`}
                    >
                      [{activeCoeAudit.verdict}]
                    </span>
                    <button
                      type="button"
                      onClick={handleRunLiveCoeAudit}
                      disabled={activeCoeAudit.loading}
                      className="px-3 py-1.5 rounded-lg text-xs font-[family-name:var(--ds-font-mono)] font-semibold bg-[var(--ds-accent-quant)] text-[var(--ds-bg-primary)] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
                    >
                      {activeCoeAudit.loading
                        ? "Auditando..."
                        : "Auditar via /api/escalate/custody"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="input-coe-ticker"
                      className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
                    >
                      Ticker / Estrutura
                    </label>
                    <input
                      id="input-coe-ticker"
                      type="text"
                      value={coeTicker}
                      onChange={(e) => setCoeTicker(e.target.value)}
                      className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="input-cdi-benchmark"
                      className="block text-xs font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)] mb-1"
                    >
                      Benchmark CDI (bps a.a.)
                    </label>
                    <input
                      id="input-cdi-benchmark"
                      type="number"
                      min={0}
                      max={5000}
                      step={25}
                      value={cdiBenchmarkBps}
                      onChange={(e) => {
                        setCdiBenchmarkBps(Number(e.target.value) || 0);
                        setLiveAuditState(null);
                      }}
                      className="w-full bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg px-3 py-2 text-xs tabular-financial text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-quant)]"
                    />
                  </div>

                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[11px] text-[var(--ds-text-secondary)]">
                      Penalidade de Iliquidez (75 bps/yr)
                    </div>
                    <div className="text-sm font-bold text-[var(--ds-market-warning)] mt-0.5 tabular-financial">
                      {(activeCoeAudit.illiquidityPenaltyAnnual * 100).toFixed(2)}% a.a. (
                      {Math.round(activeCoeAudit.illiquidityPenaltyAnnual * 10000)} bps)
                    </div>
                  </div>

                  <div className="bg-[var(--ds-bg-primary)] border border-[var(--ds-border-subtle)] rounded-lg p-3">
                    <div className="text-[11px] text-[var(--ds-text-secondary)]">
                      Spread Liquido vs. CDI (netSpreadVsCdiAnnual)
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 tabular-financial ${
                        activeCoeAudit.netSpreadVsCdiAnnual < 0
                          ? "text-[var(--ds-market-negative)]"
                          : "text-[var(--ds-market-positive)]"
                      }`}
                    >
                      {activeCoeAudit.netSpreadVsCdiAnnual >= 0 ? "+" : ""}
                      {(activeCoeAudit.netSpreadVsCdiAnnual * 100).toFixed(2)}% a.a. (
                      {Math.round(activeCoeAudit.netSpreadVsCdiAnnual * 10000)} bps)
                    </div>
                  </div>
                </div>

                {activeCoeAudit.error && (
                  <p className="text-[11px] font-[family-name:var(--ds-font-mono)] text-[var(--ds-text-secondary)]">
                    {activeCoeAudit.error}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </PlatformShell>
  );
}
