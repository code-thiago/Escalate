// apps/api/tests/wp05-1-conexoes-integration.test.ts
import { describe, expect, it } from 'vitest';
import { POST } from '../../../src/app/api/escalate/custody/route';
import { POST as POST_TRADING } from '../../../src/app/api/escalate/trading-ocr/route';

describe('WP-05.1 — /investimentos/conexoes Live Custody, AES-256-GCM Vault & OCR Integration', () => {
  it('Test 1: sends PARSE_SINACOR_B3 and STORE_BROKER_KEY matching conexoes/page.tsx and asserts HTTP 200, llmTokensUsed: 0, and valid ivHex / authTagHex', async () => {
    const sinacorReq = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PARSE_SINACOR_B3',
        rows: [
          {
            assetId: 'b3-1',
            ticker: 'PETR4',
            rawCategory: 'EQUITY_BR',
            quantity: '100',
            unitPrice: '38.50',
            expectedReturnAnnual: '0.14',
            liquidityDays: '2',
          },
          {
            assetId: 'b3-2',
            ticker: 'TESOURO-IPCA-2035',
            rawCategory: 'TESOURO',
            quantity: '10',
            unitPrice: '3100.00',
            expectedReturnAnnual: '0.12',
            liquidityDays: '1',
          },
        ],
      }),
    });

    const sinacorRes = await POST(sinacorReq);
    expect(sinacorRes.status).toBe(200);
    const sinacorData = await sinacorRes.json();
    expect(sinacorData.status).toBe('ok');
    expect(sinacorData.llmTokensUsed).toBe(0);
    expect(sinacorData.assets).toHaveLength(2);

    const vaultReq = new Request('http://localhost:3000/api/escalate/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'STORE_BROKER_KEY',
        keyId: 'binance-ro-01',
        provider: 'BINANCE_READONLY',
        plaintextKey:
          'demo-readonly-binance-key-64-chars-minimum-length-for-aes-256-gcm',
      }),
    });

    const vaultRes = await POST(vaultReq);
    expect(vaultRes.status).toBe(200);
    const vaultData = await vaultRes.json();
    expect(vaultData.status).toBe('ok');
    expect(vaultData.record.keyId).toBe('binance-ro-01');
    expect(vaultData.record.provider).toBe('BINANCE_READONLY');
    expect(vaultData.record.ivHex).toMatch(/^[0-9a-f]{24}$/i);
    expect(vaultData.record.authTagHex).toMatch(/^[0-9a-f]{32}$/i);
  });

  it('Test 2: sends INGEST_OCR_STATEMENT request and asserts HTTP 200 with normalized vectors', async () => {
    const ocrReq = new Request('http://localhost:3000/api/escalate/trading-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INGEST_OCR_STATEMENT',
        tenantId: 'tenant-wp05-1-conexoes',
        tier: 'FREE_TRIAL',
        requestedTokens: 1200,
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
        ],
      }),
    });

    const ocrRes = await POST_TRADING(ocrReq);
    expect(ocrRes.status).toBe(200);
    const ocrData = await ocrRes.json();
    expect(ocrData.status).toBe('ok');
    expect(ocrData.metering.allowed).toBe(true);
    expect(ocrData.normalized.acceptedVectors).toHaveLength(2);
    expect(ocrData.normalized.acceptedVectors[0].ticker).toBe('COE-AUTOCALL-SP500');
  });
});
