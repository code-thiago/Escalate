import type { LiquidityTier } from "../../../connectors/types";
import {
  calculateBolsaTax,
  calculateFisherRealReturnBps,
  roundDiv,
} from "../taxation";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type BolsaAssetType = "ACAO_B3" | "BDR" | "STOCK_US";

export interface BolsaAnalysisInput {
  productName: string;
  assetType?: BolsaAssetType;
  investedCents: bigint;
  capitalGainCents: bigint;
  dividendYieldBps?: number;
  monthlySalesCents: bigint;
  isDayTrade?: boolean;
  holdingDays: number;
  brokerageFeeCents?: bigint;
  b3FeeBps?: number; // 3 bps = 0.03% standard B3 fee (emolumentos + liquidacao)
  accumulatedLossCents?: bigint;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

export function analyzeBolsa(input: BolsaAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    assetType = "ACAO_B3",
    investedCents,
    capitalGainCents,
    dividendYieldBps = 0,
    monthlySalesCents,
    isDayTrade = false,
    holdingDays,
    brokerageFeeCents = 0n,
    b3FeeBps = 3, // 0.03%
    accumulatedLossCents = 0n,
    liquidityTier = "D_1_TO_5",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  // 1. Dividends & Yields
  const totalDivFactor = (dividendYieldBps / 10000) * years;
  const dividendCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(totalDivFactor * 1000000))),
    1000000n
  );

  const grossGainCents = capitalGainCents > 0n ? capitalGainCents : 0n;
  const grossYieldCents = grossGainCents + dividendCents;
  const grossYieldBps = investedCents > 0n
    ? Number(roundDiv(grossYieldCents * 10000n, investedCents))
    : 0;

  // 2. Transaction Fees (Brokerage + B3 Fees)
  const totalExitValueCents = investedCents + capitalGainCents;
  const b3FeeCents = roundDiv(
    (investedCents + (totalExitValueCents > 0n ? totalExitValueCents : 0n)) * BigInt(b3FeeBps),
    10000n
  );
  const totalFeesCents = brokerageFeeCents + b3FeeCents;

  // 3. Taxation
  const taxResult = calculateBolsaTax(
    capitalGainCents,
    monthlySalesCents,
    isDayTrade,
    accumulatedLossCents
  );

  const netYieldCents = grossYieldCents > (taxResult.taxCents + totalFeesCents)
    ? grossYieldCents - taxResult.taxCents - totalFeesCents
    : 0n;
  const netYieldBps = investedCents > 0n
    ? Number(roundDiv(netYieldCents * 10000n, investedCents))
    : 0;
  const finalNetValueCents = investedCents + capitalGainCents + dividendCents - taxResult.taxCents - totalFeesCents;

  // Fisher Real Return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(investedCents * BigInt(Math.max(0, inflationPeriodBps)), 10000n);
  const realNetYieldCents = netYieldCents - inflationDiscountCents;

  // 4. Hidden Costs Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Taxas de Negociacao B3",
      description: "Emolumentos e taxa de liquidacao cobrados pela B3 (0,03%)",
      costBps: b3FeeBps,
      costCents: b3FeeCents,
    },
  ];

  if (brokerageFeeCents > 0n) {
    hiddenCostItems.push({
      name: "Corretagem",
      description: "Custos de execucao e corretagem da corretora",
      costBps: investedCents > 0n ? Number(roundDiv(brokerageFeeCents * 10000n, investedCents)) : 0,
      costCents: brokerageFeeCents,
    });
  }

  if (taxResult.taxCents > 0n) {
    hiddenCostItems.push({
      name: isDayTrade ? "IR Day-Trade (20%)" : "IR Ganho de Capital Swing-Trade (15%)",
      description: isDayTrade
        ? "Tributacao sem isencao com retencao de 1% dedo-duro"
        : "Tributacao sobre alienacoes superiores a R$ 20.000 no mes",
      costBps: taxResult.effectiveTaxBps,
      costCents: taxResult.taxCents,
    });
  } else if (taxResult.isExempt) {
    hiddenCostItems.push({
      name: "Isencao Fiscal R$ 20k",
      description: "Alienacoes no mes dentro do teto de isencao de R$ 20.000,00",
      costBps: 0,
      costCents: 0n,
    });
  }

  const totalHiddenCostCents = totalFeesCents + taxResult.taxCents;
  const totalHiddenCostBps = investedCents > 0n
    ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents))
    : 0;

  // 5. Benchmarking & Opportunity Cost
  const annualizedNetYieldBps = years > 0
    ? Math.round(netYieldBps / years)
    : netYieldBps;
  const cdiSpreadBps = annualizedNetYieldBps - cdiBps;
  const selicSpreadBps = annualizedNetYieldBps - selicBps;
  const ipcaSpreadBps = annualizedNetYieldBps - ipcaBps;

  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n
  );
  const selicNetYieldCents = selicGrossYieldCents - roundDiv(selicGrossYieldCents * 1500n, 10000n);
  const opportunityCostVsRiskFreeCents = selicNetYieldCents > netYieldCents
    ? selicNetYieldCents - netYieldCents
    : 0n;

  return {
    productClass: "bolsa",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: 0n,
      irCents: taxResult.taxCents,
      effectiveTaxRateBps: taxResult.effectiveTaxBps,
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
      fgcUncoveredCents: finalNetValueCents > 0n ? finalNetValueCents : 0n,
      creditRiskType: "CORPORATE",
      riskRating: "HIGH",
      explanation: "Renda variavel sujeita a risco de mercado, volatilidade e insolvencia corporativa. ZERO garantia FGC.",
    },
    benchmarking: {
      cdiSpreadBps,
      selicSpreadBps,
      ipcaSpreadBps,
      benchmarkComparisonName: assetType === "STOCK_US" ? "S&P 500" : "Ibovespa",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "bolsa",
      annualRateBps: annualizedNetYieldBps,
      feeBps: b3FeeBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "CORPORATE",
      holdingPeriodDays: holdingDays,
    },
  };
}
