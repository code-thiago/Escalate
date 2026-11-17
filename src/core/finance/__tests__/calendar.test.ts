import { describe, it, expect } from "vitest";
import {
  buildBiphasicCalendar,
  summarizeBiphasicCalendar,
  CalendarHorizonExceededError,
  InvalidCalendarHorizonError,
  normalizeEventType,
  isYieldBearingEventType,
  addMonthsToYearMonth,
  parseYearMonth,
  formatYearMonth,
  extractYearMonthFromDate,
  extractDateString,
} from "../calendar";
import type {
  CalendarLedgerEventRecord,
  PortfolioAssetSummary,
  StochasticProjectionInput,
} from "../types";

describe("Milestone M2: Biphasic Financial Calendar Engine", () => {
  const FIXED_REF_DATE = "2026-11-15"; // Current reference date for tests (2026-11)

  describe("Invariants & DoS Guard", () => {
    it("throws CalendarHorizonExceededError when horizonMonths > 600", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 601,
          referenceDate: FIXED_REF_DATE,
        })
      ).toThrowError(CalendarHorizonExceededError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 1200,
          referenceDate: FIXED_REF_DATE,
        })
      ).toThrowError(CalendarHorizonExceededError);
    });

    it("throws InvalidCalendarHorizonError when horizonMonths is negative", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: -1,
          referenceDate: FIXED_REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);
    });

    it("throws InvalidCalendarHorizonError when horizonMonths is not an integer", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 12.5,
          referenceDate: FIXED_REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: NaN,
          referenceDate: FIXED_REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);
    });

    it("accepts maximum boundary horizonMonths = 600 (50 years)", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 600,
        referenceDate: FIXED_REF_DATE,
      });

      const projectedMonths = months.filter((m) => m.phase === "projected");
      expect(projectedMonths.length).toBe(600);
      expect(projectedMonths[0].yearMonth).toBe("2026-12");
      expect(projectedMonths[599].yearMonth).toBe("2076-11");
    });

    it("accepts minimum boundary horizonMonths = 0 (only realized phase)", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
      });

      const projectedMonths = months.filter((m) => m.phase === "projected");
      expect(projectedMonths.length).toBe(0);
      expect(months.length).toBe(1);
      expect(months[0].yearMonth).toBe("2026-11");
      expect(months[0].phase).toBe("realized");
    });
  });

  describe("Phase 1: Realized Past & Present", () => {
    it("aggregates single-month realized events in integer cents and calculates yield BPS", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-11-02",
          eventType: "DIVIDEND_JCP",
          amountCents: 45000n, // R$ 450,00
        },
        {
          eventDate: "2026-11-10",
          eventType: "COUPON",
          amountCents: 85000n, // R$ 850,00
        },
        {
          eventDate: "2026-11-05",
          eventType: "CONTRIBUTION",
          amountCents: 1000000n, // R$ 10.000,00 (contribution is not yield)
        },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
        startingPortfolioCents: 10000000n, // R$ 100.000,00
      });

      expect(months.length).toBe(1);
      const novMonth = months[0];
      expect(novMonth.yearMonth).toBe("2026-11");
      expect(novMonth.phase).toBe("realized");
      // Total yield: 45000 + 85000 = 130000n
      expect(novMonth.totalYieldCents).toBe(130000n);
      // Yield BPS: (130000 * 10000) / 10000000 = 130 bps (1.30%)
      expect(novMonth.yieldBps).toBe(130);
      // Net cashflow: +45000 + 85000 - 1000000 = -870000n
      expect(novMonth.netCashflowCents).toBe(-870000n);
      // Events count: 3
      expect(novMonth.events.length).toBe(3);
    });

    it("sorts events chronologically within a realized month", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        { eventDate: "2026-11-20", eventType: "DIVIDEND", amountCents: 1000n },
        { eventDate: "2026-11-03", eventType: "INTEREST", amountCents: 2000n },
        { eventDate: "2026-11-12", eventType: "COUPON", amountCents: 3000n },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
      });

      const events = months[0].events;
      expect(events[0].date).toBe("2026-11-03");
      expect(events[1].date).toBe("2026-11-12");
      expect(events[2].date).toBe("2026-11-20");
    });

    it("groups multi-month ledger events and fills intermediate months with zero yield", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-08-10",
          eventType: "DIVIDEND_JCP",
          amountCents: 20000n,
        },
        {
          eventDate: "2026-10-15",
          eventType: "COUPON",
          amountCents: 30000n,
        },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
      });

      // From earliest (2026-08) to reference (2026-11) is 4 contiguous months: 08, 09, 10, 11
      expect(months.length).toBe(4);
      expect(months.map((m) => m.yearMonth)).toEqual([
        "2026-08",
        "2026-09",
        "2026-10",
        "2026-11",
      ]);

      // 2026-08: has dividend
      expect(months[0].totalYieldCents).toBe(20000n);
      expect(months[0].events.length).toBe(1);

      // 2026-09: gap filled, zero yield
      expect(months[1].totalYieldCents).toBe(0n);
      expect(months[1].yieldBps).toBe(0);
      expect(months[1].events.length).toBe(0);

      // 2026-10: has coupon
      expect(months[2].totalYieldCents).toBe(30000n);
      expect(months[2].events.length).toBe(1);

      // 2026-11: current month, zero events
      expect(months[3].totalYieldCents).toBe(0n);
      expect(months[3].events.length).toBe(0);
    });

    it("correctly normalizes all uppercase schema event types to lowercase contract types", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        { eventDate: "2026-11-01", eventType: "CONTRIBUTION", amountCents: 100n },
        { eventDate: "2026-11-02", eventType: "DIVIDEND_JCP", amountCents: 100n },
        { eventDate: "2026-11-03", eventType: "COUPON", amountCents: 100n },
        { eventDate: "2026-11-04", eventType: "INTEREST", amountCents: 100n },
        { eventDate: "2026-11-05", eventType: "AMORTIZATION", amountCents: 100n },
        { eventDate: "2026-11-06", eventType: "MATURITY", amountCents: 100n },
        { eventDate: "2026-11-07", eventType: "DAILY_YIELD_SNAPSHOT", amountCents: 100n },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
      });

      const events = months[0].events;
      expect(events[0].type).toBe("contribution");
      expect(events[1].type).toBe("dividend");
      expect(events[2].type).toBe("interest");
      expect(events[3].type).toBe("interest");
      expect(events[4].type).toBe("amortization");
      expect(events[5].type).toBe("maturity");
      expect(events[6].type).toBe("interest");
    });

    it("handles negative yield (market losses) with negative bigint cents and negative BPS", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-11-05",
          eventType: "DAILY_YIELD_SNAPSHOT",
          amountCents: -50000n, // Loss of R$ 500,00
          yieldBps: -50,
        },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: FIXED_REF_DATE,
        startingPortfolioCents: 10000000n, // R$ 100.000,00
      });

      expect(months[0].totalYieldCents).toBe(-50000n);
      expect(months[0].yieldBps).toBe(-50);
    });
  });

  describe("Phase 2: Projected Future", () => {
    it("generates exactly horizonMonths projected months starting from referenceDate + 1", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 12,
        referenceDate: "2026-11-15",
      });

      const projected = months.filter((m) => m.phase === "projected");
      expect(projected.length).toBe(12);
      expect(projected[0].yearMonth).toBe("2026-12");
      expect(projected[11].yearMonth).toBe("2027-11");
    });

    it("ingests pre-computed stochastic percentiles (P10, P50, P90)", () => {
      const stochasticProjections: StochasticProjectionInput[] = [
        {
          yearMonth: "2026-12",
          p10Cents: 75000n,
          p50Cents: 110000n,
          p90Cents: 155000n,
          expectedYieldBps: 110,
        },
        {
          yearMonth: "2027-01",
          p10Cents: 80000n,
          p50Cents: 115000n,
          p90Cents: 160000n,
          expectedYieldBps: 115,
        },
      ];

      const months = buildBiphasicCalendar({
        stochasticProjections,
        horizonMonths: 2,
        referenceDate: "2026-11-15",
      });

      const decMonth = months.find((m) => m.yearMonth === "2026-12")!;
      expect(decMonth.phase).toBe("projected");
      expect(decMonth.totalYieldCents).toBe(110000n);
      expect(decMonth.yieldBps).toBe(110);
      expect(decMonth.projectedPercentiles).toEqual({
        p10Cents: 75000n,
        p50Cents: 110000n,
        p90Cents: 155000n,
      });

      // Verify invariant P10 <= P50 <= P90
      expect(decMonth.projectedPercentiles!.p10Cents <= decMonth.projectedPercentiles!.p50Cents).toBe(true);
      expect(decMonth.projectedPercentiles!.p50Cents <= decMonth.projectedPercentiles!.p90Cents).toBe(true);
    });

    it("ingests known asset maturities from portfolio_asset into projected months", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          id: "asset-cdb-master",
          tickerOrCode: "CDB-MASTER-2027",
          assetName: "CDB Banco Master 120% CDI",
          currentNetCents: 5000000n, // R$ 50.000,00
          maturityDate: "2027-03-15",
        },
        {
          id: "asset-lci-btg",
          tickerOrCode: "LCI-BTG-2027",
          assetName: "LCI BTG Pactual 95% CDI",
          currentNetCents: 3000000n, // R$ 30.000,00
          maturityDate: "2027-03-22",
        },
        {
          id: "asset-past-bond",
          tickerOrCode: "CDB-EXPIRED",
          assetName: "CDB Vencido",
          currentNetCents: 1000000n,
          maturityDate: "2026-05-10", // Past maturity, should be ignored
        },
        {
          id: "asset-equity-petr4",
          tickerOrCode: "PETR4",
          assetName: "Petrobras PN",
          currentNetCents: 2000000n,
          maturityDate: null, // No maturity, should be ignored
        },
      ];

      const months = buildBiphasicCalendar({
        portfolioAssets,
        horizonMonths: 6, // 2026-12 to 2027-05
        referenceDate: "2026-11-15",
      });

      const march2027 = months.find((m) => m.yearMonth === "2027-03")!;
      expect(march2027).toBeDefined();
      expect(march2027.phase).toBe("projected");
      expect(march2027.events.length).toBe(2);

      const [ev1, ev2] = march2027.events;
      expect(ev1.type).toBe("maturity");
      expect(ev1.date).toBe("2027-03-15");
      expect(ev1.amountCents).toBe(5000000n);

      expect(ev2.type).toBe("maturity");
      expect(ev2.date).toBe("2027-03-22");
      expect(ev2.amountCents).toBe(3000000n);

      // Verify that past maturity was NOT included in any projected month
      const allProjectedEvents = months
        .filter((m) => m.phase === "projected")
        .flatMap((m) => m.events);
      expect(allProjectedEvents.some((e) => e.date === "2026-05-10")).toBe(false);
    });

    it("includes scheduled amortization inflows in projected netCashflowCents", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-12-10",
          eventType: "AMORTIZATION",
          amountCents: 500000n, // R$ 5,000.00 amortization inflow
        },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 1,
        referenceDate: "2026-11-15",
      });

      const dec2026 = months.find((m) => m.yearMonth === "2026-12")!;
      expect(dec2026).toBeDefined();
      expect(dec2026.phase).toBe("projected");
      expect(dec2026.events.some((e) => e.type === "amortization")).toBe(true);
      expect(dec2026.netCashflowCents).toBeGreaterThanOrEqual(500000n);
    });

    it("projects future yield using expectedRateCurve when explicit projections are absent", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 3,
        referenceDate: "2026-11-15",
        startingPortfolioCents: 12000000n, // R$ 120.000,00
        expectedRateCurve: {
          p10RateBps: 800,  // 8.00% p.a.
          p50RateBps: 1200, // 12.00% p.a. (1.00% monthly)
          p90RateBps: 1600, // 16.00% p.a.
        },
      });

      const projected = months.filter((m) => m.phase === "projected");
      expect(projected.length).toBe(3);

      for (const m of projected) {
        // Monthly P50 yield: (12000000 * 1200) / (12 * 10000) = 120000n (R$ 1.200,00)
        expect(m.totalYieldCents).toBe(120000n);
        expect(m.yieldBps).toBe(100); // 1200 / 12 = 100 bps
        expect(m.projectedPercentiles).toEqual({
          p10Cents: 80000n,
          p50Cents: 120000n,
          p90Cents: 160000n,
        });
      }
    });

    it("projects future yield from portfolio asset weighted rates when no curve or projections provided", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          currentNetCents: 6000000n,
          annualRateBps: 1200, // 12% on 60k
        },
        {
          currentNetCents: 4000000n,
          annualRateBps: 1000, // 10% on 40k
        },
      ];
      // Total: 100k. Weighted rate: (60*12 + 40*10)/100 = 1120 bps (11.20% p.a.)

      const months = buildBiphasicCalendar({
        portfolioAssets,
        horizonMonths: 2,
        referenceDate: "2026-11-15",
      });

      const decMonth = months.find((m) => m.yearMonth === "2026-12")!;
      // Monthly expected yield: (10000000 * 1120) / (12 * 10000) = 93333n
      expect(decMonth.totalYieldCents).toBe(93333n);
      expect(decMonth.yieldBps).toBe(Math.round(1120 / 12));
      expect(decMonth.projectedPercentiles!.p50Cents).toBe(93333n);
    });
  });

  describe("Temporal Boundary & Chronological Ordering", () => {
    it("strictly separates realized months (<= refDate) from projected months (> refDate)", () => {
      const months = buildBiphasicCalendar({
        startYearMonth: "2026-09",
        horizonMonths: 3,
        referenceDate: "2026-11-15",
      });

      // Months should be: 2026-09, 2026-10, 2026-11 (realized) and 2026-12, 2027-01, 2027-02 (projected)
      expect(months.map((m) => m.yearMonth)).toEqual([
        "2026-09",
        "2026-10",
        "2026-11",
        "2026-12",
        "2027-01",
        "2027-02",
      ]);

      expect(months.slice(0, 3).every((m) => m.phase === "realized")).toBe(true);
      expect(months.slice(3).every((m) => m.phase === "projected")).toBe(true);
    });

    it("handles year transition from December to January across multiple years", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 14,
        referenceDate: "2026-11-30",
      });

      const yms = months.map((m) => m.yearMonth);
      expect(yms).toContain("2026-12");
      expect(yms).toContain("2027-01");
      expect(yms).toContain("2027-12");
      expect(yms).toContain("2028-01");
    });

    it("handles leap year month boundary (February 2028)", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 16,
        referenceDate: "2026-11-15",
      });

      const feb2028 = months.find((m) => m.yearMonth === "2028-02");
      expect(feb2028).toBeDefined();
      expect(feb2028?.phase).toBe("projected");
    });
  });

  describe("Mathematical Soundness & Edge Cases", () => {
    it("handles empty input without crashing (zero division protection)", () => {
      const months = buildBiphasicCalendar({
        ledgerEvents: [],
        portfolioAssets: [],
        horizonMonths: 3,
        referenceDate: "2026-11-15",
        startingPortfolioCents: 0n,
      });

      expect(months.length).toBe(4); // 1 realized (2026-11) + 3 projected
      for (const m of months) {
        expect(m.totalYieldCents).toBe(0n);
        expect(m.yieldBps).toBe(0);
        expect(m.events).toEqual([]);
      }
    });

    it("handles massive wealth amounts (R$ 10 billion in cents) without integer overflow", () => {
      const hugeCents = 10_000_000_000_00n; // R$ 10 billion in cents (10^12 cents)
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-11-10",
          eventType: "COUPON",
          amountCents: 10_000_000_00n, // R$ 10 million (0.10% = 10 bps)
        },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        horizonMonths: 0,
        referenceDate: "2026-11-15",
        startingPortfolioCents: hugeCents,
      });

      expect(months[0].totalYieldCents).toBe(10_000_000_00n);
      expect(months[0].yieldBps).toBe(10); // 0.10%
    });

    it("is immune to local timezone shift when parsing ISO dates", () => {
      // Midnight UTC date
      const dateStr = "2026-11-01T00:00:00.000Z";
      expect(extractYearMonthFromDate(dateStr)).toBe("2026-11");
      expect(extractDateString(dateStr)).toBe("2026-11-01");
    });

    it("computes accurate summary statistics via summarizeBiphasicCalendar", () => {
      const ledgerEvents: CalendarLedgerEventRecord[] = [
        { eventDate: "2026-11-02", eventType: "DIVIDEND", amountCents: 5000n },
        { eventDate: "2026-11-08", eventType: "INTEREST", amountCents: 15000n },
      ];

      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          currentNetCents: 2000000n,
          maturityDate: "2027-01-15",
        },
      ];

      const stochasticProjections: StochasticProjectionInput[] = [
        { yearMonth: "2026-12", p10Cents: 10000n, p50Cents: 20000n, p90Cents: 30000n },
        { yearMonth: "2027-01", p10Cents: 12000n, p50Cents: 22000n, p90Cents: 32000n },
      ];

      const months = buildBiphasicCalendar({
        ledgerEvents,
        portfolioAssets,
        stochasticProjections,
        horizonMonths: 2,
        referenceDate: "2026-11-15",
      });

      const summary = summarizeBiphasicCalendar(months);
      expect(summary.realizedMonthsCount).toBe(1);
      expect(summary.projectedMonthsCount).toBe(2);
      expect(summary.totalRealizedYieldCents).toBe(20000n);
      expect(summary.totalProjectedP50YieldCents).toBe(42000n); // 20000 + 22000
      expect(summary.totalMaturitiesCents).toBe(2000000n);
      expect(summary.totalEventsCount).toBe(3); // 2 realized + 1 maturity in Jan 2027
    });

    it("evaluates high-volume inputs efficiently (< 50ms)", () => {
      // 1,000 ledger events across 60 historical months
      const events: CalendarLedgerEventRecord[] = [];
      for (let i = 0; i < 1000; i++) {
        const monthOffset = i % 60;
        const ym = addMonthsToYearMonth("2021-11", monthOffset);
        events.push({
          eventDate: `${ym}-10`,
          eventType: i % 2 === 0 ? "DIVIDEND" : "INTEREST",
          amountCents: BigInt(1000 + i),
        });
      }

      const start = performance.now();
      const months = buildBiphasicCalendar({
        ledgerEvents: events,
        horizonMonths: 600,
        referenceDate: "2026-11-15",
      });
      const durationMs = performance.now() - start;

      expect(months.length).toBeGreaterThan(600);
      expect(durationMs).toBeLessThan(50);
    });
  });

  describe("Pure Utility Functions", () => {
    it("parses and formats yearMonth accurately", () => {
      expect(parseYearMonth("2026-11")).toEqual({ year: 2026, month: 11 });
      expect(formatYearMonth(2026, 11)).toBe("2026-11");
      expect(formatYearMonth(2027, 4)).toBe("2027-04");
    });

    it("adds positive and negative months accurately", () => {
      expect(addMonthsToYearMonth("2026-11", 1)).toBe("2026-12");
      expect(addMonthsToYearMonth("2026-11", 2)).toBe("2027-01");
      expect(addMonthsToYearMonth("2026-11", 14)).toBe("2028-01");
      expect(addMonthsToYearMonth("2026-11", -1)).toBe("2026-10");
      expect(addMonthsToYearMonth("2026-01", -1)).toBe("2025-12");
    });

    it("identifies yield bearing event types correctly", () => {
      expect(isYieldBearingEventType("DIVIDEND_JCP")).toBe(true);
      expect(isYieldBearingEventType("dividend")).toBe(true);
      expect(isYieldBearingEventType("COUPON")).toBe(true);
      expect(isYieldBearingEventType("interest")).toBe(true);
      expect(isYieldBearingEventType("DAILY_YIELD_SNAPSHOT")).toBe(true);
      expect(isYieldBearingEventType("CONTRIBUTION")).toBe(false);
      expect(isYieldBearingEventType("AMORTIZATION")).toBe(false);
      expect(isYieldBearingEventType("MATURITY")).toBe(false);
    });

    it("normalizes diverse event type strings into 5 contract types", () => {
      expect(normalizeEventType("CONTRIBUTION")).toBe("contribution");
      expect(normalizeEventType("DIVIDEND_JCP")).toBe("dividend");
      expect(normalizeEventType("COUPON")).toBe("interest");
      expect(normalizeEventType("INTEREST")).toBe("interest");
      expect(normalizeEventType("AMORTIZATION")).toBe("amortization");
      expect(normalizeEventType("MATURITY")).toBe("maturity");
      expect(normalizeEventType("DAILY_YIELD_SNAPSHOT")).toBe("interest");
    });
  });
});
