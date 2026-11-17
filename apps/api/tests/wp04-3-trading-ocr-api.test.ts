// apps/api/tests/wp04-3-trading-ocr-api.test.ts
import { describe, expect, it } from 'vitest';
import { POST } from '../../../src/app/api/escalate/trading-ocr/route';

describe('WP-04.3: Unified Trading (GARCH/Kalman) & OCR Metered API Route', () => {
  it('executes RUN_GARCH_KALMAN returning HTTP 200 with GARCH volatility, Kalman filtered series, and 0 debited LLM tokens', async () => {
    const req = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_GARCH_KALMAN',
        tenantId: 'tenant-quant-wp04',
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

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.garch.isStationary).toBe(true);
    expect(data.garch.conditionalVariance).toBe(0.00050125);
    expect(data.garch.conditionalVolatility).toBe(0.022389);
    expect(data.kalman.filteredPrices).toHaveLength(5);
    expect(data.kalman.finalKalmanGain).toBeGreaterThan(0);
    expect(data.kalman.finalKalmanGain).toBeLessThan(1);
    expect(data.metering.allowed).toBe(true);
    expect(data.metering.totalUsedTokens).toBe(0);
    expect(data.metering.remainingTokens).toBe(25_000);

    // Verify 422 on non-stationary GARCH parameters
    const invalidReq = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_GARCH_KALMAN',
        tenantId: 'tenant-quant-wp04',
        tier: 'FREE_TRIAL',
        garch: {
          omega: 0.00001,
          alpha: 0.25,
          beta: 0.80,
          previousReturnShock: 0.02,
          previousVolatility: 0.015,
        },
        kalman: {
          noisyPrices: [100.0, 101.0],
          processNoiseQ: 0.01,
          measurementNoiseR: 1.0,
        },
      }),
    });

    const invalidRes = await POST(invalidReq);
    expect(invalidRes.status).toBe(422);
    const invalidData = await invalidRes.json();
    expect(invalidData.error).toContain('GARCH_NON_STATIONARY_PARAMS');
  });

  it('normalizes high-confidence COE/Previdencia OCR items when quota is available and returns HTTP 429 when token allowance is exhausted', async () => {
    const firstPassReq = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INGEST_OCR_STATEMENT',
        tenantId: 'tenant-ocr-quota-test',
        tier: 'FREE_TRIAL',
        requestedTokens: 18_000,
        items: [
          {
            tickerOrName: 'COE-AUTOCALL-SP500',
            categoryHint: 'COE',
            grossBalanceBrl: '75000.00',
            contractedRateAnnual: 0.115,
            lockupDays: 730,
            confidenceScore: 0.94,
          },
          {
            tickerOrName: 'VGBL-ICATU-SELIC',
            categoryHint: 'PREV',
            grossBalanceBrl: '120000.50',
            contractedRateAnnual: 0.108,
            lockupDays: 30,
            confidenceScore: 0.89,
          },
          {
            tickerOrName: 'BLURRED-OCR-LINE',
            categoryHint: 'FIXED_INCOME',
            grossBalanceBrl: '999999.00',
            contractedRateAnnual: 0.25,
            lockupDays: 90,
            confidenceScore: 0.62,
          },
        ],
      }),
    });

    const firstPassRes = await POST(firstPassReq);
    expect(firstPassRes.status).toBe(200);

    const firstPassData = await firstPassRes.json();
    expect(firstPassData.status).toBe('ok');
    expect(firstPassData.normalized.acceptedVectors).toHaveLength(2);
    expect(firstPassData.normalized.rejectedLowConfidence).toEqual(['BLURRED-OCR-LINE']);
    expect(firstPassData.metering.allowed).toBe(true);
    expect(firstPassData.metering.totalUsedTokens).toBe(18_000);
    expect(firstPassData.metering.remainingTokens).toBe(7_000);

    // Exhaust FREE_TRIAL quota (18,000 + 10,000 > 25,000)
    const quotaExceededReq = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INGEST_OCR_STATEMENT',
        tenantId: 'tenant-ocr-quota-test',
        tier: 'FREE_TRIAL',
        requestedTokens: 10_000,
        items: [
          {
            tickerOrName: 'COE-EXTRA-OVERQUOTA',
            categoryHint: 'COE',
            grossBalanceBrl: '50000.00',
            contractedRateAnnual: 0.11,
            lockupDays: 365,
            confidenceScore: 0.95,
          },
        ],
      }),
    });

    const quotaExceededRes = await POST(quotaExceededReq);
    expect(quotaExceededRes.status).toBe(429);

    const quotaExceededData = await quotaExceededRes.json();
    expect(quotaExceededData.error).toBe('SAAS_TOKEN_QUOTA_EXCEEDED');
    expect(quotaExceededData.metering.allowed).toBe(false);
    expect(quotaExceededData.metering.totalUsedTokens).toBe(18_000);
    expect(quotaExceededData.metering.remainingTokens).toBe(7_000);
  });
});
