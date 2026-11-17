// apps/api/tests/wp02-4-bridge.test.ts
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { UnifiedAssetMathVector } from '@escalate/contracts';
import { buildCompactPortfolioDigestForAgent } from '../src/modules/portfolio/custody-quant-bridge';

describe('WP-02.4: Zero-Raw-Data Pre-LLM Custody Quant Bridge', () => {
  const sampleAssets: UnifiedAssetMathVector[] = [
    {
      assetId: 'asset-tesouro-01',
      ticker: 'TESOURO-SELIC-2029',
      assetClass: 'TESOURO',
      benchmarkIndexer: 'SELIC',
      quantityDecimal: '50',
      unitPriceDecimal: '14000.00',
      expectedReturnAnnual: 0.1125,
      volatilityAnnual: 0.015,
      liquidityDays: 1,
      taxRegime: 'REGRESSIVA_RF',
    },
    {
      assetId: 'asset-eq-br-01',
      ticker: 'WEGE3',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      quantityDecimal: '4000',
      unitPriceDecimal: '50.00',
      expectedReturnAnnual: 0.165,
      volatilityAnnual: 0.24,
      liquidityDays: 2,
      taxRegime: 'SWING_TRADE_15',
    },
    {
      assetId: 'asset-crypto-01',
      ticker: 'BTCUSDT',
      assetClass: 'CRYPTO',
      benchmarkIndexer: 'BTC',
      quantityDecimal: '0.2',
      unitPriceDecimal: '500000.00',
      expectedReturnAnnual: 0.28,
      volatilityAnnual: 0.58,
      liquidityDays: 0,
      taxRegime: 'EXTERIOR_15',
    },
  ];

  it('generates a compact pre-LLM portfolio digest with exact Decimal net worth, class percentages summing to 100, and payload < 1400 chars', () => {
    const digest = buildCompactPortfolioDigestForAgent({
      portfolioName: 'Master Sovereign Custody Vault',
      assets: sampleAssets,
      riskFreeRateAnnual: 0.1075,
      cvmCandidateText:
        'A carteira apresenta exposicao majoritaria em renda fixa soberana com volatilidade diagonal controlada.',
    });

    // 50 * 14000 = 700,000.00 | 4000 * 50 = 200,000.00 | 0.2 * 500000 = 100,000.00 -> Total = 1,000,000.00
    expect(digest.totalNetWorth).toBe('1000000.00');
    expect(digest.assetCount).toBe(3);
    expect(digest.topConcentrationTicker).toBe('TESOURO-SELIC-2029');
    expect(digest.topConcentrationPct).toBe(70);

    expect(digest.classAllocationPct.TESOURO).toBe(70);
    expect(digest.classAllocationPct.EQUITY_BR).toBe(20);
    expect(digest.classAllocationPct.CRYPTO).toBe(10);

    const pctSum = Object.values(digest.classAllocationPct).reduce(
      (acc, val) => acc.plus(new Decimal(val)),
      new Decimal(0)
    );
    expect(pctSum.toNumber()).toBe(100);

    expect(digest.weightedReturnAnnual).toBeGreaterThan(0.11);
    expect(digest.diagonalVolatilityAnnual).toBeGreaterThan(0);
    expect(digest.sharpeRatio).toBeGreaterThan(0);
    expect(digest.isCompliant).toBe(true);
    expect(digest.cvmGuardrailText).toContain('[DISCLAIMER CVM]');
    expect(digest.rawHistoricalArraysStripped).toBe(true);

    const serialized = JSON.stringify(digest);
    expect(serialized.length).toBeLessThan(1400);
  });

  it('triggers isCompliant: false and injects deterministic [CVM_RESOLUTION_20_BLOCK] when cvmCandidateText contains imperative recommendation verbs', () => {
    const digest = buildCompactPortfolioDigestForAgent({
      portfolioName: 'Master Sovereign Custody Vault',
      assets: sampleAssets,
      riskFreeRateAnnual: 0.1075,
      cvmCandidateText: 'Venda WEGE3 e compre agora mais TESOURO-SELIC-2029 para reduzir o risco.',
    });

    expect(digest.isCompliant).toBe(false);
    expect(digest.cvmViolationMatch?.toLowerCase()).toBe('venda');
    expect(digest.cvmGuardrailText).toContain('[CVM_RESOLUTION_20_BLOCK]');
    expect(JSON.stringify(digest).length).toBeLessThan(1400);
  });
});
