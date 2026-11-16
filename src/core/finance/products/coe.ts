import type { LiquidityTier } from "../../../connectors/types";
import {
  calculateFixedIncomeTax,
  calculateFisherRealReturnBps,
  roundDiv,
} from "../taxation";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type CoeStructureType = "CAPITAL_PROTEGIDO" | "CAPITAL_EM_RISCO";

export interface CoeAnalysisInput {
  productName: string;
  structureType?: CoeStructureType;
  investedCents: bigint;
  expectedNominalReturnBps: number; // Expected annual return in scenario
  participationCapBps?: number;     // Maximum upside cap (e.g. 1400 = 14% a.a.)
  embeddedSpreadBps?: number;       // Structuring bank spread (default 400 bps = 4.0% a.a.)
  holdingDays: number;
  earlyExitPenaltyBps?: number;     // Mark-to-market haircut on early exit (default 1500 bps)
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

/**
 * Analyzes a COE (Certificado de Operacoes Estruturadas) across 5 critical blocks:
 * Decomposes the zero-coupon bond floor vs. embedded option leg, exposes bank structuring spread,
 * highlights absence of FGC guarantee, and computes real net return after regressive IR and inflation.
 */
export function analyzeCoe(input: CoeAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    structureType = "CAPITAL_PROTEGIDO",
    investedCents,
    expectedNominalReturnBps,
    participationCapBps,
    embeddedSpreadBps = 400, // 4.00% structuring spread
    holdingDays,
    earlyExitPenaltyBps = 1500,
    liquidityTier = "AT_MATURITY",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  // Effective annual rate capped by participation ceiling if present
  const effectiveAnnualRateBps =
    participationCapBps !== undefined && expectedNominalReturnBps > participationCapBps
      ? participationCapBps
      : expectedNominalReturnBps;

  // 1. Structural Decomposition: Zero-Coupon Bond Floor vs. Derivative Budget
  const discountFactor = Math.pow(1 + cdiBps / 10000, years);
  const zeroCouponBondCents =
    discountFactor > 0
      ? roundDiv(investedCents * 1000000n, BigInt(Math.round(discountFactor * 1000000)))
      : investedCents;
  const derivativeBudgetCents =
    investedCents > zeroCouponBondCents ? investedCents - zeroCouponBondCents : 0n;

  // Embedded bank spread cost in cents over the period
  const spreadFactor = Math.pow(1 + embeddedSpreadBps / 10000, years) - 1;
  const embeddedSpreadCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(spreadFactor * 1000000))),
    1000000n,
  );

  // Gross Yield in scenario
  const grossPeriodFactor = Math.pow(1 + effectiveAnnualRateBps / 10000, years) - 1;
  const grossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(grossPeriodFactor * 1000000))),
    1000000n,
  );
  const grossYieldBps =
    investedCents > 0n ? Number(roundDiv(grossYieldCents * 10000n, investedCents)) : 0;

  // Regressive IR applies to COE gains
  const taxResult = calculateFixedIncomeTax(grossYieldCents, holdingDays, false);
  const netYieldCents = taxResult.netYieldCents;
  const netYieldBps =
    investedCents > 0n ? Number(roundDiv(netYieldCents * 10000n, investedCents)) : 0;
  const finalNetValueCents = investedCents + netYieldCents;

  // Fisher exact real return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(
    investedCents * BigInt(Math.max(0, inflationPeriodBps)),
    10000n,
  );
  const realNetYieldCents = netYieldCents - inflationDiscountCents;

  // 2. Hidden Costs Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Spread Oculto de Estruturacao",
      description: `Comissao bancaria embutida na montagem do título zero-cupom + opcao (${(embeddedSpreadBps / 100).toFixed(2)}% a.a.). Orcamento derivativo: R$ ${(Number(derivativeBudgetCents) / 100).toFixed(2)}.`,
      costBps: embeddedSpreadBps,
      costCents: embeddedSpreadCents,
    },
    {
      name: "Desagio de Saida Antecipada (Mercado Secundario)",
      description: `Travado ate o vencimento; resgate antecipado sofre marcacao a mercado e spread de mesa (~${(earlyExitPenaltyBps / 100).toFixed(1)}%).`,
      costBps: earlyExitPenaltyBps,
      costCents: roundDiv(investedCents * BigInt(earlyExitPenaltyBps), 10000n),
    },
  ];

  if (structureType === "CAPITAL_PROTEGIDO") {
    hiddenCostItems.push({
      name: "Ilusao do Capital Nominal Protegido",
      description:
        "Se a ponta variavel zerar, devolve apenas o valor nominal inicial, gerando perda real equivalente a 100% da inflacao acumulada.",
      costBps: inflationPeriodBps,
      costCents: inflationDiscountCents,
    });
  }

  if (taxResult.irCents > 0n) {
    hiddenCostItems.push({
      name: "IR Regressivo sobre o Ganho Estruturado",
      description: `Tributacao de ${(taxResult.effectiveIrBps / 100).toFixed(1)}% na liquidacao do COE.`,
      costBps: taxResult.effectiveIrBps,
      costCents: taxResult.irCents,
    });
  }

  const totalHiddenCostCents = embeddedSpreadCents + taxResult.totalTaxCents;
  const totalHiddenCostBps =
    investedCents > 0n
      ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents))
      : embeddedSpreadBps;

  // 3. Benchmarking & Opportunity Cost vs Risk-Free Tesouro Selic
  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n,
  );
  const selicTax = calculateFixedIncomeTax(selicGrossYieldCents, holdingDays, false);
  const selicNetYieldCents = selicTax.netYieldCents;
  const opportunityCostVsRiskFreeCents =
    selicNetYieldCents > netYieldCents ? selicNetYieldCents - netYieldCents : 0n;

  return {
    productClass: "coe",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: taxResult.iofCents,
      irCents: taxResult.irCents,
      effectiveTaxRateBps: taxResult.effectiveIrBps + taxResult.effectiveIofBps,
      totalFeesCents: embeddedSpreadCents,
      netYieldCents,
      netYieldBps,
      finalNetValueCents,
      inflationDiscountCents,
      realNetYieldCents,
      realNetYieldBps,
    },
    hiddenCosts: {
      totalHiddenCostBps,
      totalHiddenCostCents,
      items: hiddenCostItems,
    },
    guaranteeMatrix: {
      fgcEligible: false,
      fgcCoveredCents: 0n,
      fgcUncoveredCents: finalNetValueCents,
      creditRiskType: "UNSECURED",
      riskRating: structureType === "CAPITAL_EM_RISCO" ? "SPECULATIVE" : "HIGH",
      explanation:
        "COE NAO possui cobertura do FGC em nenhuma modalidade (nem na parcela de renda fixa nem no derivativo). Risco de credito corporativo puro do banco emissor.",
    },
    benchmarking: {
      cdiSpreadBps: effectiveAnnualRateBps - cdiBps,
      selicSpreadBps: effectiveAnnualRateBps - selicBps,
      ipcaSpreadBps: effectiveAnnualRateBps - ipcaBps,
      benchmarkComparisonName: "CDI + Opcao Sintetica",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "coe",
      annualRateBps: effectiveAnnualRateBps,
      feeBps: embeddedSpreadBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "UNSECURED",
      holdingPeriodDays: holdingDays,
    },
  };
}
