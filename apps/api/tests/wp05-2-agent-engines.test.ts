// apps/api/tests/wp05-2-agent-engines.test.ts
import { describe, expect, it } from 'vitest';
import { UnifiedAssetMathVector } from '@escalate/contracts';
import { POST as quantPost } from '../../../src/app/api/escalate/quant/route';
import { POST as tradingOcrPost } from '../../../src/app/api/escalate/trading-ocr/route';

describe('WP-05.2 — Agent Quantitative Engines Live API Wiring', () => {
  const sampleAssets: UnifiedAssetMathVector[] = [
    {
      assetId: 'asset-petr4',
      ticker: 'PETR4',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      quantityDecimal: '500.00',
      unitPriceDecimal: '40.00',
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
      unitPriceDecimal: '20.00',
      expectedReturnAnnual: 0.12,
      volatilityAnnual: 0.2,
      liquidityDays: 2,
      taxRegime: 'SWING_TRADE_15',
    },
  ];

  it('Test 1: verifies live handler execution for RUN_DCF, RUN_MARKOWITZ_BL, and BUILD_AGENT_DIGEST via src/app/api/escalate/quant/route.ts', async () => {
    // 1. RUN_DCF
    const dcfReq = new Request('http://localhost:3000/api/escalate/quant', {
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

    const dcfRes = await quantPost(dcfReq);
    expect(dcfRes.status).toBe(200);
    const dcfData = await dcfRes.json();
    expect(dcfData.status).toBe('ok');
    expect(dcfData.result.presentValueCashFlows).toBe('263102.45');
    expect(dcfData.result.presentTerminalValue).toBe('1119630.33');
    expect(dcfData.result.enterpriseValue).toBe('1382732.78');

    // 2. RUN_MARKOWITZ_BL
    const markowitzReq = new Request('http://localhost:3000/api/escalate/quant', {
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
            confidenceOmega: 0.2,
            rationaleDigest: 'Supply constraint shock.',
          },
        ],
      }),
    });

    const markowitzRes = await quantPost(markowitzReq);
    expect(markowitzRes.status).toBe(200);
    const markowitzData = await markowitzRes.json();
    expect(markowitzData.status).toBe('ok');
    expect(markowitzData.markowitz.portfolioVolatilityAnnual).toBeCloseTo(0.1249, 4);
    expect(markowitzData.markowitz.sharpeRatio).toBeGreaterThan(0.25);
    expect(markowitzData.posteriorReturns.PETR4).toBe(0.28);
    expect(markowitzData.posteriorReturns.GOLD11).toBe(0.12);

    // 3. BUILD_AGENT_DIGEST
    const digestReq = new Request('http://localhost:3000/api/escalate/quant', {
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

    const digestRes = await quantPost(digestReq);
    expect(digestRes.status).toBe(200);
    const digestData = await digestRes.json();
    expect(digestData.status).toBe('ok');
    expect(digestData.digest.isCompliant).toBe(false);
    expect(digestData.digest.cvmGuardrailText).toContain('[CVM_RESOLUTION_20_BLOCK]');
    expect(JSON.stringify(digestData.digest).length).toBeLessThan(1400);
  });

  it('Test 2: verifies live handler execution for RUN_GARCH_KALMAN via src/app/api/escalate/trading-ocr/route.ts with 0 tokens debited', async () => {
    const req = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_GARCH_KALMAN',
        tenantId: 'tenant-wp05-2-agent',
        tier: 'FREE_TRIAL',
        garch: {
          omega: 0.00001,
          alpha: 0.12,
          beta: 0.85,
          previousReturnShock: -0.05,
          previousVolatility: 0.015,
        },
        kalman: {
          noisyPrices: [100.0, 100.02, 99.98, 100.01, 104.5],
          processNoiseQ: 0.01,
          measurementNoiseR: 1.0,
          initialEstimate: 100.0,
          initialErrorCov: 0.1,
        },
      }),
    });

    const res = await tradingOcrPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.garch.isStationary).toBe(true);
    expect(data.garch.conditionalVolatility).toBe(0.022389);
    expect(data.kalman.finalKalmanGain).toBeGreaterThan(0);
    expect(data.kalman.finalKalmanGain).toBeLessThan(1);
    expect(typeof data.kalman.latestSpreadZScore).toBe('number');
    expect(data.metering.allowed).toBe(true);
    expect(data.metering.totalUsedTokens).toBe(0);
  });
});
