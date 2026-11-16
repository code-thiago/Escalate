import { describe, it, expect } from "vitest";
import { aggregateHistoricalYield } from "../yield";
import type { CalendarLedgerEvent } from "../types";

describe("Historical Realized Yield Aggregator (yield.ts)", () => {
  const baseUserId = "user-uuid-123";

  it("handles empty events array with zero values and safe benchmark defaults", () => {
    const result = aggregateHistoricalYield([], {
      benchmarks: { cdiBps: 1050, ipcaBps: 450 },
    });

    expect(result.totalRealizedYieldCents).toBe(0n);
    expect(result.totalContributionsCents).toBe(0n);
    expect(result.totalDividendsCents).toBe(0n);
    expect(result.totalCouponsCents).toBe(0n);
    expect(result.totalInterestCents).toBe(0n);
    expect(result.totalAmortizationsCents).toBe(0n);
    expect(result.eventCount).toBe(0);
    expect(result.realizedYieldBps).toBe(0);
    expect(result.byMonth).toEqual([]);
    expect(result.byEventType).toEqual({});
    expect(result.benchmarks.cdiBps).toBe(1050);
    expect(result.benchmarks.ipcaBps).toBe(450);
    expect(result.benchmarks.spreadOverCdiBps).toBe(-1050);
    expect(result.benchmarks.percentOfCdiBps).toBe(0);
  });

  it("strictly filters out projected future events from historical realized yield", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-1",
        userId: baseUserId,
        assetId: "asset-1",
        eventDate: "2026-01-15",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 50000n, // R$ 500.00
        yieldBps: 50,
      },
      {
        id: "ev-2",
        userId: baseUserId,
        assetId: "asset-1",
        eventDate: "2026-06-15",
        eventPhase: "PROJECTED", // Future projected dividend
        eventType: "DIVIDEND_JCP",
        amountCents: 75000n,
        yieldBps: 75,
      },
    ];

    const result = aggregateHistoricalYield(events);

    expect(result.eventCount).toBe(1);
    expect(result.totalRealizedYieldCents).toBe(50000n);
    expect(result.totalDividendsCents).toBe(50000n);
  });

  it("distinguishes contributions from yield income events", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-c1",
        userId: baseUserId,
        assetId: null,
        eventDate: "2026-01-05",
        eventPhase: "REALIZED",
        eventType: "CONTRIBUTION",
        amountCents: 10000000n, // R$ 100,000.00 initial capital
        yieldBps: 0,
      },
      {
        id: "ev-d1",
        userId: baseUserId,
        assetId: "asset-petr4",
        eventDate: "2026-01-20",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 350000n, // R$ 3,500.00 dividend
        yieldBps: 350,
      },
      {
        id: "ev-c2",
        userId: baseUserId,
        assetId: "asset-ntnb",
        eventDate: "2026-02-15",
        eventPhase: "REALIZED",
        eventType: "COUPON",
        amountCents: 250000n, // R$ 2,500.00 coupon
        yieldBps: 250,
      },
      {
        id: "ev-a1",
        userId: baseUserId,
        assetId: "asset-cri",
        eventDate: "2026-02-25",
        eventPhase: "REALIZED",
        eventType: "AMORTIZATION",
        amountCents: 1000000n, // R$ 10,000.00 amortization
        yieldBps: 0,
      },
    ];

    const result = aggregateHistoricalYield(events);

    expect(result.totalContributionsCents).toBe(10000000n);
    expect(result.totalRealizedYieldCents).toBe(600000n); // R$ 3,500 + R$ 2,500 = R$ 6,000.00
    expect(result.totalDividendsCents).toBe(350000n);
    expect(result.totalCouponsCents).toBe(250000n);
    expect(result.totalAmortizationsCents).toBe(1000000n);
    // Relative to contributions: (600,000 * 10,000) / 10,000,000 = 600 bps (6.00%)
    expect(result.realizedYieldBps).toBe(600);
  });

  it("calculates comparative metrics against CDI and IPCA benchmarks accurately", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-1",
        userId: baseUserId,
        assetId: null,
        eventDate: "2026-01-01",
        eventPhase: "REALIZED",
        eventType: "CONTRIBUTION",
        amountCents: 10000000n, // R$ 100,000.00
        yieldBps: 0,
      },
      {
        id: "ev-2",
        userId: baseUserId,
        assetId: "asset-cdb",
        eventDate: "2026-12-31",
        eventPhase: "REALIZED",
        eventType: "INTEREST",
        amountCents: 1200000n, // R$ 12,000.00 (12.00% = 1200 bps)
        yieldBps: 1200,
      },
    ];

    // Benchmark: CDI 10.00% (1000 bps), IPCA 4.00% (400 bps)
    const result = aggregateHistoricalYield(events, {
      benchmarks: { cdiBps: 1000, ipcaBps: 400 },
    });

    expect(result.realizedYieldBps).toBe(1200);

    // Spread over CDI: 1200 - 1000 = +200 bps (+2.00%)
    expect(result.benchmarks.spreadOverCdiBps).toBe(200);

    // Percent of CDI: (1200 * 10000) / 1000 = 12000 bps (120.00% do CDI)
    expect(result.benchmarks.percentOfCdiBps).toBe(12000);

    // Spread over IPCA (Real return): 1200 - 400 = +800 bps (+8.00% real)
    expect(result.benchmarks.spreadOverIpcaBps).toBe(800);

    // Percent of IPCA: (1200 * 10000) / 400 = 30000 bps (300.00% do IPCA)
    expect(result.benchmarks.percentOfIpcaBps).toBe(30000);
  });

  it("supports explicit invested capital base in options", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-y1",
        userId: baseUserId,
        assetId: "asset-fii",
        eventDate: "2026-03-10",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 200000n, // R$ 2,000.00
        yieldBps: 0,
      },
    ];

    // Explicit invested capital: R$ 50,000.00 (5,000,000 cents)
    // Yield: (200,000 * 10,000) / 5,000,000 = 400 bps (4.00%)
    const result = aggregateHistoricalYield(events, {
      totalInvestedCents: 5000000n,
    });

    expect(result.totalRealizedYieldCents).toBe(200000n);
    expect(result.realizedYieldBps).toBe(400);
  });

  it("groups events chronologically into monthly summaries", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-m1-c",
        userId: baseUserId,
        assetId: null,
        eventDate: "2026-01-02",
        eventPhase: "REALIZED",
        eventType: "CONTRIBUTION",
        amountCents: 5000000n,
        yieldBps: 0,
      },
      {
        id: "ev-m1-y",
        userId: baseUserId,
        assetId: "asset-1",
        eventDate: "2026-01-20",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 100000n,
        yieldBps: 200,
      },
      {
        id: "ev-m2-y",
        userId: baseUserId,
        assetId: "asset-1",
        eventDate: "2026-02-18",
        eventPhase: "REALIZED",
        eventType: "COUPON",
        amountCents: 150000n,
        yieldBps: 300,
      },
    ];

    const result = aggregateHistoricalYield(events);

    expect(result.byMonth).toHaveLength(2);
    expect(result.byMonth[0].yearMonth).toBe("2026-01");
    expect(result.byMonth[0].contributionsCents).toBe(5000000n);
    expect(result.byMonth[0].yieldCents).toBe(100000n);
    expect(result.byMonth[0].eventCount).toBe(2);

    expect(result.byMonth[1].yearMonth).toBe("2026-02");
    expect(result.byMonth[1].contributionsCents).toBe(0n);
    expect(result.byMonth[1].yieldCents).toBe(150000n);
    expect(result.byMonth[1].eventCount).toBe(1);
  });

  it("builds detailed event type distribution breakdown", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-1",
        userId: baseUserId,
        assetId: "a1",
        eventDate: "2026-01-10",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 50000n,
        yieldBps: 50,
      },
      {
        id: "ev-2",
        userId: baseUserId,
        assetId: "a2",
        eventDate: "2026-01-15",
        eventPhase: "REALIZED",
        eventType: "DIVIDEND_JCP",
        amountCents: 30000n,
        yieldBps: 30,
      },
      {
        id: "ev-3",
        userId: baseUserId,
        assetId: "a3",
        eventDate: "2026-01-20",
        eventPhase: "REALIZED",
        eventType: "COUPON",
        amountCents: 80000n,
        yieldBps: 80,
      },
    ];

    const result = aggregateHistoricalYield(events);

    expect(result.byEventType["DIVIDEND_JCP"].totalCents).toBe(80000n);
    expect(result.byEventType["DIVIDEND_JCP"].count).toBe(2);
    expect(result.byEventType["COUPON"].totalCents).toBe(80000n);
    expect(result.byEventType["COUPON"].count).toBe(1);
  });

  it("strictly excludes MATURITY events from realized yield while tracking in event count and byEventType", () => {
    const events: CalendarLedgerEvent[] = [
      {
        id: "ev-m1",
        userId: baseUserId,
        assetId: "asset-bond-maturity",
        eventDate: "2026-05-15",
        eventPhase: "REALIZED",
        eventType: "MATURITY",
        amountCents: 10000000n, // R$ 100,000.00 principal redemption
        yieldBps: 0,
      },
    ];

    const result = aggregateHistoricalYield(events);

    expect(result.eventCount).toBe(1);
    expect(result.totalRealizedYieldCents).toBe(0n);
    expect(result.realizedYieldBps).toBe(0);
    expect(result.byEventType["MATURITY"]).toEqual({
      totalCents: 10000000n,
      count: 1,
    });
  });
});
