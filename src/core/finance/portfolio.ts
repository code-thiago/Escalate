import type {
  NormalizedPositionDTO,
  ProductClass,
  LiquidityTier,
} from "../../connectors/types";
import type {
  PortfolioConsolidationResult,
  LiquidityLadderResult,
  ClassAllocations,
} from "./types";

export const VALID_LIQUIDITY_TIERS: readonly LiquidityTier[] = [
  "D_0",
  "D_1_TO_5",
  "D_6_TO_30",
  "D_PLUS_30",
  "AT_MATURITY",
] as const;

/**
 * Resolves the effective liquidity tier of a normalized position.
 * Prioritizes explicit valid liquidityTier, falling back to liquidityDays if not present.
 */
export function resolveLiquidityTier(position: NormalizedPositionDTO): LiquidityTier {
  if (position.liquidityTier && VALID_LIQUIDITY_TIERS.includes(position.liquidityTier)) {
    return position.liquidityTier;
  }

  const days = position.liquidityDays ?? 0;
  if (days <= 0) return "D_0";
  if (days <= 5) return "D_1_TO_5";
  if (days <= 30) return "D_6_TO_30";
  return "D_PLUS_30";
}

/**
 * Consolidates portfolio positions by product class using pure integer BigInt arithmetic.
 * Calculates total gross and net cents, and allocation share in basis points (10000 bps = 100.00%).
 */
export function consolidatePortfolio(
  positions: NormalizedPositionDTO[]
): PortfolioConsolidationResult {
  if (!positions || positions.length === 0) {
    return {
      totalGrossCents: 0n,
      totalNetCents: 0n,
      classAllocations: {},
    };
  }

  let totalGrossCents = 0n;
  let totalNetCents = 0n;
  const classTotals = new Map<ProductClass, bigint>();

  for (const pos of positions) {
    totalGrossCents += pos.currentGrossCents;
    totalNetCents += pos.currentNetCents;

    const currentClassTotal = classTotals.get(pos.productClass) ?? 0n;
    classTotals.set(pos.productClass, currentClassTotal + pos.currentNetCents);
  }

  const classAllocations: ClassAllocations = {};

  if (totalNetCents > 0n && classTotals.size > 0) {
    interface AllocationDraft {
      productClass: ProductClass;
      totalCents: bigint;
      floorBps: number;
      remainder: bigint;
    }

    const drafts: AllocationDraft[] = [];
    let allocatedSum = 0;

    for (const [productClass, classTotal] of classTotals.entries()) {
      const floorBps = Number((classTotal * 10000n) / totalNetCents);
      const remainder = (classTotal * 10000n) % totalNetCents;
      drafts.push({
        productClass,
        totalCents: classTotal,
        floorBps,
        remainder,
      });
      allocatedSum += floorBps;
    }

    // Largest Remainder Method (Hare-Niemeyer) to conserve sum === 10000 bps
    const residual = 10000 - allocatedSum;

    drafts.sort((a, b) => {
      if (b.remainder > a.remainder) return 1;
      if (b.remainder < a.remainder) return -1;
      if (b.totalCents > a.totalCents) return 1;
      if (b.totalCents < a.totalCents) return -1;
      return a.productClass.localeCompare(b.productClass);
    });

    for (let i = 0; i < residual && i < drafts.length; i++) {
      drafts[i].floorBps += 1;
    }

    for (const draft of drafts) {
      classAllocations[draft.productClass] = {
        totalCents: draft.totalCents,
        shareBps: draft.floorBps,
      };
    }
  } else {
    for (const [productClass, classTotal] of classTotals.entries()) {
      classAllocations[productClass] = {
        totalCents: classTotal,
        shareBps: 0,
      };
    }
  }

  return {
    totalGrossCents,
    totalNetCents,
    classAllocations,
  };
}

/**
 * Categorizes portfolio assets into the 5 standard liquidity buckets summing currentNetCents.
 * Buckets: D_0, D_1_TO_5, D_6_TO_30, D_PLUS_30, AT_MATURITY.
 */
export function calculateLiquidityLadder(
  positions: NormalizedPositionDTO[]
): LiquidityLadderResult {
  const buckets: Record<LiquidityTier, bigint> = {
    D_0: 0n,
    D_1_TO_5: 0n,
    D_6_TO_30: 0n,
    D_PLUS_30: 0n,
    AT_MATURITY: 0n,
  };

  if (!positions || positions.length === 0) {
    return { buckets };
  }

  for (const pos of positions) {
    const tier = resolveLiquidityTier(pos);
    buckets[tier] += pos.currentNetCents;
  }

  return { buckets };
}
