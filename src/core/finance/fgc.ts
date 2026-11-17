import type { NormalizedPositionDTO, ProductClass } from "../../connectors/types";

/**
 * FGC Guarantee Ceiling Engine
 * 
 * Implements CMN Resolutions 4.222/2013 and 4.469/2017:
 * - R$ 250,000.00 (25,000,000 cents) cap per CPF per financial conglomerate.
 * - R$ 1,000,000.00 (100,000,000 cents) global ceiling per CPF every 4-year rolling window.
 * 
 * Strict invariant: coveredCents + uncoveredCents === totalEligibleCents
 */

export const FGC_CONGLOMERATE_CAP_CENTS = 25000000n; // R$ 250,000.00
export const FGC_GLOBAL_4_YEAR_CAP_CENTS = 100000000n; // R$ 1,000,000.00

export const FGC_ELIGIBLE_INSTRUMENT_TYPES = new Set<string>([
  "CDB",
  "RDB",
  "LCI",
  "LCA",
  "LC",
  "DPGE",
  "POUPANCA",
  "CONTA_CORRENTE",
]);

export const FGC_INELIGIBLE_CLASSES = new Set<ProductClass>([
  "fundos",
  "bolsa",
  "coe",
  "cripto",
  "tesouro_direto",
  "cambio",
  "etfs",
]);

export interface ConglomerateExposure {
  conglomerateId: string;
  totalCents: bigint;
  coveredCents: bigint;
  excessCents: bigint;
  assetCount: number;
}

export interface FgcAnalysisResult {
  totalEligibleCents: bigint;
  totalIneligibleCents: bigint;
  coveredCents: bigint;
  uncoveredCents: bigint;
  globalCapRemainingCents: bigint;
  isGlobalCapExceeded: boolean;
  conglomerates: ConglomerateExposure[];
  warnings: string[];
}

/**
 * Determines whether a given instrument type and product class is legally eligible for FGC.
 */
export function isFgcEligibleInstrument(productClass: ProductClass, instrumentTypeOrTicker?: string): boolean {
  if (FGC_INELIGIBLE_CLASSES.has(productClass)) {
    return false;
  }

  if (productClass !== "renda_fixa") {
    return false;
  }

  if (!instrumentTypeOrTicker) {
    return true; // Default for renda_fixa if fgcCovered flag is true
  }

  const normalized = instrumentTypeOrTicker.toUpperCase();
  // CRI, CRA, and Debentures are explicitly NOT eligible for FGC
  if (normalized.includes("CRI") || normalized.includes("CRA") || normalized.includes("DEBENTURE")) {
    return false;
  }

  for (const eligibleType of FGC_ELIGIBLE_INSTRUMENT_TYPES) {
    if (normalized.includes(eligibleType)) {
      return true;
    }
  }

  return true;
}

/**
 * Evaluates a single position in isolation against the R$ 250k single conglomerate limit.
 */
export function evaluateFgcPosition(position: {
  currentGrossCents: bigint;
  fgcCovered: boolean;
  institutionId?: string;
  productClass?: ProductClass;
}): { coveredCents: bigint; uncoveredCents: bigint; isCovered: boolean } {
  if (!position.fgcCovered || position.currentGrossCents <= 0n) {
    return {
      coveredCents: 0n,
      uncoveredCents: position.currentGrossCents > 0n ? position.currentGrossCents : 0n,
      isCovered: false,
    };
  }

  const coveredCents = position.currentGrossCents > FGC_CONGLOMERATE_CAP_CENTS
    ? FGC_CONGLOMERATE_CAP_CENTS
    : position.currentGrossCents;

  const uncoveredCents = position.currentGrossCents - coveredCents;

  return {
    coveredCents,
    uncoveredCents,
    isCovered: coveredCents > 0n,
  };
}

/**
 * Calculates consolidated FGC coverage across an entire portfolio of positions.
 * Groups positions by conglomerate/institution, applies the R$ 250k cap per conglomerate,
 * and then enforces the R$ 1,000,000.00 4-year global ceiling.
 */
export function calculateFgcGuarantee(
  positions: NormalizedPositionDTO[],
  historicalUsedCents = 0n
): FgcAnalysisResult {
  let totalEligibleCents = 0n;
  let totalIneligibleCents = 0n;

  const conglomerateMap = new Map<string, { totalCents: bigint; count: number }>();

  for (const pos of positions) {
    const isEligible = pos.fgcCovered && isFgcEligibleInstrument(pos.productClass, pos.tickerOrCode);

    if (isEligible) {
      totalEligibleCents += pos.currentGrossCents;
      const groupKey = pos.institutionId || "DEFAULT_CONGLOMERATE";
      const existing = conglomerateMap.get(groupKey) || { totalCents: 0n, count: 0 };
      existing.totalCents += pos.currentGrossCents;
      existing.count += 1;
      conglomerateMap.set(groupKey, existing);
    } else {
      totalIneligibleCents += pos.currentGrossCents;
    }
  }

  const conglomerates: ConglomerateExposure[] = [];
  const warnings: string[] = [];
  let sumConglomerateCoveredCents = 0n;

  for (const [conglomerateId, data] of conglomerateMap.entries()) {
    const coveredCents = data.totalCents > FGC_CONGLOMERATE_CAP_CENTS
      ? FGC_CONGLOMERATE_CAP_CENTS
      : data.totalCents;

    const excessCents = data.totalCents - coveredCents;

    if (excessCents > 0n) {
      warnings.push(
        `Conglomerate ${conglomerateId} exceeds R$ 250,000.00 cap by R$ ${(Number(excessCents) / 100).toFixed(2)}.`
      );
    }

    sumConglomerateCoveredCents += coveredCents;
    conglomerates.push({
      conglomerateId,
      totalCents: data.totalCents,
      coveredCents,
      excessCents,
      assetCount: data.count,
    });
  }

  // Global 4-year ceiling enforcement
  const globalRemaining = historicalUsedCents >= FGC_GLOBAL_4_YEAR_CAP_CENTS
    ? 0n
    : FGC_GLOBAL_4_YEAR_CAP_CENTS - historicalUsedCents;

  const isGlobalCapExceeded = sumConglomerateCoveredCents > globalRemaining;

  let effectiveCoveredCents: bigint;
  if (isGlobalCapExceeded) {
    effectiveCoveredCents = globalRemaining;
    const globalExcess = sumConglomerateCoveredCents - globalRemaining;
    warnings.push(
      `FGC 4-year global ceiling of R$ 1,000,000.00 exceeded by R$ ${(Number(globalExcess) / 100).toFixed(2)}.`
    );
  } else {
    effectiveCoveredCents = sumConglomerateCoveredCents;
  }

  const uncoveredCents = totalEligibleCents - effectiveCoveredCents;

  return {
    totalEligibleCents,
    totalIneligibleCents,
    coveredCents: effectiveCoveredCents,
    uncoveredCents,
    globalCapRemainingCents: globalRemaining > effectiveCoveredCents ? globalRemaining - effectiveCoveredCents : 0n,
    isGlobalCapExceeded,
    conglomerates,
    warnings,
  };
}
