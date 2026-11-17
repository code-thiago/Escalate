// apps/api/tests/wp03-2-quant-api.test.ts
import { describe, expect, it } from 'vitest';
import { UnifiedAssetMathVector } from '@escalate/contracts';
import { POST } from '../../../src/app/api/escalate/quant/route';

describe('WP-03.2 — Next.js API Route for Markowitz Covariance, DCF, Black-Litterman & Pre-LLM Agent Digest', () => {
  const sampleAssets: UnifiedAssetMathVector[] = [
    {
      assetId: 'asset-petr4',
      ticker: 'PETR4',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      quantityDecimal: '500.00',
      unitPriceDecimal: '40.00', // 20,000.00
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
      unitPriceDecimal: '20.00', // 20,000.00
      expectedReturnAnnual: 0.12,
      volatilityAnnual: 0.20,
      liquidityDays: 2,
      taxRegime: 'SWING_TRADE_15',
    },
  ];

  it('Test 1: RUN_DCF returns exact enterpriseValue on valid inputs and HTTP 422 when wacc <= terminalGrowthRate', async () => {
    const validReq = new Request('http://localhost:3000/api/escalate/quant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_DCF',
        freeCashFlows: ['100000.00', '110000.00', '121000.00'],
        wacc: 0.12,
        terminalGrowthRate: 0.04,
        netDebtDecimal: '50000.00',
        sharesOutstandingDecimal: '10000.00',
      }),
    });

    const validRes = await POST(validReq);
    expect(validRes.status).toBe(200);
    const validBody = await validRes.json();
    expect(validBody.status).toBe('ok');
    expect(validBody.result.enterpriseValue).toBe('1382732.78');

    const invalidReq = new Request('http://localhost:3000/api/escalate/quant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_DCF',
        freeCashFlows: ['100000.00', '110000.00'],
        wacc: 0.05,
        terminalGrowthRate: 0.06, // wacc <= g -> must fail with 422
        netDebtDecimal: '0.00',
        sharesOutstandingDecimal: '1000.00',
      }),
    });

    const invalidRes = await POST(invalidReq);
    expect(invalidRes.status).toBe(422);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.error).toContain('GORULES_GUARD_VIOLATION');
  });

  it('Test 2: RUN_MARKOWITZ_BL returns full covariance metrics and clamped Black-Litterman posterior returns', async () => {
    const req = new Request('http://localhost:3000/api/escalate/quant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_MARKOWITZ_BL',
        assets: sampleAssets,
        correlationMatrix: [
          [1.0, -0.5],
          [-0.5, 1.0],
        ],
        riskFreeRateAnnual: 0.105,
        views: [
          {
            ticker: 'PETR4',
            directionalShock: 0.28, // Clamped to +0.15
            confidenceOmega: 0.20, // Weight = 0.80 -> +0.12
            rationaleDigest: 'Supply constraint shock.',
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.markowitz.totalValue).toBe('40000.00');
    expect(data.markowitz.portfolioVolatilityAnnual).toBeCloseTo(0.1249, 4);
    expect(data.markowitz.sharpeRatio).toBeGreaterThan(0.25);
    // PETR4 equilibrium is 0.16 -> 0.16 + 0.15 * (1 - 0.20) = 0.28
    expect(data.posteriorReturns.PETR4).toBe(0.28);
    expect(data.posteriorReturns.GOLD11).toBe(0.12);
  });

  it('Test 3: BUILD_AGENT_DIGEST returns a compact < 1400 char digest and blocks imperative CVM verbs ("Compre agora")', async () => {
    const req = new Request('http://localhost:3000/api/escalate/quant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'BUILD_AGENT_DIGEST',
        portfolioName: 'Carteira Institucional Alpha',
        assets: sampleAssets,
        riskFreeRateAnnual: 0.105,
        cvmCandidateText: 'Compre agora PETR4 para maximizar retorno no curto prazo.',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.digest.isCompliant).toBe(false);
    expect(data.digest.cvmGuardrailText).toContain('[CVM_RESOLUTION_20_BLOCK]');
    expect(data.digest.rawHistoricalArraysStripped).toBe(true);
    expect(JSON.stringify(data.digest).length).toBeLessThan(1400);
  });
});
