// apps/api/tests/wp02-3-markowitz-bl.test.ts
import { describe, expect, it } from 'vitest';
import { BlackLittermanView, UnifiedAssetMathVector } from '@escalate/contracts';
import {
  applyBlackLittermanViews,
  calculateMarkowitzCovariancePortfolio,
} from '../src/modules/quant/quant-engine';

describe('WP-02.3 — Full N×N Markowitz Covariance Matrix & Black-Litterman Fusion Engine', () => {
  const sampleAssets: UnifiedAssetMathVector[] = [
    {
      assetId: 'asset-petr4',
      ticker: 'PETR4',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      quantityDecimal: '500.00',
      unitPriceDecimal: '40.00', // 20,000.00 (50% weight)
      expectedReturnAnnual: 0.16,
      volatilityAnnual: 0.28,
      liquidityDays: 2,
      taxRegime: 'SWING_TRADE_15',
    },
    {
      assetId: 'asset-gold11',
      ticker: 'GOLD11',
      assetClass: 'GOLD',
      benchmarkIndexer: 'USD',
      quantityDecimal: '1000.00',
      unitPriceDecimal: '20.00', // 20,000.00 (50% weight)
      expectedReturnAnnual: 0.12,
      volatilityAnnual: 0.20,
      liquidityDays: 2,
      taxRegime: 'SWING_TRADE_15',
    },
  ];

  it('Test 1: demonstrates diversification benefit — negative correlation (-0.50) yields strictly lower volatility and higher Sharpe ratio than positive correlation (+0.90)', () => {
    const riskFreeRate = 0.105;

    const negCorrelationMatrix = [
      [1.0, -0.5],
      [-0.5, 1.0],
    ];

    const posCorrelationMatrix = [
      [1.0, 0.9],
      [0.9, 1.0],
    ];

    const diversified = calculateMarkowitzCovariancePortfolio(
      sampleAssets,
      negCorrelationMatrix,
      riskFreeRate
    );
    const concentrated = calculateMarkowitzCovariancePortfolio(
      sampleAssets,
      posCorrelationMatrix,
      riskFreeRate
    );

    expect(diversified.totalValue).toBe('40000.00');
    expect(diversified.weights).toEqual([0.5, 0.5]);
    expect(diversified.expectedReturnAnnual).toBe(0.14);

    // Explicitly verify mathematical off-diagonal covariance impact:
    // w1=0.5, w2=0.5, s1=0.28, s2=0.20
    // w1^2*s1^2 + w2^2*s2^2 = 0.25*0.0784 + 0.25*0.04 = 0.0196 + 0.01 = 0.0296
    // Off-diagonal 2*w1*w2*s1*s2*rho = 0.5 * 0.056 * rho = 0.028 * rho
    // For rho = -0.50 -> var = 0.0296 - 0.014 = 0.0156 -> vol = sqrt(0.0156) = 0.124900
    // For rho = +0.90 -> var = 0.0296 + 0.0252 = 0.0548 -> vol = sqrt(0.0548) = 0.234094
    expect(diversified.portfolioVolatilityAnnual).toBeCloseTo(0.1249, 4);
    expect(concentrated.portfolioVolatilityAnnual).toBeCloseTo(0.234094, 5);

    expect(diversified.portfolioVolatilityAnnual).toBeLessThan(
      concentrated.portfolioVolatilityAnnual
    );
    expect(diversified.sharpeRatio).toBeGreaterThan(concentrated.sharpeRatio);
  });

  it('Test 2: throws MARKOWITZ_INVALID_CORRELATION_MATRIX when matrix dimensions do not match assets.length', () => {
    const malformedMatrix = [[1.0, 0.2, 0.1]];

    expect(() =>
      calculateMarkowitzCovariancePortfolio(sampleAssets, malformedMatrix, 0.105)
    ).toThrowError('MARKOWITZ_INVALID_CORRELATION_MATRIX');

    const malformedRowMatrix = [
      [1.0, 0.2],
      [0.2], // Missing column
    ];

    expect(() =>
      calculateMarkowitzCovariancePortfolio(sampleAssets, malformedRowMatrix, 0.105)
    ).toThrowError('MARKOWITZ_INVALID_CORRELATION_MATRIX');
  });

  it('Test 3: applyBlackLittermanViews clamps extreme geopolitical shocks (+0.28 to +0.15 cap) and blends equilibrium returns Pi with view uncertainty Omega using Decimal', () => {
    const equilibriumReturns: Record<string, number> = {
      PETR4: 0.14,
      VALE3: 0.12,
      ITUB4: 0.11,
    };

    const views: BlackLittermanView[] = [
      {
        ticker: 'PETR4',
        directionalShock: 0.28, // Exceeds +0.15 cap -> clamped to +0.15
        confidenceOmega: 0.20, // Confidence weight (1 - Omega) = 0.80 -> +0.15 * 0.80 = +0.12
        rationaleDigest: 'Geopolitical oil supply shock simulation in Strait of Hormuz.',
      },
      {
        ticker: 'VALE3',
        directionalShock: -0.25, // Exceeds -0.15 cap -> clamped to -0.15
        confidenceOmega: 0.50, // Confidence weight (1 - Omega) = 0.50 -> -0.15 * 0.50 = -0.075
        rationaleDigest: 'Iron ore demand contraction stress scenario.',
      },
    ];

    const posterior = applyBlackLittermanViews(equilibriumReturns, views, 0.15);

    // PETR4: 0.14 + 0.15 * (1 - 0.20) = 0.14 + 0.12 = 0.26
    expect(posterior.PETR4).toBe(0.26);
    // VALE3: 0.12 + (-0.15) * (1 - 0.50) = 0.12 - 0.075 = 0.045
    expect(posterior.VALE3).toBe(0.045);
    // ITUB4: untouched equilibrium return
    expect(posterior.ITUB4).toBe(0.11);
  });
});
