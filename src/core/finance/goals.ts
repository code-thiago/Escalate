import type {
  GoalAllocationItem,
  InvestmentGoal,
  GoalAllocationWithAsset,
  GoalProgressResult,
  GoalAllocationBreakdownItem,
} from "./types";

export class GoalAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalAllocationError";
  }
}

/**
 * Validates fractional allocations across assets and goals.
 * Aggregates all allocations per assetId.
 * Rejects if the cumulative allocation for any asset exceeds 10000 bps (100%).
 * Also rejects invalid basis points (<= 0, non-integer, or > 10000).
 */
export function validateGoalAllocations(
  allocations: GoalAllocationItem[]
): { valid: true; assetTotalsBps: Record<string, number> } {
  const assetTotalsBps: Record<string, number> = {};

  for (const allocation of allocations) {
    const { assetId, allocatedBps } = allocation;

    if (!assetId || typeof assetId !== "string" || assetId.trim().length === 0) {
      throw new GoalAllocationError("Invalid assetId: assetId must be a non-empty string");
    }

    if (
      typeof allocatedBps !== "number" ||
      !Number.isInteger(allocatedBps) ||
      allocatedBps <= 0
    ) {
      throw new GoalAllocationError(
        `Invalid allocation basis points for asset "${assetId}": must be a positive integer greater than 0, received ${allocatedBps}`
      );
    }

    if (allocatedBps > 10000) {
      throw new GoalAllocationError(
        `Allocation for asset "${assetId}" exceeds maximum 10000 bps (100%): received ${allocatedBps} bps`
      );
    }

    const currentTotal = assetTotalsBps[assetId] ?? 0;
    const newTotal = currentTotal + allocatedBps;

    if (newTotal > 10000) {
      throw new GoalAllocationError(
        `Cumulative allocation for asset "${assetId}" exceeds 10000 bps (100%): cumulative total is ${newTotal} bps`
      );
    }

    assetTotalsBps[assetId] = newTotal;
  }

  return { valid: true, assetTotalsBps };
}

/**
 * Liquidity tier hierarchy ranking: lower number means higher liquidity.
 */
const LIQUIDITY_TIER_RANK: Record<string, number> = {
  D_0: 0,
  D_1_TO_5: 1,
  D_6_TO_30: 2,
  D_PLUS_30: 3,
  AT_MATURITY: 4,
  ANY: 99,
};

/**
 * Computes progress of an investment goal based on allocated asset fractions.
 * - Allocated cents per asset: (asset.currentNetCents * BigInt(allocatedBps)) / 10000n
 * - Progress in bps: Math.min(10000, Number((totalAllocatedCents * 10000n) / goal.targetAmountCents))
 * - Detects liquidity and maturity mismatches between asset characteristics and goal constraints.
 */
export function computeGoalProgress(
  goal: InvestmentGoal,
  allocations: GoalAllocationWithAsset[]
): GoalProgressResult {
  // Validate allocations first
  const simpleAllocations: GoalAllocationItem[] = allocations.map((a) => ({
    assetId: a.asset.tickerOrCode || a.asset.assetName,
    allocatedBps: a.allocatedBps,
  }));
  validateGoalAllocations(simpleAllocations);

  let totalAllocatedCents = 0n;
  const breakdown: GoalAllocationBreakdownItem[] = [];
  const warnings: string[] = [];

  for (const item of allocations) {
    const { asset, allocatedBps } = item;
    const assetId = asset.tickerOrCode || asset.assetName;
    const assetNetCents = asset.currentNetCents;

    // Integer cents arithmetic: (currentNetCents * BigInt(allocatedBps)) / 10000n
    const allocatedCents = (assetNetCents * BigInt(allocatedBps)) / 10000n;
    totalAllocatedCents += allocatedCents;

    let hasLiquidityMismatch = false;

    // Check 1: Asset maturity date exceeds goal target date
    if (asset.maturityDate && goal.targetDate) {
      if (asset.maturityDate > goal.targetDate) {
        hasLiquidityMismatch = true;
        warnings.push(
          `Liquidity Mismatch: Asset "${asset.assetName}" (${asset.tickerOrCode}) matures on ${asset.maturityDate}, which is after goal target date ${goal.targetDate}`
        );
      }
    }

    // Check 2: Goal specifies maximum liquidity tier and asset tier is slower
    if (
      goal.requiredLiquidityMaxTier &&
      goal.requiredLiquidityMaxTier !== "ANY"
    ) {
      const goalMaxRank = LIQUIDITY_TIER_RANK[goal.requiredLiquidityMaxTier] ?? 99;
      const assetRank = LIQUIDITY_TIER_RANK[asset.liquidityTier] ?? 99;

      if (assetRank > goalMaxRank) {
        hasLiquidityMismatch = true;
        warnings.push(
          `Liquidity Tier Warning: Asset "${asset.assetName}" (${asset.tickerOrCode}) has liquidity tier "${asset.liquidityTier}", which is slower than goal required tier "${goal.requiredLiquidityMaxTier}"`
        );
      }
    }

    breakdown.push({
      assetId,
      tickerOrCode: asset.tickerOrCode,
      assetName: asset.assetName,
      allocatedBps,
      assetNetCents,
      allocatedCents,
      liquidityTier: asset.liquidityTier,
      maturityDate: asset.maturityDate,
      hasLiquidityMismatch,
    });
  }

  // Calculate progress in basis points: capped at 10000 bps (100%)
  let progressBps = 0;
  if (goal.targetAmountCents <= 0n) {
    progressBps = totalAllocatedCents > 0n ? 10000 : 0;
  } else {
    const rawProgress = Number(
      (totalAllocatedCents * 10000n) / goal.targetAmountCents
    );
    progressBps = Math.min(10000, Math.max(0, rawProgress));
  }

  const remainingCents =
    goal.targetAmountCents > totalAllocatedCents
      ? goal.targetAmountCents - totalAllocatedCents
      : 0n;

  const isCompleted = totalAllocatedCents >= goal.targetAmountCents;

  return {
    goalId: goal.id,
    title: goal.title,
    targetAmountCents: goal.targetAmountCents,
    totalAllocatedCents,
    remainingCents,
    progressBps,
    isCompleted,
    allocationsCount: allocations.length,
    breakdown,
    warnings,
  };
}
