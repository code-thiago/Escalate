// apps/api/tests/quant-and-cvm-guard.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscountedCashFlow, calculatePortfolioSharpe } from '../src/modules/quant/quant-engine';
import { enforceCvmResolution20Grammar, UnifiedAssetMathVector } from '@escalate/contracts';

describe('WP-01: Escalate Deterministic Quant Engine & CVM Guardrail', () => {
  it('computes exact DCF Enterprise Value using 128-bit Decimal arithmetic and rejects WACC <= g', () => {
    const res = calculateDiscountedCashFlow({
      freeCashFlows: ['100000.00', '110000.00', '121000.00'],
      wacc: 0.12,
      terminalGrowthRate: 0.04,
    });
    expect(Number(res.enterpriseValue)).toBeGreaterThan(1300000);

    expect(() =>
      calculateDiscountedCashFlow({
        freeCashFlows: ['100000.00'],
        wacc: 0.05,
        terminalGrowthRate: 0.05,
      })
    ).toThrow('GORULES_MATH_GUARD');
  });

  it('normalizes multiple asset classes into UnifiedAssetMathVector and computes Sharpe Ratio', () => {
    const portfolio: UnifiedAssetMathVector[] = [
      {
        assetId: '1',
        ticker: 'TESOURO-IPCA-2035',
        assetClass: 'TESOURO',
        benchmarkIndexer: 'IPCA',
        quantityDecimal: '100',
        unitPriceDecimal: '2500.50',
        expectedReturnAnnual: 0.125,
        volatilityAnnual: 0.04,
        liquidityDays: 1,
        taxRegime: 'REGRESSIVA_RF',
      },
      {
        assetId: '2',
        ticker: 'BTCUSDT',
        assetClass: 'CRYPTO',
        benchmarkIndexer: 'BTC',
        quantityDecimal: '0.5',
        unitPriceDecimal: '500000.00',
        expectedReturnAnnual: 0.28,
        volatilityAnnual: 0.55,
        liquidityDays: 0,
        taxRegime: 'EXTERIOR_15',
      },
    ];

    const metrics = calculatePortfolioSharpe(portfolio, 0.1115);
    expect(metrics.totalValue).toBe('500050.00');
    expect(metrics.sharpeRatio).toBeGreaterThan(0.3);
  });

  it('intercepts imperative CVM Resolution 20 verbs while permitting analytical scenarios', () => {
    const blocked = enforceCvmResolution20Grammar('Compre PETR4 agora pois esta descontada.');
    expect(blocked.isCompliant).toBe(false);
    expect(blocked.violationMatch?.toLowerCase()).toBe('compre');

    const allowed = enforceCvmResolution20Grammar(
      'Segundo o modelo FCD com WACC de 12%, o valor intrinseco calculado apresenta desagio de 14%.'
    );
    expect(allowed.isCompliant).toBe(true);
    expect(allowed.sanitizedText).toContain('[DISCLAIMER CVM]');
  });
});
