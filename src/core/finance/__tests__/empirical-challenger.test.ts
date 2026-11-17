import { describe, it, expect } from "vitest";
import { consolidatePortfolio } from "../portfolio";
import { aggregateHistoricalYield } from "../yield";
import { buildBiphasicCalendar } from "../calendar";
import type { NormalizedPositionDTO, ProductClass } from "../../../connectors/types";
import type { CalendarLedgerEvent, CalendarLedgerEventRecord } from "../types";
import { OpenFinanceSandboxAdapter } from "../../../connectors/adapters/open-finance";

describe("Milestone M2 Iteration 3: Empirical Challenger Invariant Verification", () => {
  const PRODUCT_CLASSES: ProductClass[] = [
    "renda_fixa",
    "fundos",
    "bolsa",
    "coe",
    "cripto",
    "tesouro_direto",
    "cambio",
    "etfs",
  ];

  const createPosition = (
    productClass: ProductClass,
    netCents: bigint,
    index = 0
  ): NormalizedPositionDTO => ({
    institutionId: "EMPIRICAL_TEST_INST",
    productClass,
    tickerOrCode: `TICKER_${productClass.toUpperCase()}_${index}`,
    assetName: `Asset ${productClass} ${index}`,
    currency: "BRL",
    investedCents: netCents,
    currentGrossCents: netCents,
    currentNetCents: netCents,
    annualRateBps: 1000,
    indexer: "PRE",
    liquidityTier: "D_0",
    liquidityDays: 0,
    fgcCovered: false,
    maturityDate: null,
  });

  describe("Task 1. Invariant: sum of shareBps === 10000 bps for all portfolios", () => {
    it("conserves sum === 10000 bps across 10,000 arbitrary pseudo-random portfolios", () => {
      // Deterministic PRNG seed for reproducibility
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let iter = 0; iter < 10000; iter++) {
        // Random number of classes between 1 and 8
        const numClasses = 1 + Math.floor(pseudoRandom() * PRODUCT_CLASSES.length);
        const shuffled = [...PRODUCT_CLASSES].sort(() => pseudoRandom() - 0.5).slice(0, numClasses);

        const positions: NormalizedPositionDTO[] = [];
        for (let i = 0; i < shuffled.length; i++) {
          const cls = shuffled[i];
          // Generate net cents spanning from 1 cent to 10 billion cents (R$ 100,000,000.00)
          const magnitude = Math.floor(pseudoRandom() * 9); // 0 to 8 orders of magnitude
          const base = 1 + Math.floor(pseudoRandom() * 100000);
          const cents = BigInt(base) * (10n ** BigInt(magnitude));

          // Also allow multiple positions per class
          const positionsCount = 1 + Math.floor(pseudoRandom() * 3);
          for (let p = 0; p < positionsCount; p++) {
            positions.push(createPosition(cls, cents, p));
          }
        }

        const consolidated = consolidatePortfolio(positions);
        const allocations = Object.values(consolidated.classAllocations);

        const totalBps = allocations.reduce((acc, c) => acc + c.shareBps, 0);
        expect(totalBps).toBe(10000);
      }
    });

    it("conserves sum === 10000 bps for pathological prime number splits", () => {
      // 3 assets with 1 cent each: 10000 / 3 = 3333 with remainder 1, 1, 1
      const positions3: NormalizedPositionDTO[] = [
        createPosition("renda_fixa", 1n),
        createPosition("bolsa", 1n),
        createPosition("fundos", 1n),
      ];
      const res3 = consolidatePortfolio(positions3);
      const sumBps3 = Object.values(res3.classAllocations).reduce((acc, c) => acc + c.shareBps, 0);
      expect(sumBps3).toBe(10000);

      // 7 assets with prime number values
      const primes = [2n, 3n, 5n, 7n, 11n, 13n, 17n];
      const positions7: NormalizedPositionDTO[] = primes.map((prime, idx) =>
        createPosition(PRODUCT_CLASSES[idx], prime)
      );
      const res7 = consolidatePortfolio(positions7);
      const sumBps7 = Object.values(res7.classAllocations).reduce((acc, c) => acc + c.shareBps, 0);
      expect(sumBps7).toBe(10000);
    });

    it("conserves sum === 10000 bps for extreme asymmetry (99.9999% in one asset)", () => {
      const positions: NormalizedPositionDTO[] = [
        createPosition("renda_fixa", 999999999999n), // Huge amount
        createPosition("bolsa", 1n),                 // 1 cent
      ];
      const res = consolidatePortfolio(positions);
      const sumBps = Object.values(res.classAllocations).reduce((acc, c) => acc + c.shareBps, 0);
      expect(sumBps).toBe(10000);
      expect(res.classAllocations.renda_fixa!.shareBps).toBe(10000);
      expect(res.classAllocations.bolsa!.shareBps).toBe(0);
    });

    it("conserves sum === 10000 bps across standard OpenFinance sandbox benchmark", async () => {
      const adapter = new OpenFinanceSandboxAdapter();
      const positions = await adapter.syncPositions("benchmark-user");
      const res = consolidatePortfolio(positions);
      const sumBps = Object.values(res.classAllocations).reduce((acc, c) => acc + c.shareBps, 0);
      expect(sumBps).toBe(10000);
    });

    it("returns empty allocations and 0 BPS when portfolio has zero net cents", () => {
      const positions: NormalizedPositionDTO[] = [
        createPosition("renda_fixa", 0n),
      ];
      const res = consolidatePortfolio(positions);
      const sumBps = Object.values(res.classAllocations).reduce((acc, c) => acc + c.shareBps, 0);
      expect(sumBps).toBe(0);
      expect(res.totalNetCents).toBe(0n);
    });
  });

  describe("Task 2. Invariant: MATURITY ledger events leave totalRealizedYieldCents === 0n", () => {
    it("leaves totalRealizedYieldCents === 0n for isolated MATURITY event of any size", () => {
      const testAmounts = [1n, 100n, 5000000n, 100000000000n];

      for (const amountCents of testAmounts) {
        const events: CalendarLedgerEvent[] = [
          {
            id: "mat-event-1",
            userId: "user-test",
            assetId: "asset-bond",
            eventDate: "2026-10-15",
            eventPhase: "REALIZED",
            eventType: "MATURITY",
            amountCents,
            yieldBps: 0,
          },
        ];

        const result = aggregateHistoricalYield(events);
        expect(result.totalRealizedYieldCents).toBe(0n);
        expect(result.realizedYieldBps).toBe(0);
        expect(result.eventCount).toBe(1);
        expect(result.byEventType["MATURITY"].totalCents).toBe(amountCents);
      }
    });

    it("leaves totalRealizedYieldCents unchanged when MATURITY events are mixed with income events", () => {
      const incomeOnlyEvents: CalendarLedgerEvent[] = [
        {
          id: "div-1",
          userId: "user-test",
          assetId: "petr4",
          eventDate: "2026-10-10",
          eventPhase: "REALIZED",
          eventType: "DIVIDEND_JCP",
          amountCents: 50000n,
          yieldBps: 50,
        },
        {
          id: "coup-1",
          userId: "user-test",
          assetId: "ntnb",
          eventDate: "2026-10-20",
          eventPhase: "REALIZED",
          eventType: "COUPON",
          amountCents: 150000n,
          yieldBps: 150,
        },
      ];

      const baseline = aggregateHistoricalYield(incomeOnlyEvents);
      expect(baseline.totalRealizedYieldCents).toBe(200000n);

      const mixedWithMaturity: CalendarLedgerEvent[] = [
        ...incomeOnlyEvents,
        {
          id: "mat-1",
          userId: "user-test",
          assetId: "cdb-mat",
          eventDate: "2026-10-25",
          eventPhase: "REALIZED",
          eventType: "MATURITY",
          amountCents: 100000000n, // R$ 1,000,000.00 principal redemption
          yieldBps: 0,
        },
        {
          id: "mat-2",
          userId: "user-test",
          assetId: "lci-mat",
          eventDate: "2026-10-28",
          eventPhase: "REALIZED",
          eventType: "MATURITY",
          amountCents: 50000000n, // R$ 500,000.00 principal redemption
          yieldBps: 0,
        },
      ];

      const mixedResult = aggregateHistoricalYield(mixedWithMaturity);
      // Yield must remain strictly identical to baseline
      expect(mixedResult.totalRealizedYieldCents).toBe(baseline.totalRealizedYieldCents);
      expect(mixedResult.eventCount).toBe(4);
      expect(mixedResult.byEventType["MATURITY"].totalCents).toBe(150000000n);
      expect(mixedResult.byEventType["MATURITY"].count).toBe(2);
    });

    it("verifies multi-month MATURITY distribution leaves all monthly yieldCents === 0n", () => {
      const events: CalendarLedgerEvent[] = [
        {
          id: "mat-m1",
          userId: "user-test",
          assetId: "asset-1",
          eventDate: "2026-08-15",
          eventPhase: "REALIZED",
          eventType: "MATURITY",
          amountCents: 5000000n,
          yieldBps: 0,
        },
        {
          id: "mat-m2",
          userId: "user-test",
          assetId: "asset-2",
          eventDate: "2026-09-15",
          eventPhase: "REALIZED",
          eventType: "MATURITY",
          amountCents: 8000000n,
          yieldBps: 0,
        },
      ];

      const result = aggregateHistoricalYield(events);
      expect(result.totalRealizedYieldCents).toBe(0n);
      for (const month of result.byMonth) {
        expect(month.yieldCents).toBe(0n);
      }
    });
  });

  describe("Task 3. Invariant: Projected AMORTIZATION increases projectedCashflowCents", () => {
    const REF_DATE = "2026-11-15";

    it("increases projectedCashflowCents by exactly the amortization amount", () => {
      // Baseline without amortization
      const baselineCalendar = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 1,
        startingPortfolioCents: 10000000n,
        expectedRateCurve: {
          p10RateBps: 800,
          p50RateBps: 1200,
          p90RateBps: 1600,
        },
      });

      const decBaseline = baselineCalendar.find((m) => m.yearMonth === "2026-12")!;
      const baselineCashflow = decBaseline.netCashflowCents;

      // With AMORTIZATION event of R$ 25,000.00
      const amortAmount = 2500000n;
      const amortLedger: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-12-15",
          eventType: "AMORTIZATION",
          amountCents: amortAmount,
        },
      ];

      const withAmortCalendar = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 1,
        startingPortfolioCents: 10000000n,
        expectedRateCurve: {
          p10RateBps: 800,
          p50RateBps: 1200,
          p90RateBps: 1600,
        },
        ledgerEvents: amortLedger,
      });

      const decWithAmort = withAmortCalendar.find((m) => m.yearMonth === "2026-12")!;
      expect(decWithAmort.netCashflowCents).toBe((baselineCashflow ?? 0n) + amortAmount);
      expect(decWithAmort.events.some((e) => e.type === "amortization")).toBe(true);
    });

    it("accumulates multiple scheduled amortizations linearly into projectedCashflowCents", () => {
      const amortEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-12-05",
          eventType: "AMORTIZATION",
          amountCents: 1000000n, // R$ 10,000.00
        },
        {
          eventDate: "2026-12-20",
          eventType: "AMORTIZATION",
          amountCents: 1500000n, // R$ 15,000.00
        },
      ];

      const calendar = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 1,
        ledgerEvents: amortEvents,
      });

      const decMonth = calendar.find((m) => m.yearMonth === "2026-12")!;
      expect(decMonth.netCashflowCents).toBe(2500000n); // 1000000 + 1500000
      expect(decMonth.events.length).toBe(2);
      expect(decMonth.events.every((e) => e.type === "amortization")).toBe(true);
    });

    it("verifies AMORTIZATION is recognized as positive cashflow alongside maturities and yields", () => {
      const mixedEvents: CalendarLedgerEventRecord[] = [
        {
          eventDate: "2026-12-05",
          eventType: "AMORTIZATION",
          amountCents: 500000n,
        },
        {
          eventDate: "2026-12-10",
          eventType: "MATURITY",
          amountCents: 2000000n,
        },
        {
          eventDate: "2026-12-15",
          eventType: "DIVIDEND",
          amountCents: 100000n,
        },
        {
          eventDate: "2026-12-20",
          eventType: "CONTRIBUTION",
          amountCents: 300000n, // Outflow
        },
      ];

      const calendar = buildBiphasicCalendar({
        referenceDate: REF_DATE,
        horizonMonths: 1,
        ledgerEvents: mixedEvents,
      });

      const decMonth = calendar.find((m) => m.yearMonth === "2026-12")!;
      // Net cashflow: +500000 (amortization) + 2000000 (maturity) + 100000 (dividend) - 300000 (contribution) = +2300000n
      expect(decMonth.netCashflowCents).toBe(2300000n);
    });
  });
});
