import { describe, it, expect } from "vitest";
import {
  consolidatePortfolio,
  calculateLiquidityLadder,
  resolveLiquidityTier,
} from "../portfolio";
import type { NormalizedPositionDTO, ProductClass } from "../../../connectors/types";
import { OpenFinanceSandboxAdapter } from "../../../connectors/adapters/open-finance";

describe("Milestone M2: Portfolio Consolidation & 5-Tier Liquidity Ladder", () => {
  const createMockPosition = (
    overrides: Partial<NormalizedPositionDTO> = {}
  ): NormalizedPositionDTO => ({
    institutionId: "XP",
    productClass: "renda_fixa",
    tickerOrCode: "CDB-TEST-01",
    assetName: "CDB Teste 100% CDI",
    currency: "BRL",
    investedCents: 1000000n, // R$ 10.000,00
    currentGrossCents: 1100000n, // R$ 11.000,00
    currentNetCents: 1080000n, // R$ 10.800,00
    annualRateBps: 10000,
    indexer: "CDI",
    liquidityTier: "D_0",
    liquidityDays: 0,
    fgcCovered: true,
    maturityDate: null,
    ...overrides,
  });

  describe("1. consolidatePortfolio", () => {
    it("handles empty positions array gracefully by returning zeros and empty allocation record", () => {
      const result = consolidatePortfolio([]);

      expect(result.totalGrossCents).toBe(0n);
      expect(result.totalNetCents).toBe(0n);
      expect(result.classAllocations).toEqual({});
      expect(Object.keys(result.classAllocations)).toHaveLength(0);
    });

    it("correctly consolidates single asset with 10000 bps (100.00%) share", () => {
      const pos = createMockPosition({
        productClass: "renda_fixa",
        currentGrossCents: 2000000n,
        currentNetCents: 1950000n,
      });

      const result = consolidatePortfolio([pos]);

      expect(result.totalGrossCents).toBe(2000000n);
      expect(result.totalNetCents).toBe(1950000n);
      expect(result.classAllocations.renda_fixa).toBeDefined();
      expect(result.classAllocations.renda_fixa?.totalCents).toBe(1950000n);
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(10000);
    });

    it("accumulates multiple positions within the same product class", () => {
      const pos1 = createMockPosition({
        tickerOrCode: "CDB-01",
        productClass: "renda_fixa",
        currentGrossCents: 1000000n,
        currentNetCents: 950000n,
      });
      const pos2 = createMockPosition({
        tickerOrCode: "LCI-01",
        productClass: "renda_fixa",
        currentGrossCents: 2000000n,
        currentNetCents: 2000000n, // IR isento
      });

      const result = consolidatePortfolio([pos1, pos2]);

      expect(result.totalGrossCents).toBe(3000000n);
      expect(result.totalNetCents).toBe(2950000n);
      expect(result.classAllocations.renda_fixa?.totalCents).toBe(2950000n);
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(10000);
      expect(Object.keys(result.classAllocations)).toHaveLength(1);
    });

    it("calculates accurate shares in basis points across distinct asset classes", () => {
      const positions: NormalizedPositionDTO[] = [
        createMockPosition({
          productClass: "renda_fixa",
          currentGrossCents: 6000000n,
          currentNetCents: 6000000n,
        }),
        createMockPosition({
          productClass: "bolsa",
          currentGrossCents: 3000000n,
          currentNetCents: 3000000n,
        }),
        createMockPosition({
          productClass: "cripto",
          currentGrossCents: 1000000n,
          currentNetCents: 1000000n,
        }),
      ];

      const result = consolidatePortfolio(positions);

      expect(result.totalGrossCents).toBe(10000000n);
      expect(result.totalNetCents).toBe(10000000n);

      expect(result.classAllocations.renda_fixa?.totalCents).toBe(6000000n);
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(6000); // 60.00%

      expect(result.classAllocations.bolsa?.totalCents).toBe(3000000n);
      expect(result.classAllocations.bolsa?.shareBps).toBe(3000); // 30.00%

      expect(result.classAllocations.cripto?.totalCents).toBe(1000000n);
      expect(result.classAllocations.cripto?.shareBps).toBe(1000); // 10.00%

      const sumBps =
        (result.classAllocations.renda_fixa?.shareBps ?? 0) +
        (result.classAllocations.bolsa?.shareBps ?? 0) +
        (result.classAllocations.cripto?.shareBps ?? 0);
      expect(sumBps).toBe(10000);
    });

    it("computes shareBps and enforces strict conservation invariant sum === 10000 bps using Largest Remainder Method", () => {
      const positions: NormalizedPositionDTO[] = [
        createMockPosition({
          productClass: "renda_fixa",
          currentGrossCents: 10000n,
          currentNetCents: 10000n,
        }),
        createMockPosition({
          productClass: "bolsa",
          currentGrossCents: 20000n,
          currentNetCents: 20000n,
        }),
      ];

      const result = consolidatePortfolio(positions);

      // renda_fixa: floor 3333, remainder 10000
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(3333);
      // bolsa: floor 6666, remainder 20000 (gets +1 residual) -> 6667
      expect(result.classAllocations.bolsa?.shareBps).toBe(6667);
      expect(
        (result.classAllocations.renda_fixa?.shareBps ?? 0) +
          (result.classAllocations.bolsa?.shareBps ?? 0)
      ).toBe(10000);
    });

    it("safely handles portfolio with 0 net cents without division by zero errors", () => {
      const pos = createMockPosition({
        currentGrossCents: 50000n,
        currentNetCents: 0n,
      });

      const result = consolidatePortfolio([pos]);

      expect(result.totalGrossCents).toBe(50000n);
      expect(result.totalNetCents).toBe(0n);
      expect(result.classAllocations.renda_fixa?.totalCents).toBe(0n);
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(0);
    });

    it("preserves BigInt precision for multi-billion currency portfolios without overflow", () => {
      const hugeCents = 5000000000000n; // R$ 50 billion in cents
      const positions = [
        createMockPosition({
          productClass: "renda_fixa",
          currentGrossCents: hugeCents,
          currentNetCents: hugeCents,
        }),
        createMockPosition({
          productClass: "bolsa",
          currentGrossCents: hugeCents,
          currentNetCents: hugeCents,
        }),
      ];

      const result = consolidatePortfolio(positions);

      expect(result.totalGrossCents).toBe(hugeCents * 2n);
      expect(result.totalNetCents).toBe(hugeCents * 2n);
      expect(result.classAllocations.renda_fixa?.shareBps).toBe(5000);
      expect(result.classAllocations.bolsa?.shareBps).toBe(5000);
    });

    it("does not mutate the input array or position objects (pure functional invariant)", () => {
      const original = [
        createMockPosition({ productClass: "renda_fixa", currentNetCents: 1000n }),
        createMockPosition({ productClass: "bolsa", currentNetCents: 2000n }),
      ];
      const snapshot = JSON.stringify(original, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      );

      consolidatePortfolio(original);

      const after = JSON.stringify(original, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      );
      expect(after).toBe(snapshot);
    });
  });

  describe("2. resolveLiquidityTier & calculateLiquidityLadder", () => {
    it("returns all 5 buckets initialized to 0n when positions array is empty", () => {
      const result = calculateLiquidityLadder([]);

      expect(result.buckets).toEqual({
        D_0: 0n,
        D_1_TO_5: 0n,
        D_6_TO_30: 0n,
        D_PLUS_30: 0n,
        AT_MATURITY: 0n,
      });
    });

    it("maps positions according to explicit valid liquidityTier", () => {
      const positions: NormalizedPositionDTO[] = [
        createMockPosition({ liquidityTier: "D_0", currentNetCents: 100000n }),
        createMockPosition({ liquidityTier: "D_1_TO_5", currentNetCents: 200000n }),
        createMockPosition({ liquidityTier: "D_6_TO_30", currentNetCents: 300000n }),
        createMockPosition({ liquidityTier: "D_PLUS_30", currentNetCents: 400000n }),
        createMockPosition({ liquidityTier: "AT_MATURITY", currentNetCents: 500000n }),
      ];

      const result = calculateLiquidityLadder(positions);

      expect(result.buckets.D_0).toBe(100000n);
      expect(result.buckets.D_1_TO_5).toBe(200000n);
      expect(result.buckets.D_6_TO_30).toBe(300000n);
      expect(result.buckets.D_PLUS_30).toBe(400000n);
      expect(result.buckets.AT_MATURITY).toBe(500000n);
    });

    it("falls back to liquidityDays when liquidityTier is omitted or empty", () => {
      const posD0 = createMockPosition({ liquidityTier: undefined, liquidityDays: 0, currentNetCents: 100n });
      const posD1 = createMockPosition({ liquidityTier: undefined, liquidityDays: 3, currentNetCents: 200n });
      const posD5 = createMockPosition({ liquidityTier: undefined, liquidityDays: 5, currentNetCents: 300n });
      const posD6 = createMockPosition({ liquidityTier: undefined, liquidityDays: 6, currentNetCents: 400n });
      const posD30 = createMockPosition({ liquidityTier: undefined, liquidityDays: 30, currentNetCents: 500n });
      const posDPlus = createMockPosition({ liquidityTier: undefined, liquidityDays: 45, currentNetCents: 600n });

      expect(resolveLiquidityTier(posD0)).toBe("D_0");
      expect(resolveLiquidityTier(posD1)).toBe("D_1_TO_5");
      expect(resolveLiquidityTier(posD5)).toBe("D_1_TO_5");
      expect(resolveLiquidityTier(posD6)).toBe("D_6_TO_30");
      expect(resolveLiquidityTier(posD30)).toBe("D_6_TO_30");
      expect(resolveLiquidityTier(posDPlus)).toBe("D_PLUS_30");

      const result = calculateLiquidityLadder([posD0, posD1, posD5, posD6, posD30, posDPlus]);

      expect(result.buckets.D_0).toBe(100n);
      expect(result.buckets.D_1_TO_5).toBe(500n); // 200n + 300n
      expect(result.buckets.D_6_TO_30).toBe(900n); // 400n + 500n
      expect(result.buckets.D_PLUS_30).toBe(600n);
      expect(result.buckets.AT_MATURITY).toBe(0n);
    });

    it("preserves explicit AT_MATURITY tier even when liquidityDays is populated", () => {
      const lockedBond = createMockPosition({
        liquidityTier: "AT_MATURITY",
        liquidityDays: 365,
        currentNetCents: 750000n,
      });

      expect(resolveLiquidityTier(lockedBond)).toBe("AT_MATURITY");
      const result = calculateLiquidityLadder([lockedBond]);
      expect(result.buckets.AT_MATURITY).toBe(750000n);
      expect(result.buckets.D_PLUS_30).toBe(0n);
    });

    it("correctly sums multiple assets in the same bucket", () => {
      const positions: NormalizedPositionDTO[] = [
        createMockPosition({ liquidityTier: "D_0", currentNetCents: 1000n }),
        createMockPosition({ liquidityTier: "D_0", currentNetCents: 2500n }),
        createMockPosition({ liquidityTier: "D_0", currentNetCents: 6500n }),
      ];

      const result = calculateLiquidityLadder(positions);
      expect(result.buckets.D_0).toBe(10000n);
    });
  });

  describe("3. Integration with OpenFinanceSandboxAdapter", () => {
    const adapter = new OpenFinanceSandboxAdapter();

    it("consolidates sandbox positions across all 8 product classes with deterministic precision", async () => {
      const positions = await adapter.syncPositions("user-sandbox");
      expect(positions.length).toBe(11);

      const consolidated = consolidatePortfolio(positions);

      // Verify overall totals
      expect(consolidated.totalGrossCents).toBe(50150000n);
      expect(consolidated.totalNetCents).toBe(49692500n);

      // Verify each product class
      const expectedClasses: ProductClass[] = [
        "renda_fixa",
        "fundos",
        "bolsa",
        "coe",
        "tesouro_direto",
        "cambio",
        "etfs",
        "cripto",
      ];
      for (const cls of expectedClasses) {
        expect(consolidated.classAllocations[cls]).toBeDefined();
        expect(consolidated.classAllocations[cls]?.totalCents).toBeGreaterThan(0n);
        expect(consolidated.classAllocations[cls]?.shareBps).toBeGreaterThan(0);
      }

      // Exact values from sandbox with Largest Remainder Method (sum === 10000 bps):
      // renda_fixa: CDB Master (5360000n) + CDB BTG (10271250n) + LCI Itau (8400000n) = 24031250n
      expect(consolidated.classAllocations.renda_fixa?.totalCents).toBe(24031250n);
      expect(consolidated.classAllocations.renda_fixa?.shareBps).toBe(4836);

      // tesouro_direto: Selic 2029 (6247500n) + IPCA+ 2035 (4206250n) = 10453750n
      expect(consolidated.classAllocations.tesouro_direto?.totalCents).toBe(10453750n);
      expect(consolidated.classAllocations.tesouro_direto?.shareBps).toBe(2104);

      // bolsa: PETR4 (4882500n)
      expect(consolidated.classAllocations.bolsa?.totalCents).toBe(4882500n);
      expect(consolidated.classAllocations.bolsa?.shareBps).toBe(982);

      // fundos: KNCR11 (3150000n)
      expect(consolidated.classAllocations.fundos?.totalCents).toBe(3150000n);
      expect(consolidated.classAllocations.fundos?.shareBps).toBe(634);

      // etfs: BOVA11 (2585000n)
      expect(consolidated.classAllocations.etfs?.totalCents).toBe(2585000n);
      expect(consolidated.classAllocations.etfs?.shareBps).toBe(520);

      // coe: COE-SP500-PROT (2080000n)
      expect(consolidated.classAllocations.coe?.totalCents).toBe(2080000n);
      expect(consolidated.classAllocations.coe?.shareBps).toBe(419);

      // cripto: BTC (2010000n)
      expect(consolidated.classAllocations.cripto?.totalCents).toBe(2010000n);
      expect(consolidated.classAllocations.cripto?.shareBps).toBe(404);

      // cambio: USD-ACCOUNT (500000n)
      expect(consolidated.classAllocations.cambio?.totalCents).toBe(500000n);
      expect(consolidated.classAllocations.cambio?.shareBps).toBe(101);

      // Verify sum of class totals equals totalNetCents exactly
      const sumOfClassCents = Object.values(consolidated.classAllocations).reduce(
        (acc, item) => acc + (item?.totalCents ?? 0n),
        0n
      );
      expect(sumOfClassCents).toBe(consolidated.totalNetCents);

      // Verify strict conservation invariant: sum of shareBps equals 10000 bps
      const totalBps = Object.values(consolidated.classAllocations).reduce(
        (sum, item) => sum + (item?.shareBps ?? 0),
        0
      );
      expect(totalBps).toBe(10000);
    });

    it("calculates exact liquidity ladder for Open Finance sandbox positions", async () => {
      const positions = await adapter.syncPositions("user-sandbox");
      const ladder = calculateLiquidityLadder(positions);

      // D_0: CDB-BTG-DIARIO (10271250) + USD (500000) + Tesouro Selic (6247500) + BTC (2010000) = 19028750n
      expect(ladder.buckets.D_0).toBe(19028750n);

      // D_1_TO_5: KNCR11 (3150000) + PETR4 (4882500) + BOVA11 (2585000) = 10617500n
      expect(ladder.buckets.D_1_TO_5).toBe(10617500n);

      // D_6_TO_30: LCI Itau (8400000n)
      expect(ladder.buckets.D_6_TO_30).toBe(8400000n);

      // D_PLUS_30: none
      expect(ladder.buckets.D_PLUS_30).toBe(0n);

      // AT_MATURITY: CDB Master (5360000) + COE (2080000) + Tesouro IPCA (4206250) = 11646250n
      expect(ladder.buckets.AT_MATURITY).toBe(11646250n);
    });

    it("verifies mathematical conservation invariant: sum of buckets === totalNetCents", async () => {
      const positions = await adapter.syncPositions("user-sandbox");
      const consolidated = consolidatePortfolio(positions);
      const ladder = calculateLiquidityLadder(positions);

      const bucketSum =
        ladder.buckets.D_0 +
        ladder.buckets.D_1_TO_5 +
        ladder.buckets.D_6_TO_30 +
        ladder.buckets.D_PLUS_30 +
        ladder.buckets.AT_MATURITY;

      expect(bucketSum).toBe(consolidated.totalNetCents);
    });
  });
});
