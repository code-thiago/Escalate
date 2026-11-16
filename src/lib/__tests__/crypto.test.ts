import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  parseEncryptedPayload,
  serializeEncryptedPayload,
} from "../crypto";

describe("Token Encryption Module (AES-256-GCM) - src/lib/crypto.ts", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;
  let testKeyHex: string;

  beforeEach(() => {
    testKeyHex = generateEncryptionKey();
    process.env.ENCRYPTION_KEY = testKeyHex;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("1. Successful Round-Trip Encryption and Decryption", () => {
    it("should encrypt and decrypt a standard token back to its exact original value", () => {
      const plaintext = "sample-oauth-bearer-token-open-finance-2026";
      const encrypted = encryptToken(plaintext, testKeyHex);

      expect(typeof encrypted).toBe("string");
      const decrypted = decryptToken(encrypted, testKeyHex);
      expect(decrypted).toBe(plaintext);
    });

    it("should format encrypted output strictly as iv:authTag:ciphertext in hex", () => {
      const plaintext = "test-credentials";
      const encrypted = encryptToken(plaintext, testKeyHex);
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(3);
      const [ivHex, authTagHex, cipherHex] = parts;

      // IV must be 12 bytes = 24 hex chars
      expect(ivHex).toHaveLength(24);
      expect(/^[0-9a-fA-F]{24}$/.test(ivHex)).toBe(true);

      // AuthTag must be 16 bytes = 32 hex chars
      expect(authTagHex).toHaveLength(32);
      expect(/^[0-9a-fA-F]{32}$/.test(authTagHex)).toBe(true);

      // Ciphertext must be non-empty valid hex
      expect(cipherHex.length).toBeGreaterThan(0);
      expect(/^[0-9a-fA-F]+$/.test(cipherHex)).toBe(true);
    });

    it("should generate unique IVs and distinct ciphertexts for identical plaintext inputs (semantic security)", () => {
      const plaintext = "identical-secret-payload";
      const encrypted1 = encryptToken(plaintext, testKeyHex);
      const encrypted2 = encryptToken(plaintext, testKeyHex);

      expect(encrypted1).not.toBe(encrypted2);

      const [iv1] = encrypted1.split(":");
      const [iv2] = encrypted2.split(":");
      expect(iv1).not.toBe(iv2);

      expect(decryptToken(encrypted1, testKeyHex)).toBe(plaintext);
      expect(decryptToken(encrypted2, testKeyHex)).toBe(plaintext);
    });

    it("should preserve multi-byte UTF-8 Unicode characters without corruption", () => {
      const unicodePlaintext = "Credencial-XP-Com-Acentos-çãõ-!@#$%^&*()-日本語";
      const encrypted = encryptToken(unicodePlaintext, testKeyHex);
      expect(decryptToken(encrypted, testKeyHex)).toBe(unicodePlaintext);
    });
  });

  describe("2. Empty String Handling", () => {
    it("should correctly handle encryption and decryption of an empty string", () => {
      const emptyPlaintext = "";
      const encrypted = encryptToken(emptyPlaintext, testKeyHex);

      const parts = encrypted.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12-byte IV
      expect(parts[1]).toHaveLength(32); // 16-byte AuthTag
      expect(parts[2]).toBe("");         // 0-byte Ciphertext

      const decrypted = decryptToken(encrypted, testKeyHex);
      expect(decrypted).toBe("");
    });
  });

  describe("3. Tampering and Authentication Rejection (GCM Integrity)", () => {
    it("should reject tampered ciphertext and throw an authentication error", () => {
      const plaintext = "secure-open-finance-token";
      const encrypted = encryptToken(plaintext, testKeyHex);
      const [ivHex, authTagHex, cipherHex] = encrypted.split(":");

      // Flip the last hex digit of ciphertext
      const lastChar = cipherHex.slice(-1);
      const replacementChar = lastChar === "a" ? "b" : "a";
      const tamperedCipher = cipherHex.slice(0, -1) + replacementChar;
      const tamperedPayload = `${ivHex}:${authTagHex}:${tamperedCipher}`;

      expect(() => decryptToken(tamperedPayload, testKeyHex)).toThrow(
        /authentication tag|tampered|failed/i
      );
    });

    it("should reject tampered authentication tag and throw an authentication error", () => {
      const plaintext = "secure-open-finance-token";
      const encrypted = encryptToken(plaintext, testKeyHex);
      const [ivHex, authTagHex, cipherHex] = encrypted.split(":");

      // Flip the first hex digit of auth tag
      const firstChar = authTagHex.slice(0, 1);
      const replacementChar = firstChar === "0" ? "1" : "0";
      const tamperedTag = replacementChar + authTagHex.slice(1);
      const tamperedPayload = `${ivHex}:${tamperedTag}:${cipherHex}`;

      expect(() => decryptToken(tamperedPayload, testKeyHex)).toThrow(
        /authentication tag|tampered|failed/i
      );
    });

    it("should reject tampered IV and throw an authentication error", () => {
      const plaintext = "secure-open-finance-token";
      const encrypted = encryptToken(plaintext, testKeyHex);
      const [ivHex, authTagHex, cipherHex] = encrypted.split(":");

      // Flip the first hex digit of IV
      const firstChar = ivHex.slice(0, 1);
      const replacementChar = firstChar === "0" ? "1" : "0";
      const tamperedIv = replacementChar + ivHex.slice(1);
      const tamperedPayload = `${tamperedIv}:${authTagHex}:${cipherHex}`;

      expect(() => decryptToken(tamperedPayload, testKeyHex)).toThrow(
        /authentication tag|tampered|failed/i
      );
    });
  });

  describe("4. Wrong Key Rejection", () => {
    it("should fail decryption when using a different 256-bit key", () => {
      const plaintext = "classified-token-material";
      const keyA = testKeyHex;
      const keyB = generateEncryptionKey();

      expect(keyA).not.toBe(keyB);

      const encryptedWithA = encryptToken(plaintext, keyA);

      expect(() => decryptToken(encryptedWithA, keyB)).toThrow(
        /authentication tag|tampered|failed/i
      );
    });
  });

  describe("5. Key Management and Environment Fallback", () => {
    it("should fallback to process.env.ENCRYPTION_KEY when secretKeyHex is not explicitly passed", () => {
      const plaintext = "token-using-env-key";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should throw an error when no key is passed and process.env.ENCRYPTION_KEY is unset", () => {
      delete process.env.ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;

      expect(() => encryptToken("token")).toThrow(/Missing encryption key/i);
      const validStructurePayload = `${"0".repeat(24)}:${"0".repeat(32)}:1234`;
      expect(() => decryptToken(validStructurePayload)).toThrow(/Missing encryption key/i);
    });

    it("should reject keys that are not exactly 32 bytes (64 hex characters)", () => {
      const shortKey = "abcd1234ef56"; // 6 bytes
      expect(() => encryptToken("token", shortKey)).toThrow(/Invalid encryption key length/i);
    });
  });

  describe("6. Malformed Payload Validation", () => {
    it("should reject non-string payloads", () => {
      // @ts-expect-error testing invalid input type
      expect(() => decryptToken(null)).toThrow(/Invalid encrypted payload/i);
      // @ts-expect-error testing invalid input type
      expect(() => decryptToken(undefined)).toThrow(/Invalid encrypted payload/i);
    });

    it("should reject payload strings with invalid delimiter count", () => {
      expect(() => decryptToken("invalid-payload", testKeyHex)).toThrow(
        /Invalid encrypted payload format/i
      );
      expect(() => decryptToken("part1:part2", testKeyHex)).toThrow(
        /Invalid encrypted payload format/i
      );
      expect(() => decryptToken("part1:part2:part3:part4", testKeyHex)).toThrow(
        /Invalid encrypted payload format/i
      );
    });

    it("should reject payloads with invalid IV or tag length", () => {
      const shortIv = "abcd"; // 2 bytes instead of 12
      const validTag = "0123456789abcdef0123456789abcdef"; // 16 bytes = 32 hex
      const cipher = "aabbcc";
      expect(() => decryptToken(`${shortIv}:${validTag}:${cipher}`, testKeyHex)).toThrow(
        /Invalid IV length/i
      );

      const validIv = "0123456789abcdef01234567"; // 12 bytes = 24 hex
      const shortTag = "abcd"; // 2 bytes instead of 16
      expect(() => decryptToken(`${validIv}:${shortTag}:${cipher}`, testKeyHex)).toThrow(
        /Invalid auth tag length/i
      );
    });

    it("should reject non-hex characters in components", () => {
      const validIv = "0123456789abcdef01234567";
      const validTag = "0123456789abcdef0123456789abcdef";
      const badHex = "ZZZZZZZZ";
      expect(() => decryptToken(`${validIv}:${validTag}:${badHex}`, testKeyHex)).toThrow(
        /valid hex/i
      );
    });
  });

  describe("7. EncryptedData Serialization Helpers", () => {
    it("should correctly parse and serialize EncryptedData objects", () => {
      const plaintext = "payload-for-parsing";
      const encrypted = encryptToken(plaintext, testKeyHex);
      const parsed = parseEncryptedPayload(encrypted);

      expect(parsed).toHaveProperty("iv");
      expect(parsed).toHaveProperty("authTag");
      expect(parsed).toHaveProperty("ciphertext");

      const reserialized = serializeEncryptedPayload(parsed);
      expect(reserialized).toBe(encrypted);
      expect(decryptToken(reserialized, testKeyHex)).toBe(plaintext);
    });
  });
});
