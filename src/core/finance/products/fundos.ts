import type { LiquidityTier } from "../../../connectors/types";
import {
  getRegressiveIRRateBps,
  calculateComeCotasImpact,
  calculateFisherRealReturnBps,
  roundDiv,
} from "../taxation";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type FundoSubType =
  | "RENDA_FIXA_LP"
  | "RENDA_FIXA_CP"
  | "MULTIMERCADO"
  | "ACOES"
  | "IMOBILIARIO";

export interface FundosAnalysisInput {
  productName: string;
  subType: FundoSubType;
  investedCents: bigint;
  grossAnnualReturnBps: number;
  managementFeeBps: number;
  performanceFeeBps?: number;
  benchmarkAnnualBps?: number;
  holdingDays: number;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

export function analyzeFundos(input: FundosAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    subType,
    investedCents,
    grossAnnualReturnBps,
    managementFeeBps,
    performanceFeeBps = 0,
    benchmarkAnnualBps,
    holdingDays,
    liquidityTier = "D_6_TO_30",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;
  const benchmarkRateBps = benchmarkAnnualBps ?? cdiBps;

  const years = holdingDays / 365;

  // 1. Gross Yield before fees
  const grossPeriodFactor = Math.pow(1 + grossAnnualReturnBps / 10000, years) - 1;
  const grossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(grossPeriodFactor * 1000000))),
    1000000n
  );
  const grossYieldBps = investedCents > 0n
    ? Number(roundDiv(grossYieldCents * 10000n, investedCents))
    : 0;

  // 2. Fees (Management + Performance)
  // Management fee reduces yield continuously
  const mgmtFeePeriodFactor = Math.pow(1 + managementFeeBps / 10000, years) - 1;
  const mgmtFeeCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(mgmtFeePeriodFactor * 1000000))),
    1000000n
  );

  // Performance fee (typically 20% on return exceeding benchmark)
  let perfFeeCents = 0n;
  if (performanceFeeBps > 0 && grossAnnualReturnBps > benchmarkRateBps) {
    const excessBps = grossAnnualReturnBps - benchmarkRateBps;
    const excessFactor = Math.pow(1 + excessBps / 10000, years) - 1;
    const excessGainCents = roundDiv(
      investedCents * BigInt(Math.max(0, Math.round(excessFactor * 1000000))),
      1000000n
    );
    perfFeeCents = roundDiv(excessGainCents * BigInt(performanceFeeBps), 10000n);
  }

  const totalFeesCents = mgmtFeeCents + perfFeeCents;
  const yieldAfterFeesCents = grossYieldCents > totalFeesCents
    ? grossYieldCents - totalFeesCents
    : 0n;

  // 3. Taxation & Come-Cotas
  const hasComeCotas = subType === "RENDA_FIXA_LP" || subType === "RENDA_FIXA_CP" || subType === "MULTIMERCADO";
  let irCents = 0n;
  let comeCotasDragCents = 0n;
  let effectiveTaxRateBps = 0;

  if (hasComeCotas) {
    const fundTaxType = subType === "RENDA_FIXA_CP" ? "CURTO_PRAZO" : "LONGO_PRAZO";
    const netAnnualBps = Math.max(0, grossAnnualReturnBps - managementFeeBps);
    const comeCotasSim = calculateComeCotasImpact(investedCents, netAnnualBps, holdingDays, fundTaxType);
    comeCotasDragCents = comeCotasSim.lossFromCompoundingCents;

    // Complementary IR at redemption
    const terminalIRRateBps = getRegressiveIRRateBps(holdingDays);
    const advanceRateBps = fundTaxType === "CURTO_PRAZO" ? 2000 : 1500;
    const complementaryRateBps = terminalIRRateBps > advanceRateBps
      ? terminalIRRateBps - advanceRateBps
      : 0;

    const complementaryIRCents = roundDiv(yieldAfterFeesCents * BigInt(complementaryRateBps), 10000n);
    irCents = comeCotasSim.cumulativeTaxCents + complementaryIRCents;
    effectiveTaxRateBps = terminalIRRateBps;
  } else if (subType === "ACOES") {
    // FIA: 15% flat IR at redemption, zero come-cotas
    const fiaIRBps = 1500;
    irCents = roundDiv(yieldAfterFeesCents * BigInt(fiaIRBps), 10000n);
    effectiveTaxRateBps = fiaIRBps;
  } else if (subType === "IMOBILIARIO") {
    // FII: 20% on capital gain at redemption, zero come-cotas
    const fiiIRBps = 2000;
    irCents = roundDiv(yieldAfterFeesCents * BigInt(fiiIRBps), 10000n);
    effectiveTaxRateBps = fiiIRBps;
  }

  const netYieldCents = yieldAfterFeesCents > irCents
    ? yieldAfterFeesCents - irCents
    : 0n;
  const netYieldBps = investedCents > 0n
    ? Number(roundDiv(netYieldCents * 10000n, investedCents))
    : 0;
  const finalNetValueCents = investedCents + netYieldCents;

  // Fisher Real Return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(investedCents * BigInt(Math.max(0, inflationPeriodBps)), 10000n);
  const realNetYieldCents = netYieldCents - inflationDiscountCents;

  // 4. Hidden Costs Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Taxa de Administracao",
      description: `Deducao continua de ${(managementFeeBps / 100).toFixed(2)}% a.a. sobre o patrimonio liquido`,
      costBps: managementFeeBps,
      costCents: mgmtFeeCents,
    },
  ];

  if (perfFeeCents > 0n) {
    hiddenCostItems.push({
      name: "Taxa de Performance",
      description: `Cobranca de ${(performanceFeeBps / 100).toFixed(0)}% sobre o que exceder o benchmark`,
      costBps: Number(roundDiv(perfFeeCents * 10000n, investedCents)),
      costCents: perfFeeCents,
    });
  }

  if (hasComeCotas) {
    hiddenCostItems.push({
      name: "Drag do Come-Cotas Semestral",
      description: "Perda patrimonial causada pela antecipacao semestral de IR e quebra do juro composto",
      costBps: investedCents > 0n ? Number(roundDiv(comeCotasDragCents * 10000n, investedCents)) : 0,
      costCents: comeCotasDragCents,
    });
  }

  const totalHiddenCostCents = totalFeesCents + comeCotasDragCents;
  const totalHiddenCostBps = investedCents > 0n
    ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents))
    : 0;

  // 5. Benchmarking & Opportunity Cost
  const cdiSpreadBps = (grossAnnualReturnBps - managementFeeBps) - cdiBps;
  const selicSpreadBps = (grossAnnualReturnBps - managementFeeBps) - selicBps;
  const ipcaSpreadBps = (grossAnnualReturnBps - managementFeeBps) - ipcaBps;

  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n
  );
  const selicTaxBps = getRegressiveIRRateBps(holdingDays);
  const selicNetYieldCents = selicGrossYieldCents - roundDiv(selicGrossYieldCents * BigInt(selicTaxBps), 10000n);
  const opportunityCostVsRiskFreeCents = selicNetYieldCents > netYieldCents
    ? selicNetYieldCents - netYieldCents
    : 0n;

  return {
    productClass: "fundos",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: 0n,
      irCents,
      effectiveTaxRateBps,
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
      creditRiskType: "CUSTODIAL",
      riskRating: subType === "ACOES" ? "HIGH" : "MEDIUM",
      explanation: "Condominio fechado de cotistas segregado do gestor/administrador. ZERO garantia do FGC.",
    },
    benchmarking: {
      cdiSpreadBps,
      selicSpreadBps,
      ipcaSpreadBps,
      benchmarkComparisonName: subType === "ACOES" ? "Ibovespa" : "CDI",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "fundos",
      annualRateBps: grossAnnualReturnBps,
      feeBps: managementFeeBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "CUSTODIAL",
      holdingPeriodDays: holdingDays,
    },
  };
}
