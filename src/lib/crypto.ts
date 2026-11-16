import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // 96-bit IV recommended by NIST SP 800-38D
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag
const KEY_LENGTH_BYTES = 32; // 256-bit encryption key (64 hex characters)

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function resolveKey(secretKeyHex?: string): Buffer {
  const keyHex = secretKeyHex || process.env.ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "Missing encryption key: provide secretKeyHex argument or define ENCRYPTION_KEY in environment variables."
    );
  }
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (keyBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Invalid encryption key length: key must be exactly ${KEY_LENGTH_BYTES} bytes (64 hex characters), received ${keyBuffer.length} bytes.`
    );
  }
  return keyBuffer;
}

export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH_BYTES).toString("hex");
}

export function encryptToken(token: string, secretKeyHex?: string): string {
  const keyBuffer = resolveKey(secretKeyHex);
  const ivBuffer = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const ciphertextBuffer = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTagBuffer = cipher.getAuthTag();

  return `${ivBuffer.toString("hex")}:${authTagBuffer.toString("hex")}:${ciphertextBuffer.toString("hex")}`;
}

export function decryptToken(encryptedPayload: string, secretKeyHex?: string): string {
  if (typeof encryptedPayload !== "string") {
    throw new Error("Invalid encrypted payload: must be a string.");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted payload format: expected "iv:authTag:ciphertext" separated by colons.'
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  if (!/^[0-9a-fA-F]*$/.test(ivHex) || !/^[0-9a-fA-F]*$/.test(authTagHex) || !/^[0-9a-fA-F]*$/.test(ciphertextHex)) {
    throw new Error("Invalid encrypted payload: components must be valid hex strings.");
  }

  const ivBuffer = Buffer.from(ivHex, "hex");
  const authTagBuffer = Buffer.from(authTagHex, "hex");
  const ciphertextBuffer = Buffer.from(ciphertextHex, "hex");

  if (ivBuffer.length !== IV_LENGTH_BYTES) {
    throw new Error(
      `Invalid IV length: expected ${IV_LENGTH_BYTES} bytes (${IV_LENGTH_BYTES * 2} hex chars), received ${ivBuffer.length} bytes.`
    );
  }

  if (authTagBuffer.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH_BYTES} bytes (${AUTH_TAG_LENGTH_BYTES * 2} hex chars), received ${authTagBuffer.length} bytes.`
    );
  }

  const keyBuffer = resolveKey(secretKeyHex);

  try {
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, ivBuffer, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(authTagBuffer);

    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final(),
    ]);

    return decryptedBuffer.toString("utf8");
  } catch (err: unknown) {
    throw new Error(
      `Decryption failed: authentication tag verification failed or ciphertext has been tampered with. Cause: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function parseEncryptedPayload(payload: string): EncryptedData {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format: expected "iv:authTag:ciphertext".');
  }
  return {
    iv: parts[0],
    authTag: parts[1],
    ciphertext: parts[2],
  };
}

export function serializeEncryptedPayload(data: EncryptedData): string {
  return `${data.iv}:${data.authTag}:${data.ciphertext}`;
}
