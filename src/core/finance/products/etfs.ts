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

export type EtfSubType = "ETF_ACOES" | "ETF_RENDA_FIXA" | "ETF_INTERNACIONAL";

export interface EtfsAnalysisInput {
  productName: string;
  subType?: EtfSubType;
  investedCents: bigint;
  grossAnnualReturnBps: number;
  expenseRatioBps: number;    // Annual management fee (e.g. 20 bps = 0.20%)
  trackingErrorBps?: number;  // Annualized tracking difference vs index
  portfolioDurationDays?: number; // For Fixed Income ETFs tax bracket
  holdingDays: number;
  b3FeeBps?: number;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

/**
 * Analyzes Exchange-Traded Funds (ETFs) across the 5 critical System Design blocks:
 * Evaluates absence of come-cotas advantage, absence of R$ 20k swing-trade exemption,
 * expense ratio + tracking error drag, and Fisher real return.
 */
export function analyzeEtfs(input: EtfsAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    subType = "ETF_ACOES",
    investedCents,
    grossAnnualReturnBps,
    expenseRatioBps,
    trackingErrorBps = 10,
    portfolioDurationDays = 721,
    holdingDays,
    b3FeeBps = 3,
    liquidityTier = "D_1_TO_5",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  // 1. Gross Yield
  const grossPeriodFactor = Math.pow(1 + grossAnnualReturnBps / 10000, years) - 1;
  const grossYieldCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(grossPeriodFactor * 1000000))),
    1000000n,
  );
  const grossYieldBps =
    investedCents > 0n ? Number(roundDiv(grossYieldCents * 10000n, investedCents)) : 0;

  // 2. Fees (Expense Ratio + Tracking Error + B3 Fee)
  const totalAnnualDragBps = expenseRatioBps + trackingErrorBps;
  const feePeriodFactor = Math.pow(1 + totalAnnualDragBps / 10000, years) - 1;
  const expenseAndTrackingCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(feePeriodFactor * 1000000))),
    1000000n,
  );
  const b3FeeCents = roundDiv(investedCents * BigInt(b3FeeBps * 2), 10000n);
  const totalFeesCents = expenseAndTrackingCents + b3FeeCents;

  // 3. ETF Taxation (Zero Come-Cotas, taxed only at sale; NO R$ 20k exemption)
  const yieldAfterFeesCents =
    grossYieldCents > totalFeesCents ? grossYieldCents - totalFeesCents : 0n;

  const irRateBps =
    subType === "ETF_RENDA_FIXA"
      ? portfolioDurationDays <= 180
        ? 2500
        : portfolioDurationDays <= 720
          ? 2000
          : 1500
      : 1500; // 15% flat for Equity and International ETFs

  const irCents = roundDiv(yieldAfterFeesCents * BigInt(irRateBps), 10000n);
  const netYieldCents = yieldAfterFeesCents > irCents ? yieldAfterFeesCents - irCents : 0n;
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

  // Hidden Costs & Structural Advantage/Disadvantage Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Taxa de Administracao (Expense Ratio) + Tracking Error",
      description: `Custo passivo de ${(expenseRatioBps / 100).toFixed(2)}% a.a. mais desvio de aderencia de ${(trackingErrorBps / 100).toFixed(2)}% a.a.`,
      costBps: totalAnnualDragBps,
      costCents: expenseAndTrackingCents,
    },
    {
      name: "Ausencia da Isencao Mensal de R$ 20.000",
      description:
        "Diferente de acoes individuais na B3, vendas de ETFs tributam 15% de IR sobre qualquer lucro liquido (mas contam com a vantagem de ZERO come-cotas).",
      costBps: irRateBps,
      costCents: irCents,
    },
  ];

  const totalHiddenCostCents = totalFeesCents + irCents;
  const totalHiddenCostBps =
    investedCents > 0n ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents)) : 0;

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
    productClass: "etfs",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: 0n,
      irCents,
      effectiveTaxRateBps: irRateBps,
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
      riskRating: subType === "ETF_RENDA_FIXA" ? "LOW" : "MEDIUM",
      explanation:
        "Fundo de indice listado em bolsa com cesta diversificada de ativos custodiados na B3/ Depositario Central. Sem FGC, mas com risco especifico diluido pelo indice.",
    },
    benchmarking: {
      cdiSpreadBps: (grossAnnualReturnBps - expenseRatioBps) - cdiBps,
      selicSpreadBps: (grossAnnualReturnBps - expenseRatioBps) - selicBps,
      ipcaSpreadBps: (grossAnnualReturnBps - expenseRatioBps) - ipcaBps,
      benchmarkComparisonName:
        subType === "ETF_INTERNACIONAL" ? "S&P 500 (BRL)" : "IBOV / IMA-B",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "etfs",
      annualRateBps: grossAnnualReturnBps,
      feeBps: expenseRatioBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "CUSTODIAL",
      holdingPeriodDays: holdingDays,
    },
  };
}
