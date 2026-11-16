import type { ProductClass, LiquidityTier } from "../../../connectors/types";

/**
 * Standardized 5-Block Product Critical Analysis Types
 * In accordance with PRD (01_PRD.md:73-90) and TRD (02_TRD.md).
 *
 * All monetary amounts are handled strictly in integer cents (bigint).
 * All rates and shares are handled in integer basis points (number, 1 bps = 0.01% = 0.0001).
 */

export interface ProductAnalysisBlock1NetRealReturn {
  investedCents: bigint;
  grossYieldCents: bigint;
  grossYieldBps: number;
  iofCents: bigint;
  irCents: bigint;
  effectiveTaxRateBps: number;
  totalFeesCents: bigint;
  netYieldCents: bigint;
  netYieldBps: number;
  finalNetValueCents: bigint;
  inflationDiscountCents: bigint;
  realNetYieldCents: bigint;
  realNetYieldBps: number; // Fisher exact formula
}

export interface HiddenCostItem {
  name: string;
  description: string;
  costBps: number;
  costCents: bigint;
}

export interface ProductAnalysisBlock2HiddenCosts {
  totalHiddenCostBps: number;
  totalHiddenCostCents: bigint;
  items: HiddenCostItem[];
}

export type CreditRiskType =
  | "SOVEREIGN"
  | "FGC_BACKED"
  | "CORPORATE"
  | "CUSTODIAL"
  | "UNSECURED";

export type RiskRating =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "SPECULATIVE";

export interface ProductAnalysisBlock3Guarantee {
  fgcEligible: boolean;
  fgcCoveredCents: bigint;
  fgcUncoveredCents: bigint;
  creditRiskType: CreditRiskType;
  riskRating: RiskRating;
  explanation: string;
}

export interface ProductAnalysisBlock4Benchmarking {
  cdiSpreadBps: number; // Spread vs CDI
  selicSpreadBps: number; // Spread vs Tesouro Selic
  ipcaSpreadBps: number; // Spread vs Tesouro IPCA+
  benchmarkComparisonName: string;
  opportunityCostVsRiskFreeCents: bigint;
}

export interface ProductAnalysisBlock5ZenInput {
  productClass: ProductClass;
  annualRateBps: number;
  feeBps: number;
  fgcCovered: boolean;
  liquidityTier: LiquidityTier;
  realNetYieldBps: number;
  hiddenDragBps: number;
  creditRiskType: CreditRiskType;
  holdingPeriodDays: number;
}

export interface StandardProductAnalysisResult {
  productClass: ProductClass;
  productName: string;
  horizonDays: number;
  netRealReturn: ProductAnalysisBlock1NetRealReturn;
  hiddenCosts: ProductAnalysisBlock2HiddenCosts;
  guaranteeMatrix: ProductAnalysisBlock3Guarantee;
  benchmarking: ProductAnalysisBlock4Benchmarking;
  zenEngineInput: ProductAnalysisBlock5ZenInput;
}

export interface BenchmarkRates {
  cdiBps?: number;   // Defaults to 1075 (10.75%)
  selicBps?: number; // Defaults to 1075 (10.75%)
  ipcaBps?: number;  // Defaults to 450 (4.50%)
}

export const DEFAULT_BENCHMARKS: Required<BenchmarkRates> = {
  cdiBps: 1075,
  selicBps: 1075,
  ipcaBps: 450,
};
