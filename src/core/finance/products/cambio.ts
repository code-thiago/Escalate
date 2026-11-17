import type { LiquidityTier } from "../../../connectors/types";
import {
  calculateFisherRealReturnBps,
  getRegressiveIRRateBps,
  roundDiv,
} from "../taxation";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type CambioOperationType =
  | "INVESTMENT_REMITTANCE" // 0.38% IOF
  | "CASH_CURRENCY"         // 1.10% IOF
  | "INTERNATIONAL_CARD";   // 4.38% IOF

export interface CambioAnalysisInput {
  productName: string;
  operationType?: CambioOperationType;
  investedCents: bigint;        // Total BRL amount committed
  ptaxRateCents: bigint;        // Official BCB PTAX in cents (e.g. R$ 5.80 = 580n)
  quotedRateCents?: bigint;     // Broker/Bank quoted exchange rate in cents
  spreadBps?: number;           // Explicit FX spread over PTAX in bps (e.g. 150 = 1.50%)
  expectedCurrencyAppreciationBps?: number; // Expected FX appreciation + foreign yield in bps
  holdingDays: number;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

/**
 * Analyzes Foreign Exchange (Cambio) operations across the 5 critical blocks:
 * Computes exact spread over PTAX, statutory IOF by remittance type, VET (Valor Efetivo Total),
 * and compares against domestic Selic opportunity cost.
 */
export function analyzeCambio(input: CambioAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    operationType = "INVESTMENT_REMITTANCE",
    investedCents,
    ptaxRateCents,
    quotedRateCents,
    spreadBps: explicitSpreadBps,
    expectedCurrencyAppreciationBps = 600,
    holdingDays,
    liquidityTier = "D_1_TO_5",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  // 1. Spread over PTAX calculation
  const spreadBps =
    explicitSpreadBps !== undefined
      ? explicitSpreadBps
      : quotedRateCents && ptaxRateCents > 0n && quotedRateCents > ptaxRateCents
        ? Number(roundDiv((quotedRateCents - ptaxRateCents) * 10000n, ptaxRateCents))
        : 120; // Default 1.20% spread

  const iofRateBps =
    operationType === "INVESTMENT_REMITTANCE"
      ? 38
      : operationType === "CASH_CURRENCY"
        ? 110
        : 438;

  const spreadCostCents = roundDiv(investedCents * BigInt(spreadBps), 10000n);
  const iofCents = roundDiv(investedCents * BigInt(iofRateBps), 10000n);

  // Gross currency gain before FX friction
  const appreciationFactor = Math.pow(1 + expectedCurrencyAppreciationBps / 10000, years) - 1;
  const grossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(appreciationFactor * 1000000))),
    1000000n,
  );
  const grossYieldBps =
    investedCents > 0n ? Number(roundDiv(grossYieldCents * 10000n, investedCents)) : 0;

  // Foreign investment capital gain tax (15% flat per Lei 14.754/2023)
  const netGainBeforeIR =
    grossYieldCents > spreadCostCents + iofCents
      ? grossYieldCents - spreadCostCents - iofCents
      : 0n;
  const irCents = roundDiv(netGainBeforeIR * 1500n, 10000n);

  const netYieldCents = netGainBeforeIR > irCents ? netGainBeforeIR - irCents : 0n;
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

  // VET (Valor Efetivo Total) in cents per unit of foreign currency
  const vetCents = roundDiv(
    ptaxRateCents * BigInt(10000 + spreadBps + iofRateBps),
    10000n,
  );

  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Spread Cambial sobre PTAX",
      description: `Agio comercial de ${(spreadBps / 100).toFixed(2)}% acima da PTAX oficial. VET estimado: R$ ${(Number(vetCents) / 100).toFixed(4)}.`,
      costBps: spreadBps,
      costCents: spreadCostCents,
    },
    {
      name: "IOF Cambial",
      description: `Imposto sobre Operacoes Financeiras de ${(iofRateBps / 100).toFixed(2)}% na conversao de moeda.`,
      costBps: iofRateBps,
      costCents: iofCents,
    },
  ];

  if (irCents > 0n) {
    hiddenCostItems.push({
      name: "IR sobre Aplicacoes no Exterior (15% - Lei 14.754)",
      description: "Aliquota anual de 15% sobre rendimentos e variacao cambial positiva.",
      costBps: 1500,
      costCents: irCents,
    });
  }

  const totalHiddenCostCents = spreadCostCents + iofCents + irCents;
  const totalHiddenCostBps =
    investedCents > 0n ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents)) : 0;

  // Opportunity cost vs domestic Selic
  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n,
  );
  const selicIrBps = getRegressiveIRRateBps(holdingDays);
  const selicNetCents =
    selicGrossCents - roundDiv(selicGrossCents * BigInt(selicIrBps), 10000n);
  const opportunityCostVsRiskFreeCents =
    selicNetCents > netYieldCents ? selicNetCents - netYieldCents : 0n;

  return {
    productClass: "cambio",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents,
      irCents,
      effectiveTaxRateBps: iofRateBps + (irCents > 0n ? 1500 : 0),
      totalFeesCents: spreadCostCents,
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
      riskRating: "MEDIUM",
      explanation:
        "Protecao cambial em moeda forte (USD/EUR), sem cobertura do FGC brasileiro. Se investido via corretora americana membro SIPC, ha cobertura externa ate US$ 500k.",
    },
    benchmarking: {
      cdiSpreadBps: expectedCurrencyAppreciationBps - cdiBps,
      selicSpreadBps: expectedCurrencyAppreciationBps - selicBps,
      ipcaSpreadBps: expectedCurrencyAppreciationBps - ipcaBps,
      benchmarkComparisonName: "PTAX + Treasury / CDI",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "cambio",
      annualRateBps: expectedCurrencyAppreciationBps,
      feeBps: spreadBps + iofRateBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "CUSTODIAL",
      holdingPeriodDays: holdingDays,
    },
  };
}
