import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import {
  EncryptedApiVaultRecord,
  EncryptedApiVaultRecordSchema,
} from '@escalate/contracts';

const MASTER_KEY_HEX_REGEX = /^[0-9a-fA-F]{64}$/;
const HEX_REGEX = /^[0-9a-fA-F]+$/;

function parseMasterKey(masterKeyHex: string): Buffer {
  if (!MASTER_KEY_HEX_REGEX.test(masterKeyHex)) {
    throw new Error('VAULT_INVALID_MASTER_KEY');
  }
  return Buffer.from(masterKeyHex, 'hex');
}

/**
 * Encrypts a read-only broker API key using AES-256-GCM with a unique 12-byte IV.
 */
export function encryptBrokerApiKey(params: {
  keyId: string;
  provider: 'BINANCE_READONLY' | 'B3_CEI';
  plaintextKey: string;
  masterKeyHex: string;
}): EncryptedApiVaultRecord {
  const keyBuffer = parseMasterKey(params.masterKeyHex);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(params.plaintextKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return EncryptedApiVaultRecordSchema.parse({
    keyId: params.keyId,
    provider: params.provider,
    ciphertextHex: encrypted.toString('hex'),
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    createdAt: new Date().toISOString(),
  });
}

/**
 * Decrypts and authenticates an AES-256-GCM envelope vault record.
 */
export function decryptBrokerApiKey(
  record: EncryptedApiVaultRecord,
  masterKeyHex: string
): string {
  const keyBuffer = parseMasterKey(masterKeyHex);

  try {
    if (
      record.ivHex.length !== 24 ||
      !HEX_REGEX.test(record.ivHex) ||
      record.authTagHex.length !== 32 ||
      !HEX_REGEX.test(record.authTagHex) ||
      !HEX_REGEX.test(record.ciphertextHex) ||
      record.ciphertextHex.length % 2 !== 0
    ) {
      throw new Error('VAULT_AUTH_TAG_TAMPERED');
    }

    const iv = Buffer.from(record.ivHex, 'hex');
    const authTag = Buffer.from(record.authTagHex, 'hex');
    const ciphertext = Buffer.from(record.ciphertextHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error('VAULT_AUTH_TAG_TAMPERED');
  }
}
