import type {
  BiphasicEventType,
  BiphasicCalendarEvent,
  ProjectedPercentiles,
  BiphasicCalendarMonth,
  CalendarLedgerEventRecord,
  PortfolioAssetSummary,
  StochasticProjectionInput,
  ExpectedRateCurveInput,
  BiphasicCalendarInput,
  BiphasicCalendarSummary,
} from "./types";

export type {
  BiphasicEventType,
  BiphasicCalendarEvent,
  ProjectedPercentiles,
  BiphasicCalendarMonth,
  CalendarLedgerEventRecord,
  PortfolioAssetSummary,
  StochasticProjectionInput,
  ExpectedRateCurveInput,
  BiphasicCalendarInput,
  BiphasicCalendarSummary,
};

// Error Classes
export class CalendarHorizonExceededError extends Error {
  constructor(message = "Calendar projection horizon cannot exceed 600 months (50 years)") {
    super(message);
    this.name = "CalendarHorizonExceededError";
  }
}

export class InvalidCalendarHorizonError extends Error {
  constructor(message = "Calendar projection horizon must be a non-negative integer") {
    super(message);
    this.name = "InvalidCalendarHorizonError";
  }
}

// Pure Utility Functions
export function parseYearMonth(ym: string): { year: number; month: number } {
  const match = ym.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid yearMonth format: "${ym}". Expected "YYYY-MM"`);
  }
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonthsToYearMonth(ym: string, deltaMonths: number): string {
  const { year, month } = parseYearMonth(ym);
  const totalMonths = year * 12 + (month - 1) + deltaMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  return formatYearMonth(targetYear, targetMonth);
}

export function extractYearMonthFromDate(date: string | Date): string {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
    const d = new Date(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function extractDateString(date: string | Date): string {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function normalizeEventType(raw: string): BiphasicEventType {
  const upper = raw.toUpperCase();
  switch (upper) {
    case "CONTRIBUTION":
      return "contribution";
    case "DIVIDEND_JCP":
    case "DIVIDEND":
      return "dividend";
    case "COUPON":
    case "INTEREST":
    case "DAILY_YIELD_SNAPSHOT":
      return "interest";
    case "AMORTIZATION":
      return "amortization";
    case "MATURITY":
      return "maturity";
    default:
      if (
        raw === "contribution" ||
        raw === "dividend" ||
        raw === "interest" ||
        raw === "amortization" ||
        raw === "maturity"
      ) {
        return raw;
      }
      return "interest";
  }
}

export function isYieldBearingEventType(rawType: string): boolean {
  const upper = rawType.toUpperCase();
  return (
    upper === "DIVIDEND_JCP" ||
    upper === "DIVIDEND" ||
    upper === "COUPON" ||
    upper === "INTEREST" ||
    upper === "DAILY_YIELD_SNAPSHOT"
  );
}

/**
 * Builds the complete Biphasic Financial Calendar.
 * Strictly separates realized history (<= referenceDate) from projected future (> referenceDate).
 */
export function buildBiphasicCalendar(
  input: BiphasicCalendarInput
): BiphasicCalendarMonth[] {
  // Invariant 1: DoS Horizon Limit
  if (
    typeof input.horizonMonths !== "number" ||
    !Number.isInteger(input.horizonMonths) ||
    input.horizonMonths < 0
  ) {
    throw new InvalidCalendarHorizonError(
      `Calendar projection horizon must be a non-negative integer, received ${input.horizonMonths}`
    );
  }

  if (input.horizonMonths > 600) {
    throw new CalendarHorizonExceededError(
      `Calendar projection horizon cannot exceed 600 months (50 years), received ${input.horizonMonths}`
    );
  }

  // Temporal Boundary: Reference YearMonth
  const refDate = input.referenceDate
    ? typeof input.referenceDate === "string"
      ? new Date(input.referenceDate)
      : input.referenceDate
    : new Date();
  const currentYearMonth = extractYearMonthFromDate(input.referenceDate ?? refDate);

  // Group Ledger Events
  const eventsByMonth = new Map<string, BiphasicCalendarEvent[]>();
  const yieldCentsByMonth = new Map<string, bigint>();
  const cashflowCentsByMonth = new Map<string, bigint>();
  const yieldBpsSumByMonth = new Map<string, number>();

  const ledgerEvents = input.ledgerEvents ?? [];
  let earliestEventMonth: string | null = null;

  for (const rawEvent of ledgerEvents) {
    const dateStr = extractDateString(rawEvent.eventDate);
    const ym = extractYearMonthFromDate(rawEvent.eventDate);

    if (!earliestEventMonth || ym < earliestEventMonth) {
      earliestEventMonth = ym;
    }

    const normalizedType = normalizeEventType(rawEvent.eventType);
    const event: BiphasicCalendarEvent = {
      date: dateStr,
      type: normalizedType,
      amountCents: rawEvent.amountCents,
      assetId: rawEvent.assetId,
      description: rawEvent.description,
      rawType: String(rawEvent.eventType),
    };

    if (!eventsByMonth.has(ym)) {
      eventsByMonth.set(ym, []);
      yieldCentsByMonth.set(ym, 0n);
      cashflowCentsByMonth.set(ym, 0n);
      yieldBpsSumByMonth.set(ym, 0);
    }

    eventsByMonth.get(ym)!.push(event);

    // Yield aggregation
    if (isYieldBearingEventType(rawEvent.eventType)) {
      yieldCentsByMonth.set(
        ym,
        (yieldCentsByMonth.get(ym) ?? 0n) + rawEvent.amountCents
      );
    }

    // Cashflow aggregation: inflows (+), contributions (-)
    const currentCashflow = cashflowCentsByMonth.get(ym) ?? 0n;
    if (normalizedType === "contribution") {
      cashflowCentsByMonth.set(ym, currentCashflow - rawEvent.amountCents);
    } else {
      cashflowCentsByMonth.set(ym, currentCashflow + rawEvent.amountCents);
    }

    if (rawEvent.yieldBps !== undefined) {
      yieldBpsSumByMonth.set(
        ym,
        (yieldBpsSumByMonth.get(ym) ?? 0) + rawEvent.yieldBps
      );
    }
  }

  // Determine Realized Timeline Span
  const startMonth =
    input.startYearMonth ??
    (earliestEventMonth && earliestEventMonth <= currentYearMonth
      ? earliestEventMonth
      : currentYearMonth);

  const resultMonths: BiphasicCalendarMonth[] = [];

  // Generate Realized Months (Phase 1: <= currentYearMonth)
  let cursorYM = startMonth;
  while (cursorYM <= currentYearMonth) {
    const events = eventsByMonth.get(cursorYM) ?? [];
    events.sort((a, b) => a.date.localeCompare(b.date));

    const totalYieldCents = yieldCentsByMonth.get(cursorYM) ?? 0n;
    const netCashflowCents = cashflowCentsByMonth.get(cursorYM) ?? 0n;

    // Calculate Yield BPS
    let yieldBps = 0;
    if (input.startingPortfolioCents && input.startingPortfolioCents > 0n) {
      yieldBps = Number((totalYieldCents * 10000n) / input.startingPortfolioCents);
    } else {
      yieldBps = yieldBpsSumByMonth.get(cursorYM) ?? 0;
    }

    resultMonths.push({
      yearMonth: cursorYM,
      phase: "realized",
      totalYieldCents,
      yieldBps,
      netCashflowCents,
      events,
    });

    if (cursorYM === currentYearMonth) break;
    cursorYM = addMonthsToYearMonth(cursorYM, 1);
  }

  // Process Portfolio Assets (Maturities & Capital Aggregation)
  const maturitiesByMonth = new Map<string, BiphasicCalendarEvent[]>();
  const portfolioAssets = input.portfolioAssets ?? [];
  let totalPortfolioNetCents = 0n;
  let weightedRateSum = 0n;

  for (const asset of portfolioAssets) {
    totalPortfolioNetCents += asset.currentNetCents;
    if (asset.annualRateBps) {
      weightedRateSum += asset.currentNetCents * BigInt(asset.annualRateBps);
    }

    if (asset.maturityDate) {
      const matYM = extractYearMonthFromDate(asset.maturityDate);
      const matDateStr = extractDateString(asset.maturityDate);

      // Only include maturities strictly in the future
      if (matYM > currentYearMonth) {
        if (!maturitiesByMonth.has(matYM)) {
          maturitiesByMonth.set(matYM, []);
        }
        maturitiesByMonth.get(matYM)!.push({
          date: matDateStr,
          type: "maturity",
          amountCents: asset.currentNetCents,
          assetId: asset.id,
          tickerOrCode: asset.tickerOrCode,
          description: `Vencimento de ${asset.assetName ?? asset.tickerOrCode ?? "Ativo"}`,
        });
      }
    }
  }

  // Index Stochastic Projections
  const projectionsByMonth = new Map<string, StochasticProjectionInput>();
  if (input.stochasticProjections) {
    for (const proj of input.stochasticProjections) {
      projectionsByMonth.set(proj.yearMonth, proj);
    }
  }

  // Generate Projected Months (Phase 2: > currentYearMonth up to horizonMonths)
  for (let step = 1; step <= input.horizonMonths; step++) {
    const projYM = addMonthsToYearMonth(currentYearMonth, step);
    const projEvents: BiphasicCalendarEvent[] = [];

    // Add maturities in this projected month
    const maturities = maturitiesByMonth.get(projYM);
    if (maturities) {
      projEvents.push(...maturities);
    }

    // Add scheduled future ledger events in this month
    const scheduled = eventsByMonth.get(projYM);
    if (scheduled) {
      projEvents.push(...scheduled);
    }

    projEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Determine stochastic percentiles and yield
    let percentiles: ProjectedPercentiles;
    let totalYieldCents = 0n;
    let yieldBps = 0;

    const explicitProj = projectionsByMonth.get(projYM);
    if (explicitProj) {
      percentiles = {
        p10Cents: explicitProj.p10Cents,
        p50Cents: explicitProj.p50Cents,
        p90Cents: explicitProj.p90Cents,
      };
      totalYieldCents = explicitProj.p50Cents;
      yieldBps =
        explicitProj.expectedYieldBps ??
        (totalPortfolioNetCents > 0n
          ? Number((explicitProj.p50Cents * 10000n) / totalPortfolioNetCents)
          : 0);
    } else if (input.expectedRateCurve) {
      const { p10RateBps, p50RateBps, p90RateBps } = input.expectedRateCurve;
      const baseCents = input.startingPortfolioCents ?? totalPortfolioNetCents;
      const p10Cents = (baseCents * BigInt(p10RateBps)) / (12n * 10000n);
      const p50Cents = (baseCents * BigInt(p50RateBps)) / (12n * 10000n);
      const p90Cents = (baseCents * BigInt(p90RateBps)) / (12n * 10000n);

      percentiles = { p10Cents, p50Cents, p90Cents };
      totalYieldCents = p50Cents;
      yieldBps = Math.round(p50RateBps / 12);
    } else if (totalPortfolioNetCents > 0n && weightedRateSum > 0n) {
      const avgRateBps = Number(weightedRateSum / totalPortfolioNetCents);
      const p50Cents = (totalPortfolioNetCents * BigInt(avgRateBps)) / (12n * 10000n);
      const p10Cents = (p50Cents * 75n) / 100n; // 25% lower for conservative scenario
      const p90Cents = (p50Cents * 125n) / 100n; // 25% higher for optimistic scenario

      percentiles = { p10Cents, p50Cents, p90Cents };
      totalYieldCents = p50Cents;
      yieldBps = Math.round(avgRateBps / 12);
    } else {
      percentiles = { p10Cents: 0n, p50Cents: 0n, p90Cents: 0n };
      totalYieldCents = 0n;
      yieldBps = 0;
    }

    // Projected net cashflow includes projected yield + maturities + scheduled cashflows
    let projectedCashflowCents = totalYieldCents;
    for (const ev of projEvents) {
      if (
        ev.type === "maturity" ||
        ev.type === "dividend" ||
        ev.type === "interest" ||
        ev.type === "amortization"
      ) {
        projectedCashflowCents += ev.amountCents;
      } else if (ev.type === "contribution") {
        projectedCashflowCents -= ev.amountCents;
      }
    }

    resultMonths.push({
      yearMonth: projYM,
      phase: "projected",
      totalYieldCents,
      yieldBps,
      netCashflowCents: projectedCashflowCents,
      events: projEvents,
      projectedPercentiles: percentiles,
    });
  }

  return resultMonths;
}

/**
 * Computes high-level summary statistics across all calendar months.
 */
export function summarizeBiphasicCalendar(
  months: BiphasicCalendarMonth[]
): BiphasicCalendarSummary {
  let totalRealizedYieldCents = 0n;
  let totalProjectedP50YieldCents = 0n;
  let totalMaturitiesCents = 0n;
  let realizedMonthsCount = 0;
  let projectedMonthsCount = 0;
  let totalEventsCount = 0;

  for (const m of months) {
    totalEventsCount += m.events.length;
    if (m.phase === "realized") {
      realizedMonthsCount++;
      totalRealizedYieldCents += m.totalYieldCents;
    } else {
      projectedMonthsCount++;
      totalProjectedP50YieldCents += m.totalYieldCents;
      for (const ev of m.events) {
        if (ev.type === "maturity") {
          totalMaturitiesCents += ev.amountCents;
        }
      }
    }
  }

  return {
    totalRealizedYieldCents,
    totalProjectedP50YieldCents,
    totalMaturitiesCents,
    realizedMonthsCount,
    projectedMonthsCount,
    totalEventsCount,
  };
}
