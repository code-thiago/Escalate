import { describe, it, expect } from "vitest";
import {
  buildBiphasicCalendar,
  summarizeBiphasicCalendar,
  CalendarHorizonExceededError,
  InvalidCalendarHorizonError,
} from "../src/core/finance/calendar";
import { aggregateHistoricalYield } from "../src/core/finance/yield";
import type {
  CalendarLedgerEvent,
  PortfolioAssetSummary,
  StochasticProjectionInput,
  ExpectedRateCurveInput,
} from "../src/core/finance/types";

describe("Milestone M2 Empirical Challenger Stress Harness", () => {
  const REF_DATE = "2026-11-15"; // Reference month: 2026-11

  describe("1. buildBiphasicCalendar: Horizon Limits & DoS Guard", () => {
    it("accepts horizonMonths = 600 and generates exactly 600 projected months", () => {
      const months = buildBiphasicCalendar({
        horizonMonths: 600,
        referenceDate: REF_DATE,
      });

      const projected = months.filter((m) => m.phase === "projected");
      expect(projected.length).toBe(600);
      expect(projected[0].yearMonth).toBe("2026-12");
      expect(projected[599].yearMonth).toBe("2076-11");
    });

    it("throws CalendarHorizonExceededError when horizonMonths = 601", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 601,
          referenceDate: REF_DATE,
        })
      ).toThrowError(CalendarHorizonExceededError);
    });

    it("throws CalendarHorizonExceededError on extreme horizon values (e.g. 1000, 10000)", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 1000,
          referenceDate: REF_DATE,
        })
      ).toThrowError(CalendarHorizonExceededError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 10000,
          referenceDate: REF_DATE,
        })
      ).toThrowError(CalendarHorizonExceededError);
    });

    it("throws InvalidCalendarHorizonError on negative horizon values", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: -1,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: -600,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);
    });

    it("throws InvalidCalendarHorizonError on non-integer or special float values", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: 12.5,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: NaN,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: Infinity,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: -Infinity,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);
    });

    it("throws InvalidCalendarHorizonError when horizonMonths is non-numeric", () => {
      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: "12" as unknown as number,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: null as unknown as number,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);

      expect(() =>
        buildBiphasicCalendar({
          horizonMonths: undefined as unknown as number,
          referenceDate: REF_DATE,
        })
      ).toThrowError(InvalidCalendarHorizonError);
    });
  });

  describe("2. buildBiphasicCalendar: Asset Maturity Injection", () => {
    it("injects future fixed income asset maturities into corresponding projected months", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          id: "asset-cdb-01",
          tickerOrCode: "CDB-DI-2027",
          assetName: "CDB Banco Master 120% CDI",
          currentNetCents: 5000000n, // R$ 50.000,00
          maturityDate: "2027-03-20",
          annualRateBps: 1320,
        },
        {
          id: "asset-lci-01",
          tickerOrCode: "LCI-ABC-2027",
          assetName: "LCI Banco ABC 95% CDI",
          currentNetCents: 3000000n, // R$ 30.000,00
          maturityDate: "2027-03-10",
          annualRateBps: 1100,
        },
        {
          id: "asset-tesouro-01",
          tickerOrCode: "NTN-B-2028",
          assetName: "Tesouro IPCA+ 2028",
          currentNetCents: 10000000n, // R$ 100.000,00
          maturityDate: "2028-08-15",
          annualRateBps: 650,
        },
      ];

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 24, // 2026-12 to 2028-11
        portfolioAssets,
      });

      // Verify March 2027 has two maturity events sorted chronologically
      const mar2027 = months.find((m) => m.yearMonth === "2027-03");
      expect(mar2027).toBeDefined();
      expect(mar2027!.phase).toBe("projected");
      expect(mar2027!.events.length).toBe(2);

      const [ev1, ev2] = mar2027!.events;
      expect(ev1.date).toBe("2027-03-10");
      expect(ev1.type).toBe("maturity");
      expect(ev1.amountCents).toBe(3000000n);
      expect(ev1.tickerOrCode).toBe("LCI-ABC-2027");

      expect(ev2.date).toBe("2027-03-20");
      expect(ev2.type).toBe("maturity");
      expect(ev2.amountCents).toBe(5000000n);
      expect(ev2.tickerOrCode).toBe("CDB-DI-2027");

      // Verify net cashflow includes both maturities (8000000n) plus projected monthly yield
      expect(mar2027!.netCashflowCents).toBeGreaterThanOrEqual(8000000n);

      // Verify August 2028 has the NTN-B maturity
      const aug2028 = months.find((m) => m.yearMonth === "2028-08");
      expect(aug2028).toBeDefined();
      expect(aug2028!.events.length).toBe(1);
      expect(aug2028!.events[0].type).toBe("maturity");
      expect(aug2028!.events[0].amountCents).toBe(10000000n);
      expect(aug2028!.events[0].tickerOrCode).toBe("NTN-B-2028");
    });

    it("does not inject maturities from past or current months into future projected months", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          id: "past-asset",
          tickerOrCode: "CDB-PAST",
          currentNetCents: 1000000n,
          maturityDate: "2026-10-15", // Past relative to REF_DATE (2026-11)
        },
        {
          id: "current-asset",
          tickerOrCode: "CDB-CURRENT",
          currentNetCents: 2000000n,
          maturityDate: "2026-11-20", // Current month relative to REF_DATE (2026-11)
        },
      ];

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 6,
        portfolioAssets,
      });

      const projected = months.filter((m) => m.phase === "projected");
      const allProjectedEvents = projected.flatMap((m) => m.events);
      const maturityEvents = allProjectedEvents.filter((e) => e.type === "maturity");
      expect(maturityEvents.length).toBe(0);
    });

    it("does not crash when maturity is beyond the requested horizon", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          id: "far-asset",
          tickerOrCode: "NTN-B-2035",
          currentNetCents: 5000000n,
          maturityDate: "2035-05-15", // Beyond 12-month horizon
        },
      ];

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 12,
        portfolioAssets,
      });

      expect(months.filter((m) => m.phase === "projected").length).toBe(12);
      const allEvents = months.flatMap((m) => m.events);
      expect(allEvents.filter((e) => e.type === "maturity").length).toBe(0);
    });
  });

  describe("3. buildBiphasicCalendar: Stochastic Percentile Ordering", () => {
    it("verifies p10Cents <= p50Cents <= p90Cents across all months with expectedRateCurve", () => {
      const expectedRateCurve: ExpectedRateCurveInput = {
        p10RateBps: 800,  // 8.00% conservative
        p50RateBps: 1150, // 11.50% median
        p90RateBps: 1500, // 15.00% optimistic
      };

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 36,
        startingPortfolioCents: 100000000n, // R$ 1.000.000,00
        expectedRateCurve,
      });

      const projected = months.filter((m) => m.phase === "projected");
      expect(projected.length).toBe(36);

      for (const m of projected) {
        expect(m.projectedPercentiles).toBeDefined();
        const { p10Cents, p50Cents, p90Cents } = m.projectedPercentiles!;
        expect(p10Cents <= p50Cents).toBe(true);
        expect(p50Cents <= p90Cents).toBe(true);
        expect(p10Cents).toBeGreaterThan(0n);
      }
    });

    it("verifies p10Cents <= p50Cents <= p90Cents across all months with weighted portfolio assets", () => {
      const portfolioAssets: PortfolioAssetSummary[] = [
        {
          id: "asset-1",
          currentNetCents: 60000000n, // R$ 600.000,00
          annualRateBps: 1200,
        },
        {
          id: "asset-2",
          currentNetCents: 40000000n, // R$ 400.000,00
          annualRateBps: 1000,
        },
      ];

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 24,
        portfolioAssets,
      });

      const projected = months.filter((m) => m.phase === "projected");
      expect(projected.length).toBe(24);

      for (const m of projected) {
        expect(m.projectedPercentiles).toBeDefined();
        const { p10Cents, p50Cents, p90Cents } = m.projectedPercentiles!;
        expect(p10Cents <= p50Cents).toBe(true);
        expect(p50Cents <= p90Cents).toBe(true);
      }
    });

    it("verifies p10Cents <= p50Cents <= p90Cents when explicit stochastic projections are passed", () => {
      const stochasticProjections: StochasticProjectionInput[] = [
        {
          yearMonth: "2026-12",
          p10Cents: 150000n,
          p50Cents: 200000n,
          p90Cents: 280000n,
          expectedYieldBps: 100,
        },
        {
          yearMonth: "2027-01",
          p10Cents: 160000n,
          p50Cents: 210000n,
          p90Cents: 295000n,
          expectedYieldBps: 105,
        },
      ];

      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 2,
        stochasticProjections,
      });

      const projected = months.filter((m) => m.phase === "projected");
      for (const m of projected) {
        expect(m.projectedPercentiles).toBeDefined();
        const { p10Cents, p50Cents, p90Cents } = m.projectedPercentiles!;
        expect(p10Cents <= p50Cents).toBe(true);
        expect(p50Cents <= p90Cents).toBe(true);
      }
    });

    it("defaults to 0n <= 0n <= 0n when no rates, curves, or projections are supplied", () => {
      const months = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 6,
      });

      const projected = months.filter((m) => m.phase === "projected");
      for (const m of projected) {
        expect(m.projectedPercentiles).toEqual({
          p10Cents: 0n,
          p50Cents: 0n,
          p90Cents: 0n,
        });
      }
    });
  });

  describe("4. aggregateHistoricalYield: Strict Non-Realized Event Exclusion", () => {
    it("strictly excludes events with eventPhase !== 'REALIZED'", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "ev-realized-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-10-05",
          eventPhase: "REALIZED",
          eventType: "DIVIDEND_JCP",
          amountCents: 50000n,
          yieldBps: 50,
        },
        {
          id: "ev-projected-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-12-05",
          eventPhase: "PROJECTED",
          eventType: "DIVIDEND_JCP",
          amountCents: 99999999n,
          yieldBps: 999,
        },
        {
          id: "ev-projected-2",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-2",
          eventDate: "2027-01-10",
          eventPhase: "PROJECTED",
          eventType: "COUPON",
          amountCents: 50000000n,
          yieldBps: 500,
        },
        {
          id: "ev-realized-2",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-2",
          eventDate: "2026-10-20",
          eventPhase: "REALIZED",
          eventType: "COUPON",
          amountCents: 30000n,
          yieldBps: 30,
        },
      ];

      const result = aggregateHistoricalYield(events);

      expect(result.eventCount).toBe(2);
      expect(result.totalRealizedYieldCents).toBe(80000n); // 50000n + 30000n
      expect(result.totalDividendsCents).toBe(50000n);
      expect(result.totalCouponsCents).toBe(30000n);

      // Verify no projected month appears in byMonth
      expect(result.byMonth.some((m) => m.yearMonth === "2026-12")).toBe(false);
      expect(result.byMonth.some((m) => m.yearMonth === "2027-01")).toBe(false);
      expect(result.byMonth.length).toBe(1);
      expect(result.byMonth[0].yearMonth).toBe("2026-10");
    });

    it("returns zero aggregation when all events are PROJECTED", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "ev-proj-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-12-01",
          eventPhase: "PROJECTED",
          eventType: "INTEREST",
          amountCents: 100000n,
          yieldBps: 100,
        },
      ];

      const result = aggregateHistoricalYield(events);
      expect(result.eventCount).toBe(0);
      expect(result.totalRealizedYieldCents).toBe(0n);
      expect(result.totalContributionsCents).toBe(0n);
      expect(result.realizedYieldBps).toBe(0);
      expect(result.byMonth.length).toBe(0);
    });
  });

  describe("5. aggregateHistoricalYield: Benchmark Calculations", () => {
    it("computes spread and percentage comparisons accurately against CDI and IPCA", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "ev-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-09-15",
          eventPhase: "REALIZED",
          eventType: "CONTRIBUTION",
          amountCents: 10000000n, // R$ 100.000,00
          yieldBps: 0,
        },
        {
          id: "ev-2",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-10-15",
          eventPhase: "REALIZED",
          eventType: "INTEREST",
          amountCents: 145000n, // R$ 1.450,00 yield -> 145 bps (1.45%)
          yieldBps: 145,
        },
      ];

      const result = aggregateHistoricalYield(events, {
        totalInvestedCents: 10000000n,
        benchmarks: {
          cdiBps: 120, // CDI in period: 120 bps (1.20%)
          ipcaBps: 45, // IPCA in period: 45 bps (0.45%)
        },
      });

      // realizedYieldBps = (145000 * 10000) / 10000000 = 145 bps
      expect(result.realizedYieldBps).toBe(145);

      const { benchmarks } = result;
      expect(benchmarks.cdiBps).toBe(120);
      expect(benchmarks.ipcaBps).toBe(45);

      // Spreads:
      // spreadOverCdiBps = 145 - 120 = 25 bps
      expect(benchmarks.spreadOverCdiBps).toBe(25);
      // spreadOverIpcaBps = 145 - 45 = 100 bps
      expect(benchmarks.spreadOverIpcaBps).toBe(100);

      // Percentages:
      // percentOfCdiBps = Math.round((145 * 10000) / 120) = Math.round(1450000 / 120) = 12083 bps (120.83% of CDI)
      expect(benchmarks.percentOfCdiBps).toBe(12083);
      // percentOfIpcaBps = Math.round((145 * 10000) / 45) = Math.round(1450000 / 45) = 32222 bps (322.22% of IPCA)
      expect(benchmarks.percentOfIpcaBps).toBe(32222);
    });

    it("handles zero or missing benchmark inputs without division by zero", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "ev-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-10-15",
          eventPhase: "REALIZED",
          eventType: "INTEREST",
          amountCents: 10000n,
          yieldBps: 100,
        },
      ];

      const result = aggregateHistoricalYield(events, {
        totalInvestedCents: 1000000n,
        benchmarks: {
          cdiBps: 0,
          ipcaBps: 0,
        },
      });

      expect(result.benchmarks.percentOfCdiBps).toBe(0);
      expect(result.benchmarks.percentOfIpcaBps).toBe(0);
      expect(result.benchmarks.spreadOverCdiBps).toBe(100);
      expect(result.benchmarks.spreadOverIpcaBps).toBe(100);
    });

    it("handles negative realized yield (capital loss) against benchmarks", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "ev-1",
          userId: "user-1",
          institutionId: "inst-1",
          assetId: "asset-1",
          eventDate: "2026-10-15",
          eventPhase: "REALIZED",
          eventType: "INTEREST",
          amountCents: -50000n, // Net loss of R$ 500,00
          yieldBps: -50,
        },
      ];

      const result = aggregateHistoricalYield(events, {
        totalInvestedCents: 10000000n, // R$ 100.000,00
        benchmarks: {
          cdiBps: 100,
          ipcaBps: 50,
        },
      });

      // realizedYieldBps = (-50000 * 10000) / 10000000 = -50 bps
      expect(result.realizedYieldBps).toBe(-50);
      expect(result.benchmarks.spreadOverCdiBps).toBe(-150); // -50 - 100 = -150
      expect(result.benchmarks.spreadOverIpcaBps).toBe(-100); // -50 - 50 = -100
      // percentOfCdiBps = Math.round((-50 * 10000) / 100) = -5000 bps (-50% of CDI)
      expect(result.benchmarks.percentOfCdiBps).toBe(-5000);
    });
  });
});
