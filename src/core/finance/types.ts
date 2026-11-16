import type {
  NormalizedPositionDTO,
  ProductClass,
  LiquidityTier,
} from "../../connectors/types";
import type { GoalLiquidityTier } from "../../db/schema";

export type { NormalizedPositionDTO, ProductClass, LiquidityTier, GoalLiquidityTier };

// 1. Portfolio Consolidation & Liquidity Ladder
export interface ClassAllocation {
  totalCents: bigint;
  shareBps: number;
}

export type ClassAllocations = Partial<Record<ProductClass, ClassAllocation>>;

export interface PortfolioConsolidationResult {
  totalGrossCents: bigint;
  totalNetCents: bigint;
  classAllocations: Partial<Record<ProductClass, ClassAllocation>>;
}

export interface LiquidityLadderResult {
  buckets: Record<LiquidityTier, bigint>;
}

// 2. Fractional Goals Allocation
export interface GoalAllocationItem {
  assetId: string;
  allocatedBps: number;
}

export interface InvestmentGoal {
  id: string;
  userId: string;
  title: string;
  targetAmountCents: bigint;
  targetDate: string; // YYYY-MM-DD
  requiredLiquidityMaxTier?: GoalLiquidityTier;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GoalAllocationWithAsset {
  asset: NormalizedPositionDTO;
  allocatedBps: number;
}

export interface GoalAllocationBreakdownItem {
  assetId: string;
  tickerOrCode: string;
  assetName: string;
  allocatedBps: number;
  assetNetCents: bigint;
  allocatedCents: bigint;
  liquidityTier: LiquidityTier;
  maturityDate: string | null;
  hasLiquidityMismatch: boolean;
}

export interface GoalProgressResult {
  goalId: string;
  title: string;
  targetAmountCents: bigint;
  totalAllocatedCents: bigint;
  remainingCents: bigint;
  progressBps: number; // 0 to 10000 bps (capped at 100%)
  isCompleted: boolean;
  allocationsCount: number;
  breakdown: GoalAllocationBreakdownItem[];
  warnings: string[];
}

// 3. Historical Realized Yield
export interface CalendarLedgerEvent {
  id: string;
  userId: string;
  assetId: string | null;
  institutionId?: string;
  eventDate: string; // YYYY-MM-DD
  eventPhase: "REALIZED" | "PROJECTED";
  eventType:
    | "CONTRIBUTION"
    | "DIVIDEND_JCP"
    | "DIVIDEND"
    | "COUPON"
    | "MATURITY"
    | "DAILY_YIELD_SNAPSHOT"
    | "INTEREST"
    | "AMORTIZATION";
  amountCents: bigint;
  yieldBps: number;
  createdAt?: Date;
}

export interface BenchmarkInput {
  cdiBps?: number;
  ipcaBps?: number;
}

export interface AggregateYieldOptions {
  benchmarks?: BenchmarkInput;
  totalInvestedCents?: bigint;
}

export interface MonthlyYieldSummary {
  yearMonth: string; // YYYY-MM
  yieldCents: bigint;
  contributionsCents: bigint;
  yieldBps: number;
  eventCount: number;
}

export interface BenchmarkComparison {
  cdiBps: number;
  ipcaBps: number;
  spreadOverCdiBps: number;
  spreadOverIpcaBps: number;
  percentOfCdiBps: number;
  percentOfIpcaBps: number;
}

export interface HistoricalYieldAggregationResult {
  totalRealizedYieldCents: bigint;
  totalContributionsCents: bigint;
  totalDividendsCents: bigint;
  totalCouponsCents: bigint;
  totalInterestCents: bigint;
  totalAmortizationsCents: bigint;
  eventCount: number;
  realizedYieldBps: number;
  byEventType: Record<string, { totalCents: bigint; count: number }>;
  byMonth: MonthlyYieldSummary[];
  benchmarks: BenchmarkComparison;
}

// 4. Biphasic Financial Calendar
export type BiphasicEventType =
  | "contribution"
  | "dividend"
  | "interest"
  | "amortization"
  | "maturity";

export interface BiphasicCalendarEvent {
  date: string; // YYYY-MM-DD
  type: BiphasicEventType;
  amountCents: bigint;
  assetId?: string | null;
  tickerOrCode?: string;
  description?: string;
  rawType?: string;
}

export interface ProjectedPercentiles {
  p10Cents: bigint;
  p50Cents: bigint;
  p90Cents: bigint;
}

export interface BiphasicCalendarMonth {
  yearMonth: string; // YYYY-MM
  phase: "realized" | "projected";
  totalYieldCents: bigint;
  yieldBps: number;
  netCashflowCents?: bigint;
  events: BiphasicCalendarEvent[];
  projectedPercentiles?: ProjectedPercentiles;
}

export interface CalendarLedgerEventRecord {
  id?: string;
  userId?: string;
  assetId?: string | null;
  eventDate: string | Date;
  eventPhase?: "REALIZED" | "PROJECTED" | "realized" | "projected";
  eventType:
    | "CONTRIBUTION"
    | "DIVIDEND_JCP"
    | "DIVIDEND"
    | "COUPON"
    | "MATURITY"
    | "DAILY_YIELD_SNAPSHOT"
    | "INTEREST"
    | "AMORTIZATION"
    | "contribution"
    | "dividend"
    | "interest"
    | "amortization"
    | "maturity";
  amountCents: bigint;
  yieldBps?: number;
  description?: string;
}

export interface PortfolioAssetSummary {
  id?: string;
  tickerOrCode?: string;
  assetName?: string;
  currentNetCents: bigint;
  investedCents?: bigint;
  annualRateBps?: number;
  maturityDate?: string | Date | null;
}

export interface StochasticProjectionInput {
  yearMonth: string; // YYYY-MM
  p10Cents: bigint;
  p50Cents: bigint;
  p90Cents: bigint;
  expectedYieldBps?: number;
}

export interface ExpectedRateCurveInput {
  p10RateBps: number;
  p50RateBps: number;
  p90RateBps: number;
}

export interface BiphasicCalendarInput {
  ledgerEvents?: CalendarLedgerEventRecord[];
  portfolioAssets?: PortfolioAssetSummary[];
  stochasticProjections?: StochasticProjectionInput[];
  expectedRateCurve?: ExpectedRateCurveInput;
  horizonMonths: number; // 0 to 600
  referenceDate?: string | Date; // Defaults to current date (now)
  startingPortfolioCents?: bigint;
  startYearMonth?: string; // Optional custom start month
}

export interface BiphasicCalendarSummary {
  totalRealizedYieldCents: bigint;
  totalProjectedP50YieldCents: bigint;
  totalMaturitiesCents: bigint;
  realizedMonthsCount: number;
  projectedMonthsCount: number;
  totalEventsCount: number;
}
