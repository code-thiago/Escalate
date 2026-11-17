import { describe, it, expect } from "vitest";
import {
  validateGoalAllocations,
  computeGoalProgress,
  GoalAllocationError,
} from "../goals";
import type { InvestmentGoal, GoalAllocationWithAsset } from "../types";
import type { NormalizedPositionDTO } from "../../../connectors/types";

describe("Goals Fractional Allocation Engine (goals.ts)", () => {
  describe("validateGoalAllocations", () => {
    it("accepts a valid single allocation under 10000 bps", () => {
      const result = validateGoalAllocations([
        { assetId: "ASSET-1", allocatedBps: 5000 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.assetTotalsBps["ASSET-1"]).toBe(5000);
    });

    it("accepts an exact 100% allocation (10000 bps)", () => {
      const result = validateGoalAllocations([
        { assetId: "ASSET-1", allocatedBps: 10000 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.assetTotalsBps["ASSET-1"]).toBe(10000);
    });

    it("accepts multiple allocations for the same asset summing exactly to 10000 bps", () => {
      const result = validateGoalAllocations([
        { assetId: "ASSET-1", allocatedBps: 4000 },
        { assetId: "ASSET-1", allocatedBps: 3500 },
        { assetId: "ASSET-1", allocatedBps: 2500 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.assetTotalsBps["ASSET-1"]).toBe(10000);
    });

    it("accepts allocations across multiple distinct assets independently", () => {
      const result = validateGoalAllocations([
        { assetId: "ASSET-1", allocatedBps: 8000 },
        { assetId: "ASSET-2", allocatedBps: 9000 },
        { assetId: "ASSET-3", allocatedBps: 10000 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.assetTotalsBps["ASSET-1"]).toBe(8000);
      expect(result.assetTotalsBps["ASSET-2"]).toBe(9000);
      expect(result.assetTotalsBps["ASSET-3"]).toBe(10000);
    });

    it("handles empty allocations array gracefully", () => {
      const result = validateGoalAllocations([]);
      expect(result.valid).toBe(true);
      expect(result.assetTotalsBps).toEqual({});
    });

    it("rejects a single allocation exceeding 10000 bps", () => {
      expect(() =>
        validateGoalAllocations([{ assetId: "ASSET-1", allocatedBps: 10001 }])
      ).toThrow(GoalAllocationError);

      expect(() =>
        validateGoalAllocations([{ assetId: "ASSET-1", allocatedBps: 10001 }])
      ).toThrow(/exceeds maximum 10000 bps/i);
    });

    it("rejects cumulative allocations for the same asset exceeding 10000 bps", () => {
      expect(() =>
        validateGoalAllocations([
          { assetId: "ASSET-1", allocatedBps: 6000 },
          { assetId: "ASSET-1", allocatedBps: 5000 },
        ])
      ).toThrow(GoalAllocationError);

      expect(() =>
        validateGoalAllocations([
          { assetId: "ASSET-1", allocatedBps: 6000 },
          { assetId: "ASSET-1", allocatedBps: 5000 },
        ])
      ).toThrow(/cumulative total is 11000 bps/i);
    });

    it("rejects zero or negative basis points", () => {
      expect(() =>
        validateGoalAllocations([{ assetId: "ASSET-1", allocatedBps: 0 }])
      ).toThrow(/positive integer greater than 0/i);

      expect(() =>
        validateGoalAllocations([{ assetId: "ASSET-1", allocatedBps: -500 }])
      ).toThrow(/positive integer greater than 0/i);
    });

    it("rejects non-integer basis points", () => {
      expect(() =>
        validateGoalAllocations([{ assetId: "ASSET-1", allocatedBps: 2500.5 }])
      ).toThrow(/positive integer/i);
    });

    it("rejects invalid or empty assetId strings", () => {
      expect(() =>
        validateGoalAllocations([{ assetId: "", allocatedBps: 1000 }])
      ).toThrow(/non-empty string/i);

      expect(() =>
        validateGoalAllocations([{ assetId: "   ", allocatedBps: 1000 }])
      ).toThrow(/non-empty string/i);
    });
  });

  describe("computeGoalProgress", () => {
    const mockGoal: InvestmentGoal = {
      id: "goal-uuid-1",
      userId: "user-uuid-1",
      title: "Reserva de Emergencia",
      targetAmountCents: 5000000n, // R$ 50,000.00
      targetDate: "2027-12-31",
      requiredLiquidityMaxTier: "D_0",
    };

    const mockAsset1: NormalizedPositionDTO = {
      institutionId: "inst-1",
      productClass: "renda_fixa",
      tickerOrCode: "CDB-DI-ITAU",
      assetName: "CDB DI Itaú 100%",
      currency: "BRL",
      investedCents: 2000000n,
      currentGrossCents: 2200000n,
      currentNetCents: 2000000n, // R$ 20,000.00 net
      annualRateBps: 1050,
      indexer: "CDI",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: true,
      maturityDate: "2026-06-30",
    };

    const mockAsset2: NormalizedPositionDTO = {
      institutionId: "inst-2",
      productClass: "tesouro_direto",
      tickerOrCode: "LFT-2029",
      assetName: "Tesouro Selic 2029",
      currency: "BRL",
      investedCents: 3000000n,
      currentGrossCents: 3100000n,
      currentNetCents: 3000000n, // R$ 30,000.00 net
      annualRateBps: 1075,
      indexer: "SELIC",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: false,
      maturityDate: "2029-03-01",
    };

    it("returns zero progress for an empty allocations list", () => {
      const result = computeGoalProgress(mockGoal, []);
      expect(result.totalAllocatedCents).toBe(0n);
      expect(result.progressBps).toBe(0);
      expect(result.remainingCents).toBe(mockGoal.targetAmountCents);
      expect(result.isCompleted).toBe(false);
      expect(result.allocationsCount).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("computes allocated cents and progress accurately for a partial allocation", () => {
      // 50% of Asset 1 (5000 bps of R$ 20,000 = R$ 10,000.00)
      const allocations: GoalAllocationWithAsset[] = [
        { asset: mockAsset1, allocatedBps: 5000 },
      ];

      const result = computeGoalProgress(mockGoal, allocations);

      // R$ 10,000.00 allocated
      expect(result.totalAllocatedCents).toBe(1000000n);
      // R$ 10,000 / R$ 50,000 = 20% = 2000 bps
      expect(result.progressBps).toBe(2000);
      // R$ 40,000.00 remaining
      expect(result.remainingCents).toBe(4000000n);
      expect(result.isCompleted).toBe(false);
      expect(result.breakdown[0].allocatedCents).toBe(1000000n);
    });

    it("computes 100% completion when sum of allocated assets matches target exactly", () => {
      // 100% of Asset 1 (R$ 20k) + 100% of Asset 2 (R$ 30k) = R$ 50k
      const allocations: GoalAllocationWithAsset[] = [
        { asset: mockAsset1, allocatedBps: 10000 },
        { asset: mockAsset2, allocatedBps: 10000 },
      ];

      const result = computeGoalProgress(mockGoal, allocations);

      expect(result.totalAllocatedCents).toBe(5000000n);
      expect(result.progressBps).toBe(10000);
      expect(result.remainingCents).toBe(0n);
      expect(result.isCompleted).toBe(true);
    });

    it("caps progress at 10000 bps when overfunded", () => {
      const smallGoal: InvestmentGoal = {
        ...mockGoal,
        targetAmountCents: 1000000n, // R$ 10,000 target
      };

      const allocations: GoalAllocationWithAsset[] = [
        { asset: mockAsset1, allocatedBps: 10000 }, // R$ 20,000 allocated (200%)
      ];

      const result = computeGoalProgress(smallGoal, allocations);

      expect(result.totalAllocatedCents).toBe(2000000n);
      expect(result.progressBps).toBe(10000); // capped at 100%
      expect(result.remainingCents).toBe(0n);
      expect(result.isCompleted).toBe(true);
    });

    it("safely handles goal with zero or negative target amount", () => {
      const zeroGoal: InvestmentGoal = {
        ...mockGoal,
        targetAmountCents: 0n,
      };

      const result = computeGoalProgress(zeroGoal, [
        { asset: mockAsset1, allocatedBps: 5000 },
      ]);

      expect(result.progressBps).toBe(10000);
      expect(result.isCompleted).toBe(true);
    });

    it("detects liquidity and maturity mismatches against goal constraints", () => {
      const shortTermGoal: InvestmentGoal = {
        id: "goal-short",
        userId: "user-1",
        title: "Viagem 2027",
        targetAmountCents: 1000000n,
        targetDate: "2027-06-30",
        requiredLiquidityMaxTier: "D_0",
      };

      // Asset matures in 2029 (after goal 2027) and has tier D_PLUS_30 (slower than D_0)
      const illiquidAsset: NormalizedPositionDTO = {
        institutionId: "inst-3",
        productClass: "renda_fixa",
        tickerOrCode: "CRI-IMOB-2029",
        assetName: "CRI Imobiliario 2029",
        currency: "BRL",
        investedCents: 1000000n,
        currentGrossCents: 1050000n,
        currentNetCents: 1000000n,
        annualRateBps: 1200,
        indexer: "IPCA",
        liquidityTier: "D_PLUS_30",
        liquidityDays: 45,
        fgcCovered: false,
        maturityDate: "2029-12-31",
      };

      const result = computeGoalProgress(shortTermGoal, [
        { asset: illiquidAsset, allocatedBps: 5000 },
      ]);

      expect(result.breakdown[0].hasLiquidityMismatch).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
      expect(result.warnings.some((w) => w.includes("matures on 2029-12-31"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("liquidity tier \"D_PLUS_30\""))).toBe(true);
    });
  });
});
