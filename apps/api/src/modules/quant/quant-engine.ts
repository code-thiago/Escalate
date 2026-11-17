// apps/api/src/modules/quant/quant-engine.ts
import Decimal from 'decimal.js';
import { BlackLittermanView, UnifiedAssetMathVector } from '@escalate/contracts';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_EVEN });

export function calculateDiscountedCashFlow(params: {
  freeCashFlows: string[];
  wacc: number;
  terminalGrowthRate: number;
}): { presentValueCashFlows: string; presentTerminalValue: string; enterpriseValue: string } {
  const waccDec = new Decimal(params.wacc);
  const gDec = new Decimal(params.terminalGrowthRate);

  if (waccDec.lte(gDec)) {
    throw new Error('GORULES_MATH_GUARD: WACC must be strictly greater than g');
  }

  let sumPv = new Decimal(0);
  const n = params.freeCashFlows.length;

  for (let t = 0; t < n; t++) {
    const fc = new Decimal(params.freeCashFlows[t]);
    const discountFactor = new Decimal(1).plus(waccDec).pow(t + 1);
    sumPv = sumPv.plus(fc.div(discountFactor));
  }

  const lastFc = new Decimal(params.freeCashFlows[n - 1]);
  const terminalValue = lastFc.mul(new Decimal(1).plus(gDec)).div(waccDec.minus(gDec));
  const presentTerminalValue = terminalValue.div(new Decimal(1).plus(waccDec).pow(n));
  const enterpriseValue = sumPv.plus(presentTerminalValue);

  return {
    presentValueCashFlows: sumPv.toFixed(2),
    presentTerminalValue: presentTerminalValue.toFixed(2),
    enterpriseValue: enterpriseValue.toFixed(2),
  };
}

export function calculatePortfolioSharpe(
  assets: UnifiedAssetMathVector[],
  riskFreeRateAnnual: number
): { totalValue: string; weightedReturn: number; sharpeRatio: number } {
  let totalPortfolioValue = new Decimal(0);
  const positionValues: Decimal[] = [];

  for (const a of assets) {
    const val = new Decimal(a.quantityDecimal).mul(new Decimal(a.unitPriceDecimal));
    positionValues.push(val);
    totalPortfolioValue = totalPortfolioValue.plus(val);
  }

  if (totalPortfolioValue.isZero()) {
    return { totalValue: '0.00', weightedReturn: 0, sharpeRatio: 0 };
  }

  let portfolioReturn = new Decimal(0);
  let portfolioVariance = new Decimal(0);

  for (let i = 0; i < assets.length; i++) {
    const weight = positionValues[i].div(totalPortfolioValue);
    portfolioReturn = portfolioReturn.plus(weight.mul(assets[i].expectedReturnAnnual));
    // Diagonal variance approximation when off-diagonal correlation matrix is neutral
    const termVar = weight.pow(2).mul(new Decimal(assets[i].volatilityAnnual).pow(2));
    portfolioVariance = portfolioVariance.plus(termVar);
  }

  const portfolioVolatility = portfolioVariance.sqrt();
  const sharpe = portfolioVolatility.isZero()
    ? new Decimal(0)
    : portfolioReturn.minus(riskFreeRateAnnual).div(portfolioVolatility);

  return {
    totalValue: totalPortfolioValue.toFixed(2),
    weightedReturn: Number(portfolioReturn.toFixed(6)),
    sharpeRatio: Number(sharpe.toFixed(4)),
  };
}

export function calculateMarkowitzCovariancePortfolio(
  assets: UnifiedAssetMathVector[],
  correlationMatrix: number[][],
  riskFreeRateAnnual: number
): {
  totalValue: string;
  weights: number[];
  expectedReturnAnnual: number;
  portfolioVolatilityAnnual: number;
  sharpeRatio: number;
} {
  const n = assets.length;
  if (
    !Array.isArray(correlationMatrix) ||
    correlationMatrix.length !== n ||
    correlationMatrix.some((row) => !Array.isArray(row) || row.length !== n)
  ) {
    throw new Error('MARKOWITZ_INVALID_CORRELATION_MATRIX');
  }

  let totalPortfolioValue = new Decimal(0);
  const positionValues: Decimal[] = [];

  for (const a of assets) {
    const val = new Decimal(a.quantityDecimal).mul(new Decimal(a.unitPriceDecimal));
    positionValues.push(val);
    totalPortfolioValue = totalPortfolioValue.plus(val);
  }

  if (totalPortfolioValue.isZero()) {
    return {
      totalValue: '0.00',
      weights: assets.map(() => 0),
      expectedReturnAnnual: 0,
      portfolioVolatilityAnnual: 0,
      sharpeRatio: 0,
    };
  }

  const weightsDec: Decimal[] = positionValues.map((v) => v.div(totalPortfolioValue));

  let expectedReturn = new Decimal(0);
  for (let i = 0; i < n; i++) {
    expectedReturn = expectedReturn.plus(weightsDec[i].mul(new Decimal(assets[i].expectedReturnAnnual)));
  }

  let portfolioVariance = new Decimal(0);
  for (let i = 0; i < n; i++) {
    const wi = weightsDec[i];
    const sigmaI = new Decimal(assets[i].volatilityAnnual);
    for (let j = 0; j < n; j++) {
      const wj = weightsDec[j];
      const sigmaJ = new Decimal(assets[j].volatilityAnnual);
      const rhoIJ = new Decimal(correlationMatrix[i][j]);
      const covTerm = wi.mul(wj).mul(sigmaI).mul(sigmaJ).mul(rhoIJ);
      portfolioVariance = portfolioVariance.plus(covTerm);
    }
  }

  const clampedVariance = portfolioVariance.isNegative() ? new Decimal(0) : portfolioVariance;
  const portfolioVolatility = clampedVariance.sqrt();

  const sharpe = portfolioVolatility.isZero()
    ? new Decimal(0)
    : expectedReturn.minus(new Decimal(riskFreeRateAnnual)).div(portfolioVolatility);

  return {
    totalValue: totalPortfolioValue.toFixed(2),
    weights: weightsDec.map((w) => Number(w.toFixed(6))),
    expectedReturnAnnual: Number(expectedReturn.toFixed(6)),
    portfolioVolatilityAnnual: Number(portfolioVolatility.toFixed(6)),
    sharpeRatio: Number(sharpe.toFixed(4)),
  };
}

export function applyBlackLittermanViews(
  equilibriumReturns: Record<string, number>,
  views: BlackLittermanView[],
  maxShockCap = 0.15
): Record<string, number> {
  const capDec = new Decimal(maxShockCap).abs();
  const posteriorDec: Record<string, Decimal> = {};

  for (const [ticker, eqReturn] of Object.entries(equilibriumReturns)) {
    posteriorDec[ticker] = new Decimal(eqReturn);
  }

  for (const view of views) {
    const basePi = posteriorDec[view.ticker] ?? new Decimal(equilibriumReturns[view.ticker] ?? 0);
    const rawShock = new Decimal(view.directionalShock);
    const clampedShock = Decimal.max(capDec.neg(), Decimal.min(capDec, rawShock));
    const confidenceWeight = new Decimal(1).minus(new Decimal(view.confidenceOmega));
    posteriorDec[view.ticker] = basePi.plus(clampedShock.mul(confidenceWeight));
  }

  const result: Record<string, number> = {};
  for (const [ticker, decVal] of Object.entries(posteriorDec)) {
    result[ticker] = Number(decVal.toFixed(6));
  }

  return result;
}
