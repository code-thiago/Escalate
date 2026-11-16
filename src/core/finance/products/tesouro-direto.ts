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

export type TesouroSubType =
  | "TESOURO_SELIC"
  | "TESOURO_IPCA"
  | "TESOURO_PREFIXADO"
  | "TESOURO_RENDA_MAIS"
  | "TESOURO_EDUCA_MAIS";

export const TESOURO_SELIC_EXEMPTION_CAP_CENTS = 1000000n; // R$ 10,000.00 exemption cap on B3 custody fee
export const B3_TESOURO_CUSTODY_FEE_BPS = 20; // 0.20% p.a.

export interface TesouroDiretoAnalysisInput {
  productName: string;
  subType: TesouroSubType;
  investedCents: bigint;
  annualRateBps: number; // Total nominal annual rate in bps (e.g. IPCA + real spread or Selic)
  holdingDays: number;
  durationYears?: number; // Modified duration for mark-to-market analysis
  yieldCurveShockBps?: number; // Parallel shift in interest rate curve (e.g. +100 bps)
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

/**
 * Analyzes Tesouro Direto sovereign bonds across the 5 critical System Design blocks:
 * Enforces B3 0.20% custody fee (with R$ 10,000 exemption for Tesouro Selic),
 * computes Mark-to-Market duration sensitivity, deducts custody from IR base,
 * and evaluates Fisher exact real return.
 */
export function analyzeTesouroDireto(
  input: TesouroDiretoAnalysisInput,
): StandardProductAnalysisResult {
  const {
    productName,
    subType,
    investedCents,
    annualRateBps,
    holdingDays,
    durationYears = subType === "TESOURO_SELIC" ? 0.05 : Math.max(1, holdingDays / 365),
    yieldCurveShockBps = 0,
    liquidityTier = "D_1_TO_5",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  // 1. Gross Yield & Mark-to-Market Adjustment
  const basePeriodFactor = Math.pow(1 + annualRateBps / 10000, years) - 1;
  const baseGrossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(basePeriodFactor * 1000000))),
    1000000n,
  );

  // Mark-to-Market shock: deltaPU / PU ≈ -ModifiedDuration * deltaYield
  const modifiedDuration = durationYears / (1 + annualRateBps / 10000);
  const mtmImpactBps =
    subType === "TESOURO_SELIC"
      ? 0
      : Math.round(-modifiedDuration * yieldCurveShockBps);
  const mtmImpactCents = roundDiv(investedCents * BigInt(mtmImpactBps), 10000n);

  const grossYieldCents =
    baseGrossYieldCents + mtmImpactCents > 0n
      ? baseGrossYieldCents + mtmImpactCents
      : 0n;
  const grossYieldBps =
    investedCents > 0n ? Number(roundDiv(grossYieldCents * 10000n, investedCents)) : 0;

  // 2. B3 Custody Fee (0.20% p.a., with R$ 10,000 exemption on TESOURO_SELIC)
  const feeBaseCents =
    subType === "TESOURO_SELIC"
      ? investedCents > TESOURO_SELIC_EXEMPTION_CAP_CENTS
        ? investedCents - TESOURO_SELIC_EXEMPTION_CAP_CENTS
        : 0n
      : investedCents;

  const custodyFeeFactor = (B3_TESOURO_CUSTODY_FEE_BPS / 10000) * years;
  const totalFeesCents = roundDiv(
    feeBaseCents * BigInt(Math.max(0, Math.round(custodyFeeFactor * 1000000))),
    1000000n,
  );

  // Custody fee deducts from IR taxable base
  const yieldAfterCustodyCents =
    grossYieldCents > totalFeesCents ? grossYieldCents - totalFeesCents : 0n;
  const taxResult = calculateFixedIncomeTax(yieldAfterCustodyCents, holdingDays, false);

  const netYieldCents = taxResult.netYieldCents;
  const netYieldBps =
    investedCents > 0n ? Number(roundDiv(netYieldCents * 10000n, investedCents)) : 0;
  const finalNetValueCents = investedCents + netYieldCents;

  // Fisher Real Return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(
    investedCents * BigInt(Math.max(0, inflationPeriodBps)),
    10000n,
  );
  const realNetYieldCents = netYieldCents - inflationDiscountCents;

  // Hidden Costs & Friction Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Taxa de Custodia B3 (0,20% a.a.)",
      description:
        subType === "TESOURO_SELIC" && investedCents <= TESOURO_SELIC_EXEMPTION_CAP_CENTS
          ? "Isento para aplicacoes ate R$ 10.000,00 no Tesouro Selic."
          : "Taxa semestral da B3 de 0,20% a.a. sobre o saldo custodiado.",
      costBps: totalFeesCents > 0n ? B3_TESOURO_CUSTODY_FEE_BPS : 0,
      costCents: totalFeesCents,
    },
  ];

  if (subType !== "TESOURO_SELIC") {
    hiddenCostItems.push({
      name: "Exposicao a Marcacao a Mercado (Duration)",
      description: `Duration modificada de ${modifiedDuration.toFixed(2)} anos; alta de +1% nos juros longos impacta o preco em ~${(-modifiedDuration).toFixed(2)}% antes do vencimento.`,
      costBps: mtmImpactBps < 0 ? Math.abs(mtmImpactBps) : 0,
      costCents: mtmImpactCents < 0n ? -mtmImpactCents : 0n,
    });
  }

  if (taxResult.totalTaxCents > 0n) {
    hiddenCostItems.push({
      name: "Tributacao Regressiva (IR / IOF)",
      description: `Aliquota efetiva de ${((taxResult.effectiveIrBps + taxResult.effectiveIofBps) / 100).toFixed(1)}% sobre o rendimento liquido de custodia.`,
      costBps: taxResult.effectiveIrBps + taxResult.effectiveIofBps,
      costCents: taxResult.totalTaxCents,
    });
  }

  const totalHiddenCostCents = totalFeesCents + taxResult.totalTaxCents;
  const totalHiddenCostBps =
    investedCents > 0n ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents)) : 0;

  return {
    productClass: "tesouro_direto",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: taxResult.iofCents,
      irCents: taxResult.irCents,
      effectiveTaxRateBps: taxResult.effectiveIrBps + taxResult.effectiveIofBps,
      totalFeesCents,
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
      creditRiskType: "SOVEREIGN",
      riskRating: "VERY_LOW",
      explanation:
        "Garantia Soberana do Tesouro Nacional (100% garantido pelo Governo Federal, risco de credito soberano mais baixo da economia brasileira).",
    },
    benchmarking: {
      cdiSpreadBps: annualRateBps - cdiBps,
      selicSpreadBps: annualRateBps - selicBps,
      ipcaSpreadBps: annualRateBps - ipcaBps,
      benchmarkComparisonName: "Curva Soberana ANBIMA / IPCA",
      opportunityCostVsRiskFreeCents: 0n,
    },
    zenEngineInput: {
      productClass: "tesouro_direto",
      annualRateBps,
      feeBps: totalFeesCents > 0n ? B3_TESOURO_CUSTODY_FEE_BPS : 0,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "SOVEREIGN",
      holdingPeriodDays: holdingDays,
    },
  };
}
