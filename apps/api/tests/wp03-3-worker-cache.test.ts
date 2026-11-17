// apps/api/tests/wp03-3-worker-cache.test.ts
import { describe, it, expect, vi } from 'vitest';
import { UnifiedAssetMathVector } from '@escalate/contracts';
import { SemanticAssetCache } from '../src/modules/agent/semantic-asset-cache';
import { runQuantTaskIsolated } from '../src/modules/quant/quant-worker-pool';
import { calculateMarkowitzCovariancePortfolio } from '../src/modules/quant/quant-engine';

describe('WP-03.3: 6-Hour Multi-Tenant Semantic Asset Cache & Off-Thread Quant Executor', () => {
  it('coalesces 100 concurrent subscribers querying NVDA within a 6-hour window into 1 computeFn call and 99 cache hits', async () => {
    const cache = new SemanticAssetCache();
    const baseTimeMs = 1_700_000_000_000;

    const computeFn = vi.fn(async () => ({
      summary: 'NVDA structural AI datacenter demand remains resilient with Blackwell ramp.',
      geopoliticalShock: -0.02,
      tokensUsed: 1250,
    }));

    const requests = Array.from({ length: 100 }, (_, idx) =>
      cache.getOrComputeAssetStructuralDigest(
        idx % 2 === 0 ? 'nvda' : ' NVDA ',
        baseTimeMs + idx * 1000,
        computeFn
      )
    );

    const results = await Promise.all(requests);

    expect(computeFn).toHaveBeenCalledTimes(1);

    const misses = results.filter((r) => !r.cacheHit);
    const hits = results.filter((r) => r.cacheHit);

    expect(misses).toHaveLength(1);
    expect(misses[0].tokensSaved).toBe(0);
    expect(hits).toHaveLength(99);

    const totalTokensSaved = results.reduce((acc, r) => acc + r.tokensSaved, 0);
    expect(totalTokensSaved).toBe(99 * 1250);
    expect(cache.getTotalTokensSaved()).toBe(99 * 1250);
    expect(results.every((r) => r.ticker === 'NVDA')).toBe(true);
  });

  it('expires cached entry and recomputes when nowMs advances past 6 hours (21_600_001 ms)', async () => {
    const cache = new SemanticAssetCache();
    const t0 = 1_700_000_000_000;
    let callCount = 0;

    const computeFn = vi.fn(async () => {
      callCount += 1;
      return {
        summary: `PETR4 structural digest v${callCount}`,
        geopoliticalShock: callCount === 1 ? 0.03 : 0.05,
        tokensUsed: 900,
      };
    });

    const first = await cache.getOrComputeAssetStructuralDigest('petr4', t0, computeFn);
    expect(first.cacheHit).toBe(false);
    expect(first.summary).toBe('PETR4 structural digest v1');

    // Within 6h window (21_599_999 ms elapsed)
    const withinWindow = await cache.getOrComputeAssetStructuralDigest(
      'PETR4',
      t0 + 21_599_999,
      computeFn
    );
    expect(withinWindow.cacheHit).toBe(true);
    expect(withinWindow.tokensSaved).toBe(900);
    expect(computeFn).toHaveBeenCalledTimes(1);

    // Past 6h window (21_600_001 ms elapsed)
    const expired = await cache.getOrComputeAssetStructuralDigest(
      'PETR4',
      t0 + 21_600_001,
      computeFn
    );
    expect(expired.cacheHit).toBe(false);
    expect(expired.tokensSaved).toBe(0);
    expect(expired.summary).toBe('PETR4 structural digest v2');
    expect(expired.geopoliticalShock).toBe(0.05);
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  it('executes MARKOWITZ quant task isolated off the request turn with timing telemetry and exact output', async () => {
    const assets: UnifiedAssetMathVector[] = [
      {
        assetId: 'asset-1',
        ticker: 'TESOURO-IPCA-2035',
        assetClass: 'TESOURO',
        benchmarkIndexer: 'IPCA',
        quantityDecimal: '60',
        unitPriceDecimal: '1000.00',
        expectedReturnAnnual: 0.12,
        volatilityAnnual: 0.05,
        liquidityDays: 1,
        taxRegime: 'REGRESSIVA_RF',
      },
      {
        assetId: 'asset-2',
        ticker: 'WEGE3',
        assetClass: 'EQUITY_BR',
        benchmarkIndexer: 'IBOV',
        quantityDecimal: '800',
        unitPriceDecimal: '50.00',
        expectedReturnAnnual: 0.18,
        volatilityAnnual: 0.22,
        liquidityDays: 2,
        taxRegime: 'SWING_TRADE_15',
      },
    ];

    const payload = {
      assets,
      correlationMatrix: [
        [1, 0.25],
        [0.25, 1],
      ],
      riskFreeRateAnnual: 0.105,
    };

    const result = await runQuantTaskIsolated('MARKOWITZ', payload, (input) =>
      calculateMarkowitzCovariancePortfolio(
        input.assets,
        input.correlationMatrix,
        input.riskFreeRateAnnual
      )
    );

    expect(result.taskName).toBe('MARKOWITZ');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.output.totalValue).toBe('100000.00');
    expect(result.output.weights).toEqual([0.6, 0.4]);
    expect(result.output.expectedReturnAnnual).toBeCloseTo(0.144, 6);
    expect(result.output.portfolioVolatilityAnnual).toBeGreaterThan(0);
    expect(result.output.sharpeRatio).toBeGreaterThan(0);
  });
});
