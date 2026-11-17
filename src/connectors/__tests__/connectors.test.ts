import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AccountConnectorProvider,
  OpenFinanceSandboxAdapter,
  B3CsvAdapter,
  B3CsvValidationError,
  ManualAssetAdapter,
} from "../index";
import { encryptToken, decryptToken, generateEncryptionKey } from "@/src/lib/crypto";

describe("Milestone M1: Account Connectors & Crypto Test Suite", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("OpenFinanceSandboxAdapter", () => {
    const adapter = new OpenFinanceSandboxAdapter();

    it("returns deterministic multi-institution positions in integer cents", async () => {
      const positions = await adapter.syncPositions("user-sandbox", {});
      expect(positions.length).toBeGreaterThan(5);

      // Verify institutions
      const institutions = new Set(positions.map((p) => p.institutionId));
      expect(institutions.has("XP")).toBe(true);
      expect(institutions.has("BTG")).toBe(true);
      expect(institutions.has("ITAU")).toBe(true);
      expect(institutions.has("TESOURO")).toBe(true);

      // Verify product classes
      const classes = new Set(positions.map((p) => p.productClass));
      expect(classes.has("renda_fixa")).toBe(true);
      expect(classes.has("fundos")).toBe(true);
      expect(classes.has("bolsa")).toBe(true);
      expect(classes.has("coe")).toBe(true);
      expect(classes.has("tesouro_direto")).toBe(true);
      expect(classes.has("cripto")).toBe(true);
      expect(classes.has("cambio")).toBe(true);
      expect(classes.has("etfs")).toBe(true);

      // Verify integer cents invariant (bigint)
      for (const pos of positions) {
        expect(typeof pos.investedCents).toBe("bigint");
        expect(typeof pos.currentGrossCents).toBe("bigint");
        expect(typeof pos.currentNetCents).toBe("bigint");
        expect(pos.investedCents).toBeGreaterThan(0n);
        expect(pos.currentGrossCents).toBeGreaterThan(0n);
        expect(pos.currentNetCents).toBeGreaterThan(0n);
        expect(Number.isInteger(pos.annualRateBps)).toBe(true);
        expect(pos.annualRateBps).toBeGreaterThanOrEqual(0);
      }
    });

    it("filters positions by institutionIds when option is supplied", async () => {
      const xpPositions = await adapter.syncPositions("user-sandbox", { institutionIds: ["XP"] });
      expect(xpPositions.length).toBeGreaterThan(0);
      for (const pos of xpPositions) {
        expect(pos.institutionId).toBe("XP");
      }
    });

    it("returns consistent deterministic results across multiple invocations", async () => {
      const run1 = await adapter.syncPositions("user-sandbox", {});
      const run2 = await adapter.syncPositions("user-sandbox", {});
      expect(run1).toEqual(run2);
    });
  });

  describe("B3CsvAdapter", () => {
    const adapter = new B3CsvAdapter();

    it("successfully parses valid Brazilian format B3 CSV with semicolon delimiters", async () => {
      const csvData = `Instituicao;Codigo;Tipo;Quantidade;PrecoMedio;ValorAtualizado;Vencimento
XP Investimentos;PETR4;Acao;100;35,50;3850,00;
BTG Pactual;KNCR11;FII;50;102,00;5150,00;
Itau Corretora;BOVA11;ETF;20;120,00;2480,00;`;

      const positions = await adapter.syncPositions("user-1", csvData);
      expect(positions).toHaveLength(3);

      const petr4 = positions[0];
      expect(petr4.tickerOrCode).toBe("PETR4");
      expect(petr4.productClass).toBe("bolsa");
      expect(petr4.investedCents).toBe(355000n); // 100 * 35.50 * 100
      expect(petr4.currentGrossCents).toBe(385000n); // 3850.00 * 100
      expect(petr4.liquidityTier).toBe("D_1_TO_5");

      const kncr11 = positions[1];
      expect(kncr11.tickerOrCode).toBe("KNCR11");
      expect(kncr11.productClass).toBe("fundos");
      expect(kncr11.investedCents).toBe(510000n);

      const bova11 = positions[2];
      expect(bova11.tickerOrCode).toBe("BOVA11");
      expect(bova11.productClass).toBe("etfs");
    });

    it("throws B3CsvValidationError atomically on corrupted rows (negative quantity)", async () => {
      const invalidCsv = `Instituicao;Codigo;Tipo;Quantidade;PrecoMedio;ValorAtualizado
XP;PETR4;Acao;-10;35,50;3850,00`;

      await expect(adapter.syncPositions("user-1", invalidCsv)).rejects.toThrow(B3CsvValidationError);
    });

    it("throws B3CsvValidationError when required header columns are missing", async () => {
      const badHeadersCsv = `ColunaInvalida1;ColunaInvalida2\n10;20`;
      await expect(adapter.syncPositions("user-1", badHeadersCsv)).rejects.toThrow(B3CsvValidationError);
    });

    it("returns empty array when CSV is empty or whitespace", async () => {
      const empty = await adapter.syncPositions("user-1", "   \n  ");
      expect(empty).toEqual([]);
    });
  });

  describe("ManualAssetAdapter", () => {
    const adapter = new ManualAssetAdapter();

    it("validates and creates normalized position from valid manual input", async () => {
      const payload = {
        institutionId: "BTG",
        productClass: "renda_fixa",
        tickerOrCode: "CDB-BTG-110",
        assetName: "CDB BTG 110% CDI",
        investedCents: 5000000n,
        currentGrossCents: 5200000n,
        annualRateBps: 11000,
        indexer: "CDI",
        liquidityTier: "D_0",
        liquidityDays: 0,
        fgcCovered: true,
      };

      const positions = await adapter.syncPositions("user-1", payload);
      expect(positions).toHaveLength(1);
      expect(positions[0].tickerOrCode).toBe("CDB-BTG-110");
      expect(positions[0].investedCents).toBe(5000000n);
      expect(positions[0].fgcCovered).toBe(true);
    });

    it("enforces ticker regex ^[A-Z0-9.-]{1,12}$", async () => {
      const invalidTickers = ["lowercase", "TOO_LONG_TICKER_NAME_123", "INVALID@CHAR", ""];
      for (const ticker of invalidTickers) {
        const payload = {
          institutionId: "XP",
          productClass: "bolsa",
          tickerOrCode: ticker,
          assetName: "Test Asset",
          investedCents: 100000n,
          currentGrossCents: 100000n,
          annualRateBps: 0,
          indexer: "IBOV",
          liquidityTier: "D_1_TO_5",
        };
        await expect(adapter.syncPositions("user-1", payload)).rejects.toThrow();
      }
    });
  });

  describe("AccountConnectorProvider Facade", () => {
    const provider = new AccountConnectorProvider();

    it("delegates to OpenFinanceSandboxAdapter on OPEN_FINANCE_SANDBOX", async () => {
      const positions = await provider.sync("OPEN_FINANCE_SANDBOX", {});
      expect(positions.length).toBeGreaterThan(0);
    });

    it("delegates to B3CsvAdapter on B3_CSV", async () => {
      const csv = `Instituicao;Codigo;Tipo;Quantidade;PrecoMedio;ValorAtualizado\nXP;VALE3;Acao;10;60,00;650,00`;
      const positions = await provider.sync("B3_CSV", csv);
      expect(positions).toHaveLength(1);
      expect(positions[0].tickerOrCode).toBe("VALE3");
    });

    it("delegates to ManualAssetAdapter on MANUAL", async () => {
      const payload = {
        institutionId: "ITAU",
        productClass: "renda_fixa",
        tickerOrCode: "CDB-ITAU-1",
        assetName: "CDB Itaú",
        investedCents: 100000n,
        currentGrossCents: 105000n,
        annualRateBps: 10000,
        indexer: "CDI",
        liquidityTier: "D_0",
        liquidityDays: 0,
        fgcCovered: true,
      };
      const positions = await provider.sync("MANUAL", payload);
      expect(positions).toHaveLength(1);
      expect(positions[0].tickerOrCode).toBe("CDB-ITAU-1");
    });

    it("throws error on unsupported provider type", async () => {
      // @ts-expect-error testing invalid provider type
      await expect(provider.sync("UNKNOWN_PROVIDER", {})).rejects.toThrow("Unsupported provider type");
    });
  });

  describe("Token Encryption (AES-256-GCM)", () => {
    it("encrypts and decrypts tokens deterministically in iv:authTag:ciphertext format", () => {
      const token = "oauth_access_token_super_secret_12345";
      const encrypted = encryptToken(token);

      const parts = encrypted.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12 bytes IV in hex
      expect(parts[1]).toHaveLength(32); // 16 bytes AuthTag in hex

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it("throws an authentication error when ciphertext or auth tag is tampered", () => {
      const encrypted = encryptToken("sensitive_data");
      const parts = encrypted.split(":");
      // Tamper 1 character of ciphertext
      const tamperedCipher = parts[2].slice(0, -1) + (parts[2].endsWith("a") ? "b" : "a");
      const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

      expect(() => decryptToken(tamperedPayload)).toThrow();
    });
  });
});
