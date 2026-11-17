import { describe, it, expect } from 'vitest';
import {
  parseB3AndSinacorRows,
  auditCoeOpportunityCost,
} from '../src/modules/portfolio/sinacor-b3-parser';

describe('WP-02.2: Zero-Token SINACOR/B3 Custody Parser & COE Opportunity Cost Auditor', () => {
  it('parses heterogeneous B3/SINACOR rows into validated UnifiedAssetMathVector[] at 0 LLM token cost', () => {
    const rawRows: Array<Record<string, string>> = [
      {
        assetId: 'b3-tesouro-01',
        ticker: 'NTNB-2035',
        rawCategory: 'TESOURO',
        quantity: '15.50',
        unitPrice: '4210.85',
        expectedReturnAnnual: '0.118',
        liquidityDays: '1',
      },
      {
        assetId: 'b3-lci-02',
        ticker: 'LCI-ITAU-95CDI',
        rawCategory: 'FIXED_INCOME_EXEMPT',
        quantity: '50',
        unitPrice: '1000.00',
        expectedReturnAnnual: '0.106',
        liquidityDays: '90',
      },
      {
        assetId: 'b3-cdb-03',
        ticker: 'CDB-BTG-110CDI',
        rawCategory: 'FIXED_INCOME_TAXABLE',
        quantity: '100',
        unitPrice: '1025.40',
        expectedReturnAnnual: '0.1225',
        liquidityDays: '180',
      },
      {
        assetId: 'sinacor-eq-04',
        ticker: 'WEGE3',
        rawCategory: 'EQUITY_BR',
        quantity: '400',
        unitPrice: '52.30',
        expectedReturnAnnual: '0.155',
        liquidityDays: '2',
      },
      {
        assetId: 'b3-gold-05',
        ticker: 'GOLD11',
        rawCategory: 'GOLD',
        quantity: '250',
        unitPrice: '16.80',
        expectedReturnAnnual: '0.095',
        liquidityDays: '2',
      },
      {
        assetId: 'b3-coe-06',
        ticker: 'COE-SP500-LOCK',
        rawCategory: 'COE',
        quantity: '10',
        unitPrice: '5000.00',
        expectedReturnAnnual: '0.105',
        liquidityDays: '1095',
      },
    ];

    const vectors = parseB3AndSinacorRows(rawRows);

    expect(vectors).toHaveLength(6);

    expect(vectors[0]).toEqual({
      assetId: 'b3-tesouro-01',
      ticker: 'NTNB-2035',
      assetClass: 'TESOURO',
      benchmarkIndexer: 'IPCA',
      quantityDecimal: '15.5',
      unitPriceDecimal: '4210.85',
      expectedReturnAnnual: 0.118,
      volatilityAnnual: 0.04,
      liquidityDays: 1,
      taxRegime: 'REGRESSIVA_RF',
    });

    expect(vectors[1]).toMatchObject({
      ticker: 'LCI-ITAU-95CDI',
      assetClass: 'FIXED_INCOME',
      benchmarkIndexer: 'CDI',
      taxRegime: 'ISENTO',
      volatilityAnnual: 0.015,
    });

    expect(vectors[2]).toMatchObject({
      ticker: 'CDB-BTG-110CDI',
      assetClass: 'FIXED_INCOME',
      benchmarkIndexer: 'CDI',
      taxRegime: 'REGRESSIVA_RF',
      volatilityAnnual: 0.02,
    });

    expect(vectors[3]).toMatchObject({
      ticker: 'WEGE3',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      taxRegime: 'SWING_TRADE_15',
      volatilityAnnual: 0.24,
    });

    expect(vectors[4]).toMatchObject({
      ticker: 'GOLD11',
      assetClass: 'GOLD',
      benchmarkIndexer: 'USD',
      taxRegime: 'SWING_TRADE_15',
      volatilityAnnual: 0.16,
    });

    expect(vectors[5]).toMatchObject({
      ticker: 'COE-SP500-LOCK',
      assetClass: 'COE',
      benchmarkIndexer: 'CDI',
      taxRegime: 'REGRESSIVA_RF',
      volatilityAnnual: 0.08,
      liquidityDays: 1095,
    });
  });

  it('flags a 1095-day locked COE yielding 10.5% a.a. against 11.15% CDI as SUBOPTIMAL_VS_CDI with negative netSpreadVsCdiAnnual', () => {
    const audit = auditCoeOpportunityCost({
      coeTicker: 'COE-SP500-2029',
      expectedReturnAnnual: 0.105,
      cdiBenchmarkAnnual: 0.1115,
      liquidityDays: 1095,
    });

    // illiquidityPenaltyAnnual = (1095 / 365) * 0.0075 = 3 * 0.0075 = 0.0225
    // netSpreadVsCdiAnnual = 0.105 - 0.1115 - 0.0225 = -0.029
    expect(audit.illiquidityPenaltyAnnual).toBe(0.0225);
    expect(audit.netSpreadVsCdiAnnual).toBe(-0.029);
    expect(audit.netSpreadVsCdiAnnual).toBeLessThan(0);
    expect(audit.verdict).toBe('SUBOPTIMAL_VS_CDI');
  });

  it('flags a high-return COE exceeding CDI + illiquidity penalty as COMPETITIVE', () => {
    const audit = auditCoeOpportunityCost({
      coeTicker: 'COE-TECH- uncapped-2027',
      expectedReturnAnnual: 0.145,
      cdiBenchmarkAnnual: 0.1115,
      liquidityDays: 730,
    });

    // illiquidityPenaltyAnnual = (730 / 365) * 0.0075 = 2 * 0.0075 = 0.015
    // netSpreadVsCdiAnnual = 0.145 - 0.1115 - 0.015 = 0.0185
    expect(audit.illiquidityPenaltyAnnual).toBe(0.015);
    expect(audit.netSpreadVsCdiAnnual).toBe(0.0185);
    expect(audit.netSpreadVsCdiAnnual).toBeGreaterThanOrEqual(0);
    expect(audit.verdict).toBe('COMPETITIVE');
  });
});
