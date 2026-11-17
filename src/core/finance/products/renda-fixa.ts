import type { LiquidityTier } from "../../../connectors/types";
import {
  calculateFixedIncomeTax,
  calculateFisherRealReturnBps,
  calculateEquivalentTaxFreeRateBps,
  calculateEquivalentTaxableRateBps,
  roundDiv,
} from "../taxation";
import { FGC_CONGLOMERATE_CAP_CENTS, isFgcEligibleInstrument } from "../fgc";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type CreditRiskType,
  type RiskRating,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type RendaFixaSubType =
  | "CDB"
  | "RDB"
  | "LCI"
  | "LCA"
  | "LC"
  | "DPGE"
  | "CRI"
  | "CRA"
  | "DEBENTURE"
  | "DEBENTURE_INCENTIVADA";

export interface RendaFixaAnalysisInput {
  productName: string;
  subType: RendaFixaSubType;
  investedCents: bigint;
  annualRateBps: number;
  holdingDays: number;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
  isExemptTax?: boolean;
  hasFgc?: boolean;
  creditRating?: RiskRating;
  brokerFeeBps?: number;
}

export function analyzeRendaFixa(input: RendaFixaAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    subType,
    investedCents,
    annualRateBps,
    holdingDays,
    liquidityTier = holdingDays <= 0 ? "D_0" : "AT_MATURITY",
    benchmarks = {},
    creditRating,
    brokerFeeBps = 0,
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  // Determine tax exemption default
  const isExempt = input.isExemptTax ?? [
    "LCI",
    "LCA",
    "CRI",
    "CRA",
    "DEBENTURE_INCENTIVADA",
  ].includes(subType);

  // Determine FGC default
  const hasFgc = input.hasFgc ?? isFgcEligibleInstrument("renda_fixa", subType);

  // 1. Gross Yield Projection
  const years = holdingDays / 365;
  const periodFactor = Math.pow(1 + annualRateBps / 10000, years) - 1;
  const grossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(periodFactor * 1000000))),
    1000000n
  );
  const grossYieldBps = investedCents > 0n
    ? Number(roundDiv(grossYieldCents * 10000n, investedCents))
    : 0;

  // Fees
  const totalFeesCents = brokerFeeBps > 0
    ? roundDiv(investedCents * BigInt(Math.round(brokerFeeBps * years)), 10000n)
    : 0n;

  // Taxes
  const taxResult = calculateFixedIncomeTax(grossYieldCents, holdingDays, isExempt);
  const netYieldCents = grossYieldCents > (taxResult.totalTaxCents + totalFeesCents)
    ? grossYieldCents - taxResult.totalTaxCents - totalFeesCents
    : 0n;
  const netYieldBps = investedCents > 0n
    ? Number(roundDiv(netYieldCents * 10000n, investedCents))
    : 0;
  const finalNetValueCents = investedCents + netYieldCents;

  // Fisher Real Return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(
    investedCents * BigInt(Math.max(0, inflationPeriodBps)),
    10000n
  );
  const realNetYieldCents = netYieldCents > inflationDiscountCents
    ? netYieldCents - inflationDiscountCents
    : netYieldCents - inflationDiscountCents; // can be negative

  // 2. Hidden Costs Scanner
  const hiddenCostItems: HiddenCostItem[] = [];
  if (taxResult.iofCents > 0n) {
    hiddenCostItems.push({
      name: "IOF Regressivo",
      description: "Penalidade por resgate em prazo inferior a 30 dias corridos",
      costBps: taxResult.effectiveIofBps,
      costCents: taxResult.iofCents,
    });
  }
  if (taxResult.irCents > 0n) {
    hiddenCostItems.push({
      name: "Imposto de Renda Regressivo",
      description: `Aliquota de ${((taxResult.effectiveIrBps) / 100).toFixed(1)}% sobre o rendimento tributavel`,
      costBps: taxResult.effectiveIrBps,
      costCents: taxResult.irCents,
    });
  }
  if (totalFeesCents > 0n) {
    hiddenCostItems.push({
      name: "Taxa de Custodia/Corretagem",
      description: "Friccao de intermediacao financeira",
      costBps: brokerFeeBps,
      costCents: totalFeesCents,
    });
  }

  // Equivalent rates comparison
  if (isExempt) {
    const eqTaxableBps = calculateEquivalentTaxableRateBps(annualRateBps, holdingDays);
    hiddenCostItems.push({
      name: "Beneficio de Isencao Fiscal",
      description: `Rendimento isento equivale a um titulo tributado pagando ${(eqTaxableBps / 100).toFixed(2)}% a.a.`,
      costBps: 0,
      costCents: 0n,
    });
  } else {
    const eqTaxFreeBps = calculateEquivalentTaxFreeRateBps(annualRateBps, holdingDays);
    hiddenCostItems.push({
      name: "Custo de Oportunidade Fiscal",
      description: `Rendimento liquido equivale a um titulo isento pagando ${(eqTaxFreeBps / 100).toFixed(2)}% a.a.`,
      costBps: annualRateBps - eqTaxFreeBps,
      costCents: taxResult.irCents,
    });
  }

  const totalHiddenCostCents = taxResult.totalTaxCents + totalFeesCents;
  const totalHiddenCostBps = investedCents > 0n
    ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents))
    : 0;

  // 3. Guarantee & Credit Risk Matrix
  let creditRiskType: CreditRiskType = "CORPORATE";
  let riskRating: RiskRating = creditRating ?? "MEDIUM";
  let explanation = "Emissao bancaria/corporativa sujeita ao risco de insolvencia da instituicao emissora.";

  let fgcCoveredCents = 0n;
  let fgcUncoveredCents = 0n;

  if (hasFgc) {
    creditRiskType = "FGC_BACKED";
    riskRating = creditRating ?? "LOW";
    fgcCoveredCents = finalNetValueCents > FGC_CONGLOMERATE_CAP_CENTS
      ? FGC_CONGLOMERATE_CAP_CENTS
      : finalNetValueCents;
    fgcUncoveredCents = finalNetValueCents - fgcCoveredCents;
    explanation = fgcUncoveredCents > 0n
      ? `Garantido pelo FGC ate R$ 250k. Posicao excede o teto em R$ ${(Number(fgcUncoveredCents) / 100).toFixed(2)}.`
      : "Totalmente coberto pela garantia ordinaria do FGC de ate R$ 250.000,00 por conglomerado.";
  } else {
    fgcUncoveredCents = finalNetValueCents;
    if (subType === "CRI" || subType === "CRA") {
      riskRating = creditRating ?? "MEDIUM";
      explanation = "Securitizacao sem garantia do FGC. Risco dependente dos recebiveis e lastro do devedor.";
    } else if (subType.includes("DEBENTURE")) {
      riskRating = creditRating ?? "MEDIUM";
      explanation = "Titulo de divida corporativa sem garantia do FGC. Risco atrelado a solidez da empresa emissora.";
    }
  }

  // 4. Benchmarking
  const cdiSpreadBps = annualRateBps - cdiBps;
  const selicSpreadBps = annualRateBps - selicBps;
  const ipcaSpreadBps = annualRateBps - ipcaBps;

  // Opportunity cost vs Tesouro Selic (risk free)
  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n
  );
  const selicTax = calculateFixedIncomeTax(selicGrossYieldCents, holdingDays, false);
  const selicNetYieldCents = selicGrossYieldCents - selicTax.totalTaxCents;
  const opportunityCostVsRiskFreeCents = selicNetYieldCents > netYieldCents
    ? selicNetYieldCents - netYieldCents
    : 0n;

  // 5. Zen Engine Normalized Input
  return {
    productClass: "renda_fixa",
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
      fgcEligible: hasFgc,
      fgcCoveredCents,
      fgcUncoveredCents,
      creditRiskType,
      riskRating,
      explanation,
    },
    benchmarking: {
      cdiSpreadBps,
      selicSpreadBps,
      ipcaSpreadBps,
      benchmarkComparisonName: "CDI / Tesouro Selic",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "renda_fixa",
      annualRateBps,
      feeBps: brokerFeeBps,
      fgcCovered: hasFgc,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType,
      holdingPeriodDays: holdingDays,
    },
  };
}
