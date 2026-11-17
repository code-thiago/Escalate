import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  BlackLittermanViewSchema,
  CoeOpportunityAuditSchema,
} from '@escalate/contracts';
import {
  encryptBrokerApiKey,
  decryptBrokerApiKey,
} from '../src/modules/security/envelope-vault';

function flipHexByte(hex: string, byteIndex = 0): string {
  const charOffset = byteIndex * 2;
  const originalByte = Number.parseInt(hex.slice(charOffset, charOffset + 2), 16);
  const flippedByte = (originalByte ^ 0xff).toString(16).padStart(2, '0');
  return `${hex.slice(0, charOffset)}${flippedByte}${hex.slice(charOffset + 2)}`;
}

describe('WP-02.1: Zod Contracts & AES-256-GCM Envelope Vault', () => {
  const masterKeyHex = randomBytes(32).toString('hex');

  it('roundtrips a read-only Binance API key and generates unique 12-byte IVs across calls', () => {
    const plaintextKey = 'bn_ro_7f9d3a12e4b8c091a5d2f6e8b3c1d4a7';

    const firstRecord = encryptBrokerApiKey({
      keyId: 'key-binance-01',
      provider: 'BINANCE_READONLY',
      plaintextKey,
      masterKeyHex,
    });

    const secondRecord = encryptBrokerApiKey({
      keyId: 'key-binance-01',
      provider: 'BINANCE_READONLY',
      plaintextKey,
      masterKeyHex,
    });

    expect(firstRecord.ivHex).toHaveLength(24);
    expect(secondRecord.ivHex).toHaveLength(24);
    expect(firstRecord.authTagHex).toHaveLength(32);
    expect(firstRecord.ivHex).not.toBe(secondRecord.ivHex);
    expect(firstRecord.ciphertextHex).not.toBe(secondRecord.ciphertextHex);

    expect(decryptBrokerApiKey(firstRecord, masterKeyHex)).toBe(plaintextKey);
    expect(decryptBrokerApiKey(secondRecord, masterKeyHex)).toBe(plaintextKey);
  });

  it('deterministically throws VAULT_AUTH_TAG_TAMPERED when ciphertextHex or authTagHex is tampered by 1 byte', () => {
    const record = encryptBrokerApiKey({
      keyId: 'key-b3-01',
      provider: 'B3_CEI',
      plaintextKey: 'b3_cei_ro_secret_987654321',
      masterKeyHex,
    });

    const tamperedCiphertext = {
      ...record,
      ciphertextHex: flipHexByte(record.ciphertextHex, 0),
    };
    const tamperedAuthTag = {
      ...record,
      authTagHex: flipHexByte(record.authTagHex, 0),
    };

    expect(() => decryptBrokerApiKey(tamperedCiphertext, masterKeyHex)).toThrow(
      'VAULT_AUTH_TAG_TAMPERED'
    );
    expect(() => decryptBrokerApiKey(tamperedAuthTag, masterKeyHex)).toThrow(
      'VAULT_AUTH_TAG_TAMPERED'
    );
  });

  it('deterministically throws VAULT_INVALID_MASTER_KEY for invalid masterKeyHex lengths or formats', () => {
    const shortKey = 'abcd'.repeat(8); // 32 chars (16 bytes)
    const longKey = 'ab'.repeat(33); // 66 chars (33 bytes)
    const nonHexKey = 'z'.repeat(64);

    expect(() =>
      encryptBrokerApiKey({
        keyId: 'key-invalid',
        provider: 'BINANCE_READONLY',
        plaintextKey: 'secret',
        masterKeyHex: shortKey,
      })
    ).toThrow('VAULT_INVALID_MASTER_KEY');

    expect(() =>
      encryptBrokerApiKey({
        keyId: 'key-invalid',
        provider: 'BINANCE_READONLY',
        plaintextKey: 'secret',
        masterKeyHex: longKey,
      })
    ).toThrow('VAULT_INVALID_MASTER_KEY');

    expect(() =>
      encryptBrokerApiKey({
        keyId: 'key-invalid',
        provider: 'BINANCE_READONLY',
        plaintextKey: 'secret',
        masterKeyHex: nonHexKey,
      })
    ).toThrow('VAULT_INVALID_MASTER_KEY');

    const validRecord = encryptBrokerApiKey({
      keyId: 'key-valid',
      provider: 'BINANCE_READONLY',
      plaintextKey: 'secret',
      masterKeyHex,
    });

    expect(() => decryptBrokerApiKey(validRecord, shortKey)).toThrow(
      'VAULT_INVALID_MASTER_KEY'
    );
  });

  it('validates BlackLittermanViewSchema and CoeOpportunityAuditSchema bounds', () => {
    const validView = BlackLittermanViewSchema.safeParse({
      ticker: 'PETR4',
      directionalShock: 0.15,
      confidenceOmega: 0.75,
      rationaleDigest: 'Brent stability and disciplined capex allocation.',
    });
    expect(validView.success).toBe(true);

    expect(
      BlackLittermanViewSchema.safeParse({
        ticker: 'PETR4',
        directionalShock: 0.31,
        confidenceOmega: 0.5,
        rationaleDigest: 'Out of upper bound shock.',
      }).success
    ).toBe(false);

    expect(
      BlackLittermanViewSchema.safeParse({
        ticker: 'PETR4',
        directionalShock: -0.31,
        confidenceOmega: 0.5,
        rationaleDigest: 'Out of lower bound shock.',
      }).success
    ).toBe(false);

    expect(
      BlackLittermanViewSchema.safeParse({
        ticker: 'PETR4',
        directionalShock: 0.1,
        confidenceOmega: 0.005,
        rationaleDigest: 'Confidence below 0.01.',
      }).success
    ).toBe(false);

    expect(
      BlackLittermanViewSchema.safeParse({
        ticker: 'PETR4',
        directionalShock: 0.1,
        confidenceOmega: 1.0,
        rationaleDigest: 'Confidence above 0.99.',
      }).success
    ).toBe(false);

    expect(
      BlackLittermanViewSchema.safeParse({
        ticker: 'PETR4',
        directionalShock: 0.1,
        confidenceOmega: 0.5,
        rationaleDigest: 'a'.repeat(281),
      }).success
    ).toBe(false);

    const validCoe = CoeOpportunityAuditSchema.safeParse({
      coeTicker: 'COE-SP500-2028',
      expectedReturnAnnual: 0.095,
      cdiBenchmarkAnnual: 0.1125,
      liquidityDays: 1095,
      illiquidityPenaltyAnnual: 0.025,
      netSpreadVsCdiAnnual: -0.0425,
      verdict: 'SUBOPTIMAL_VS_CDI',
    });
    expect(validCoe.success).toBe(true);

    expect(
      CoeOpportunityAuditSchema.safeParse({
        coeTicker: 'COE-SP500-2028',
        expectedReturnAnnual: 0.095,
        cdiBenchmarkAnnual: 0.1125,
        liquidityDays: -1,
        illiquidityPenaltyAnnual: 0.025,
        netSpreadVsCdiAnnual: -0.0425,
        verdict: 'COMPETITIVE',
      }).success
    ).toBe(false);

    expect(
      CoeOpportunityAuditSchema.safeParse({
        coeTicker: '',
        expectedReturnAnnual: 0.14,
        cdiBenchmarkAnnual: 0.11,
        liquidityDays: 365.5,
        illiquidityPenaltyAnnual: 0.01,
        netSpreadVsCdiAnnual: 0.02,
        verdict: 'COMPETITIVE',
      }).success
    ).toBe(false);
  });
});
