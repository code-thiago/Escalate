import { describe, it, expect } from 'vitest';
import { POST } from '../../../src/app/api/escalate/custody/route';

describe('WP-03.1: Next.js API Route for Zero-Token SINACOR/B3 Ingestion, COE Audit & AES-256-GCM Vault', () => {
  it('POST with action PARSE_SINACOR_B3 returns HTTP 200, llmTokensUsed: 0, and normalized UnifiedAssetMathVector[]', async () => {
    const request = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PARSE_SINACOR_B3',
        rows: [
          {
            assetId: 'b3-ntnb-2035',
            ticker: 'NTNB-2035',
            rawCategory: 'TESOURO',
            quantity: '20',
            unitPrice: '4150.50',
            expectedReturnAnnual: '0.118',
            liquidityDays: '1',
          },
          {
            assetId: 'sinacor-petr4',
            ticker: 'PETR4',
            rawCategory: 'EQUITY_BR',
            quantity: '300',
            unitPrice: '38.25',
            expectedReturnAnnual: '0.145',
            liquidityDays: '2',
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.llmTokensUsed).toBe(0);
    expect(body.assets).toHaveLength(2);
    expect(body.assets[0]).toMatchObject({
      assetId: 'b3-ntnb-2035',
      ticker: 'NTNB-2035',
      assetClass: 'TESOURO',
      benchmarkIndexer: 'IPCA',
      quantityDecimal: '20',
      unitPriceDecimal: '4150.5',
      taxRegime: 'REGRESSIVA_RF',
    });
    expect(body.assets[1]).toMatchObject({
      assetId: 'sinacor-petr4',
      ticker: 'PETR4',
      assetClass: 'EQUITY_BR',
      benchmarkIndexer: 'IBOV',
      quantityDecimal: '300',
      unitPriceDecimal: '38.25',
      taxRegime: 'SWING_TRADE_15',
    });
  });

  it('POST with action AUDIT_COE returns HTTP 200 and flags a suboptimal COE vs CDI', async () => {
    const request = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'AUDIT_COE',
        coeTicker: 'COE-SP500-LOCK-2029',
        expectedReturnAnnual: 0.105,
        cdiBenchmarkAnnual: 0.1115,
        liquidityDays: 1095,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.llmTokensUsed).toBe(0);
    expect(body.audit).toMatchObject({
      coeTicker: 'COE-SP500-LOCK-2029',
      illiquidityPenaltyAnnual: 0.0225,
      netSpreadVsCdiAnnual: -0.029,
      verdict: 'SUBOPTIMAL_VS_CDI',
    });
  });

  it('POST with action STORE_BROKER_KEY returns HTTP 200 with encrypted AES-256-GCM payload and guarantees plaintextKey is absent from the response body', async () => {
    const rawSecretKey = 'bn_ro_ultra_sensitive_secret_key_99887766';
    const request = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'STORE_BROKER_KEY',
        keyId: 'key-binance-prod-01',
        provider: 'BINANCE_READONLY',
        plaintextKey: rawSecretKey,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const rawText = await response.clone().text();
    expect(rawText).not.toContain(rawSecretKey);
    expect(rawText).not.toContain('plaintextKey');

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.record.keyId).toBe('key-binance-prod-01');
    expect(body.record.provider).toBe('BINANCE_READONLY');
    expect(body.record.ivHex).toHaveLength(24);
    expect(body.record.authTagHex).toHaveLength(32);
    expect(body.record.ciphertextHex).toMatch(/^[0-9a-fA-F]+$/);
    expect('plaintextKey' in body.record).toBe(false);
  });
});
