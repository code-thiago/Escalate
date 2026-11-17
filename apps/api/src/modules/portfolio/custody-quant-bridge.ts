// apps/api/src/modules/portfolio/custody-quant-bridge.ts
import Decimal from 'decimal.js';
import {
  AssetClassEnum,
  UnifiedAssetMathVector,
  enforceCvmResolution20Grammar,
} from '@escalate/contracts';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_EVEN });

export type AssetClassKey = (typeof AssetClassEnum.options)[number];

export interface CompactPortfolioDigest {
  portfolioName: string;
  assetCount: number;
  totalNetWorth: string;
  classAllocationPct: Record<AssetClassKey, number>;
  weightedReturnAnnual: number;
  diagonalVolatilityAnnual: number;
  sharpeRatio: number;
  topConcentrationTicker: string | null;
  topConcentrationPct: number;
  isCompliant: boolean;
  cvmGuardrailText: string;
  cvmViolationMatch?: string;
  rawHistoricalArraysStripped: true;
}

export function buildCompactPortfolioDigestForAgent(params: {
  portfolioName: string;
  assets: UnifiedAssetMathVector[];
  riskFreeRateAnnual: number;
  cvmCandidateText?: string;
}): CompactPortfolioDigest {
  const classTotals = new Map<AssetClassKey, Decimal>();
  for (const cls of AssetClassEnum.options) {
    classTotals.set(cls, new Decimal(0));
  }

  let totalNetWorth = new Decimal(0);
  const positionValues: Decimal[] = [];
  let maxPositionVal = new Decimal(-1);
  let topConcentrationTicker: string | null = null;

  for (const asset of params.assets) {
    const qty = new Decimal(asset.quantityDecimal);
    const price = new Decimal(asset.unitPriceDecimal);
    const val = qty.mul(price);
    positionValues.push(val);
    totalNetWorth = totalNetWorth.plus(val);

    const prevClassTotal = classTotals.get(asset.assetClass) ?? new Decimal(0);
    classTotals.set(asset.assetClass, prevClassTotal.plus(val));

    if (val.gt(maxPositionVal)) {
      maxPositionVal = val;
      topConcentrationTicker = asset.ticker;
    }
  }

  const classAllocationPct = {} as Record<AssetClassKey, number>;
  for (const cls of AssetClassEnum.options) {
    classAllocationPct[cls] = 0;
  }

  let weightedReturn = new Decimal(0);
  let portfolioVariance = new Decimal(0);
  let topConcentrationPct = 0;

  if (totalNetWorth.gt(0) && params.assets.length > 0) {
    let runningPctSum = new Decimal(0);
    let largestClass: AssetClassKey = params.assets[0].assetClass;
    let largestClassVal = new Decimal(-1);

    for (const cls of AssetClassEnum.options) {
      const clsVal = classTotals.get(cls) ?? new Decimal(0);
      if (clsVal.gt(largestClassVal)) {
        largestClassVal = clsVal;
        largestClass = cls;
      }
      if (clsVal.gt(0)) {
        const pct = clsVal.div(totalNetWorth).mul(100).toDecimalPlaces(2);
        classAllocationPct[cls] = pct.toNumber();
        runningPctSum = runningPctSum.plus(pct);
      }
    }

    const residual = new Decimal(100).minus(runningPctSum);
    if (!residual.isZero()) {
      classAllocationPct[largestClass] = new Decimal(classAllocationPct[largestClass])
        .plus(residual)
        .toDecimalPlaces(2)
        .toNumber();
    }

    for (let i = 0; i < params.assets.length; i++) {
      const weight = positionValues[i].div(totalNetWorth);
      weightedReturn = weightedReturn.plus(
        weight.mul(new Decimal(params.assets[i].expectedReturnAnnual))
      );
      const termVar = weight
        .pow(2)
        .mul(new Decimal(params.assets[i].volatilityAnnual).pow(2));
      portfolioVariance = portfolioVariance.plus(termVar);
    }

    if (maxPositionVal.gt(0)) {
      topConcentrationPct = maxPositionVal
        .div(totalNetWorth)
        .mul(100)
        .toDecimalPlaces(2)
        .toNumber();
    }
  } else {
    topConcentrationTicker = null;
  }

  const diagonalVolatility = portfolioVariance.sqrt();
  const sharpe = diagonalVolatility.isZero()
    ? new Decimal(0)
    : weightedReturn.minus(new Decimal(params.riskFreeRateAnnual)).div(diagonalVolatility);

  const candidateText = (
    params.cvmCandidateText?.trim() ||
    'Resumo matematico consolidado para simulacao quantitativa de carteira.'
  ).slice(0, 280);
  const cvmResult = enforceCvmResolution20Grammar(candidateText);

  return {
    portfolioName: params.portfolioName.slice(0, 80),
    assetCount: params.assets.length,
    totalNetWorth: totalNetWorth.toFixed(2),
    classAllocationPct,
    weightedReturnAnnual: Number(weightedReturn.toFixed(6)),
    diagonalVolatilityAnnual: Number(diagonalVolatility.toFixed(6)),
    sharpeRatio: Number(sharpe.toFixed(4)),
    topConcentrationTicker,
    topConcentrationPct,
    isCompliant: cvmResult.isCompliant,
    cvmGuardrailText: cvmResult.sanitizedText,
    ...(cvmResult.violationMatch ? { cvmViolationMatch: cvmResult.violationMatch } : {}),
    rawHistoricalArraysStripped: true,
  };
}
