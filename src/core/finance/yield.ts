import type {
  CalendarLedgerEvent,
  AggregateYieldOptions,
  HistoricalYieldAggregationResult,
  MonthlyYieldSummary,
  BenchmarkComparison,
} from "./types";

/**
 * Event types considered as income/yield generation.
 */
const YIELD_EVENT_TYPES = new Set([
  "DIVIDEND_JCP",
  "COUPON",
  "INTEREST",
  "DAILY_YIELD_SNAPSHOT",
]);

/**
 * Aggregates realized monetary yield in integer cents and basis points from calendar ledger events.
 * Computes comparative yield against benchmark CDI and IPCA basis points.
 * Strictly ignores projected events (eventPhase === 'PROJECTED').
 */
export function aggregateHistoricalYield(
  events: CalendarLedgerEvent[],
  options?: AggregateYieldOptions
): HistoricalYieldAggregationResult {
  // Filter for realized events only
  const realizedEvents = events.filter((e) => e.eventPhase === "REALIZED");

  let totalRealizedYieldCents = 0n;
  let totalContributionsCents = 0n;
  let totalDividendsCents = 0n;
  let totalCouponsCents = 0n;
  let totalInterestCents = 0n;
  let totalAmortizationsCents = 0n;

  const byEventType: Record<string, { totalCents: bigint; count: number }> = {};
  const monthMap: Record<
    string,
    { yieldCents: bigint; contributionsCents: bigint; yieldBpsSum: number; count: number }
  > = {};

  for (const event of realizedEvents) {
    const { eventType, amountCents, yieldBps, eventDate } = event;

    // Track event type breakdown
    if (!byEventType[eventType]) {
      byEventType[eventType] = { totalCents: 0n, count: 0 };
    }
    byEventType[eventType].totalCents += amountCents;
    byEventType[eventType].count += 1;

    // Categorize cashflows
    if (eventType === "CONTRIBUTION") {
      totalContributionsCents += amountCents;
    } else if (eventType === "AMORTIZATION") {
      totalAmortizationsCents += amountCents;
    } else if (eventType === "MATURITY") {
      // Principal redemption / return of capital: not realized yield
    } else if (YIELD_EVENT_TYPES.has(eventType)) {
      totalRealizedYieldCents += amountCents;

      if (eventType === "DIVIDEND_JCP") {
        totalDividendsCents += amountCents;
      } else if (eventType === "COUPON") {
        totalCouponsCents += amountCents;
      } else if (eventType === "INTEREST") {
        totalInterestCents += amountCents;
      }
    }

    // Monthly bucket grouping (YYYY-MM)
    const yearMonth = eventDate.substring(0, 7);
    if (!monthMap[yearMonth]) {
      monthMap[yearMonth] = {
        yieldCents: 0n,
        contributionsCents: 0n,
        yieldBpsSum: 0,
        count: 0,
      };
    }

    monthMap[yearMonth].count += 1;
    if (eventType === "CONTRIBUTION") {
      monthMap[yearMonth].contributionsCents += amountCents;
    } else if (YIELD_EVENT_TYPES.has(eventType)) {
      monthMap[yearMonth].yieldCents += amountCents;
      monthMap[yearMonth].yieldBpsSum += yieldBps || 0;
    }
  }

  // Calculate overall realized yield in basis points
  let realizedYieldBps = 0;
  if (options?.totalInvestedCents && options.totalInvestedCents > 0n) {
    realizedYieldBps = Number(
      (totalRealizedYieldCents * 10000n) / options.totalInvestedCents
    );
  } else if (totalContributionsCents > 0n) {
    realizedYieldBps = Number(
      (totalRealizedYieldCents * 10000n) / totalContributionsCents
    );
  } else {
    realizedYieldBps = realizedEvents
      .filter((e) => YIELD_EVENT_TYPES.has(e.eventType))
      .reduce((sum, e) => sum + (e.yieldBps || 0), 0);
  }

  // Monthly summaries sorted chronologically
  const sortedMonths = Object.keys(monthMap).sort();
  const byMonth: MonthlyYieldSummary[] = sortedMonths.map((ym) => {
    const data = monthMap[ym];
    let monthYieldBps = data.yieldBpsSum;
    if (data.contributionsCents > 0n && data.yieldCents > 0n) {
      monthYieldBps = Number((data.yieldCents * 10000n) / data.contributionsCents);
    }
    return {
      yearMonth: ym,
      yieldCents: data.yieldCents,
      contributionsCents: data.contributionsCents,
      yieldBps: monthYieldBps,
      eventCount: data.count,
    };
  });

  // Benchmark comparisons
  const benchmarkCdiBps = options?.benchmarks?.cdiBps ?? 0;
  const benchmarkIpcaBps = options?.benchmarks?.ipcaBps ?? 0;

  const spreadOverCdiBps = realizedYieldBps - benchmarkCdiBps;
  const spreadOverIpcaBps = realizedYieldBps - benchmarkIpcaBps;

  const percentOfCdiBps =
    benchmarkCdiBps > 0
      ? Math.round((realizedYieldBps * 10000) / benchmarkCdiBps)
      : 0;

  const percentOfIpcaBps =
    benchmarkIpcaBps > 0
      ? Math.round((realizedYieldBps * 10000) / benchmarkIpcaBps)
      : 0;

  const benchmarks: BenchmarkComparison = {
    cdiBps: benchmarkCdiBps,
    ipcaBps: benchmarkIpcaBps,
    spreadOverCdiBps,
    spreadOverIpcaBps,
    percentOfCdiBps,
    percentOfIpcaBps,
  };

  return {
    totalRealizedYieldCents,
    totalContributionsCents,
    totalDividendsCents,
    totalCouponsCents,
    totalInterestCents,
    totalAmortizationsCents,
    eventCount: realizedEvents.length,
    realizedYieldBps,
    byEventType,
    byMonth,
    benchmarks,
  };
}
