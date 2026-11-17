// apps/api/tests/wp04-2-ocr-metering.test.ts
import { describe, it, expect } from 'vitest';
import { SaaSTokenMeter } from '../src/modules/billing/saas-token-meter';
import { normalizeOcrExtractedHoldings } from '../src/modules/portfolio/ocr-statement-normalizer';

describe('WP-04.2: Atomic SaaS Token Metering (ADR-002) & OCR Private Statement Normalizer', () => {
  it('allows zero-token deterministic calls without debiting quota, debits LLM calls accurately, and blocks with SAAS_TOKEN_QUOTA_EXCEEDED when FREE_TRIAL (25,000) is exceeded', () => {
    const meter = new SaaSTokenMeter();
    const tenantId = 'tenant-free-trial-01';

    // 1. Deterministic route (SINACOR / GoRules / Decimal Quant) debits 0 tokens
    const detRes = meter.authorizeAndDebitTokens({
      tenantId,
      tier: 'FREE_TRIAL',
      requestedTokens: 4_500,
      isZeroTokenDeterministicRoute: true,
    });
    expect(detRes).toEqual({
      allowed: true,
      remainingTokens: 25_000,
      totalUsedTokens: 0,
    });

    // 2. First LLM call (15,000 tokens)
    const firstLlmRes = meter.authorizeAndDebitTokens({
      tenantId,
      tier: 'FREE_TRIAL',
      requestedTokens: 15_000,
    });
    expect(firstLlmRes).toEqual({
      allowed: true,
      remainingTokens: 10_000,
      totalUsedTokens: 15_000,
    });

    // 3. Second LLM call exceeding remaining quota (15,000 + 12,000 = 27,000 > 25,000)
    const blockedRes = meter.authorizeAndDebitTokens({
      tenantId,
      tier: 'FREE_TRIAL',
      requestedTokens: 12_000,
    });
    expect(blockedRes).toEqual({
      allowed: false,
      remainingTokens: 10_000,
      totalUsedTokens: 15_000,
      reason: 'SAAS_TOKEN_QUOTA_EXCEEDED',
    });

    // 4. Subsequent deterministic route still executes at 0 token cost even near/at quota
    const postBlockDetRes = meter.authorizeAndDebitTokens({
      tenantId,
      tier: 'FREE_TRIAL',
      requestedTokens: 99_000,
      isZeroTokenDeterministicRoute: true,
    });
    expect(postBlockDetRes.allowed).toBe(true);
    expect(postBlockDetRes.totalUsedTokens).toBe(15_000);
  });

  it('accepts high-confidence (>= 0.80) COE and PGBL/VGBL holdings into UnifiedAssetMathVector[] and isolates low-confidence (0.62) OCR reads into rejectedLowConfidence', () => {
    const rawOcrItems = [
      {
        tickerOrName: 'COE-AUTOCALL-TECH-2028',
        categoryHint: 'COE' as const,
        grossBalanceBrl: '125000.5',
        contractedRateAnnual: 0.118,
        lockupDays: 1095,
        confidenceScore: 0.94,
      },
      {
        tickerOrName: 'VGBL-ICATU-SOBERANO-RF',
        categoryHint: 'PREV' as const,
        grossBalanceBrl: '340200.00',
        contractedRateAnnual: 0.112,
        lockupDays: 60,
        confidenceScore: 0.80,
      },
      {
        tickerOrName: 'DEB-BLURRED-OCR-SCAN',
        categoryHint: 'FIXED_INCOME' as const,
        grossBalanceBrl: '89000.00',
        contractedRateAnnual: 0.135,
        lockupDays: 365,
        confidenceScore: 0.62,
      },
    ];

    const result = normalizeOcrExtractedHoldings(rawOcrItems);

    expect(result.acceptedVectors).toHaveLength(2);
    expect(result.rejectedLowConfidence).toEqual(['DEB-BLURRED-OCR-SCAN']);

    expect(result.acceptedVectors[0]).toMatchObject({
      ticker: 'COE-AUTOCALL-TECH-2028',
      assetClass: 'COE',
      benchmarkIndexer: 'CDI',
      quantityDecimal: '1',
      unitPriceDecimal: '125000.50',
      expectedReturnAnnual: 0.118,
      liquidityDays: 1095,
      taxRegime: 'REGRESSIVA_RF',
    });

    expect(result.acceptedVectors[1]).toMatchObject({
      ticker: 'VGBL-ICATU-SOBERANO-RF',
      assetClass: 'PREV',
      benchmarkIndexer: 'CDI',
      quantityDecimal: '1',
      unitPriceDecimal: '340200.00',
      expectedReturnAnnual: 0.112,
      liquidityDays: 60,
      taxRegime: 'REGRESSIVA_PREV',
    });
  });
});
