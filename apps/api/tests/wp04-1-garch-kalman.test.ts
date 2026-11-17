// apps/api/tests/wp04-1-garch-kalman.test.ts
import { describe, expect, it } from 'vitest';
import {
  calculateGarch11ConditionalVolatility,
  runKalmanFilterPriceSeries,
} from '../src/modules/quant/trading-stochastic-engine';

describe('WP-04.1: Isolated Warm/Hot Path Trading Engine (GARCH(1,1) & Kalman Filter)', () => {
  it('computes exact GARCH(1,1) conditional volatility spike after a large return shock and verifies stationarity', () => {
    const result = calculateGarch11ConditionalVolatility({
      omega: 0.00001,
      alpha: 0.12,
      beta: 0.85,
      previousReturnShock: -0.05,
      previousVolatility: 0.015,
    });

    // Variance = 0.00001 + 0.12 * (0.0025) + 0.85 * (0.000225) = 0.00050125
    expect(result.isStationary).toBe(true);
    expect(result.conditionalVariance).toBe(0.00050125);
    expect(result.conditionalVolatility).toBe(0.022389);
    expect(result.conditionalVolatility).toBeGreaterThan(0.015);
  });

  it('throws GARCH_NON_STATIONARY_PARAMS when alpha + beta >= 1 or parameters are invalid', () => {
    expect(() =>
      calculateGarch11ConditionalVolatility({
        omega: 0.00001,
        alpha: 0.25,
        beta: 0.8,
        previousReturnShock: 0.02,
        previousVolatility: 0.015,
      })
    ).toThrow('GARCH_NON_STATIONARY_PARAMS');

    expect(() =>
      calculateGarch11ConditionalVolatility({
        omega: 0,
        alpha: 0.1,
        beta: 0.8,
        previousReturnShock: 0.01,
        previousVolatility: 0.015,
      })
    ).toThrow('GARCH_NON_STATIONARY_PARAMS');
  });

  it('runs 1D Kalman Filter over a noisy price series with a sudden outlier tick and smooths trajectory', () => {
    const trueTrend = 100.0;
    const rawOutlier = 105.0;
    const noisyPrices = [100.0, 100.02, 99.98, 100.01, rawOutlier];

    const result = runKalmanFilterPriceSeries({
      noisyPrices,
      processNoiseQ: 0.01,
      measurementNoiseR: 1.0,
      initialEstimate: 100.0,
      initialErrorCov: 0.1,
    });

    expect(result.filteredPrices).toHaveLength(noisyPrices.length);
    const filteredAtOutlier = result.filteredPrices[result.filteredPrices.length - 1];

    expect(Math.abs(filteredAtOutlier - trueTrend)).toBeLessThan(
      Math.abs(rawOutlier - trueTrend)
    );
    expect(result.finalKalmanGain).toBeGreaterThan(0);
    expect(result.finalKalmanGain).toBeLessThan(1);
    expect(result.latestSpreadZScore).toBeGreaterThan(2.0);
  });
});
