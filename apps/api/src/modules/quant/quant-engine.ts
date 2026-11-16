// apps/api/src/modules/quant/quant-engine.ts
import Decimal from 'decimal.js';
import { UnifiedAssetMathVector } from '@escalate/contracts';

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
