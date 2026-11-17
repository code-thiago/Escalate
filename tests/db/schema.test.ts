import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
  simulacoes,
  connectedInstitution,
  portfolioAsset,
  calendarLedgerEvent,
  investmentGoal,
  goalAssetAllocation,
  agentQuantumForecast,
  userRelations,
  connectedInstitutionRelations,
  portfolioAssetRelations,
  calendarLedgerEventRelations,
  investmentGoalRelations,
  goalAssetAllocationRelations,
  agentQuantumForecastRelations,
  PROVIDER_TYPES,
  SYNC_STATUSES,
  PRODUCT_CLASSES,
  CURRENCIES,
  INDEXERS,
  LIQUIDITY_TIERS,
  GOAL_LIQUIDITY_TIERS,
  EVENT_PHASES,
  EVENT_TYPES,
} from "@/src/db/schema";

describe("Unified Drizzle Database Schema (Milestone M1)", () => {
  describe("Tabelas e Nomes SQL", () => {
    it("deve exportar todas as 11 tabelas com nomes SQL corretos", () => {
      expect(getTableName(user)).toBe("user");
      expect(getTableName(session)).toBe("session");
      expect(getTableName(account)).toBe("account");
      expect(getTableName(verification)).toBe("verification");
      expect(getTableName(simulacoes)).toBe("simulacoes");

      expect(getTableName(connectedInstitution)).toBe("connected_institution");
      expect(getTableName(portfolioAsset)).toBe("portfolio_asset");
      expect(getTableName(calendarLedgerEvent)).toBe("calendar_ledger_event");
      expect(getTableName(investmentGoal)).toBe("investment_goal");
      expect(getTableName(goalAssetAllocation)).toBe("goal_asset_allocation");
      expect(getTableName(agentQuantumForecast)).toBe("agent_quantum_forecast");
    });
  });

  describe("Preservacao de Auth e Legado", () => {
    it("deve preservar colunas essenciais do Better Auth na tabela user", () => {
      const cols = getTableColumns(user);
      expect(cols.id).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.email).toBeDefined();
      expect(cols.emailVerified).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    it("deve preservar a tabela legado simulacoes", () => {
      const cols = getTableColumns(simulacoes);
      expect(cols.id).toBeDefined();
      expect(cols.userId).toBeDefined();
      expect(cols.tipo).toBeDefined();
      expect(cols.parametros).toBeDefined();
    });
  });

  describe("Aritmetica Inteira em Centavos (bigint)", () => {
    it("deve utilizar bigint para valores monetarios em centavos", () => {
      const assetCols = getTableColumns(portfolioAsset);
      expect(assetCols.investedCents.dataType).toBe("bigint");
      expect(assetCols.currentGrossCents.dataType).toBe("bigint");
      expect(assetCols.currentNetCents.dataType).toBe("bigint");

      const eventCols = getTableColumns(calendarLedgerEvent);
      expect(eventCols.amountCents.dataType).toBe("bigint");

      const goalCols = getTableColumns(investmentGoal);
      expect(goalCols.targetAmountCents.dataType).toBe("bigint");
    });
  });

  describe("Aritmetica em Basis Points (integer)", () => {
    it("deve utilizar integer para taxas e percentuais em basis points", () => {
      const assetCols = getTableColumns(portfolioAsset);
      expect(assetCols.annualRateBps.dataType).toBe("number");
      expect(assetCols.annualRateBps.columnType).toBe("PgInteger");

      const eventCols = getTableColumns(calendarLedgerEvent);
      expect(eventCols.yieldBps.dataType).toBe("number");
      expect(eventCols.yieldBps.columnType).toBe("PgInteger");

      const allocCols = getTableColumns(goalAssetAllocation);
      expect(allocCols.allocatedBps.dataType).toBe("number");
      expect(allocCols.allocatedBps.columnType).toBe("PgInteger");

      const forecastCols = getTableColumns(agentQuantumForecast);
      expect(forecastCols.vonNeumannEntropyBps.dataType).toBe("number");
      expect(forecastCols.vonNeumannEntropyBps.columnType).toBe("PgInteger");
    });
  });

  describe("Chaves Estrangeiras e UUIDs", () => {
    it("deve possuir chave primaria id do tipo UUID em todas as tabelas", () => {
      const tables = [
        connectedInstitution,
        portfolioAsset,
        calendarLedgerEvent,
        investmentGoal,
        goalAssetAllocation,
        agentQuantumForecast,
      ];

      for (const t of tables) {
        const cols = getTableColumns(t);
        expect(cols.id.dataType).toBe("string");
        expect(cols.id.columnType).toBe("PgUUID");
        expect(cols.id.primary).toBe(true);
      }
    });

    it("deve possuir user_id referenciando user com cascade", () => {
      const userScopedTables = [
        connectedInstitution,
        portfolioAsset,
        calendarLedgerEvent,
        investmentGoal,
        agentQuantumForecast,
      ];

      for (const t of userScopedTables) {
        const cols = getTableColumns(t);
        expect(cols.userId).toBeDefined();
        expect(cols.userId.dataType).toBe("string");
        expect(cols.userId.columnType).toBe("PgUUID");
        expect(cols.userId.notNull).toBe(true);
      }
    });
  });

  describe("Constantes de Tipos Enum-Like", () => {
    it("deve exportar as constantes de lista completas e imutaveis", () => {
      expect(PROVIDER_TYPES).toEqual(["OPEN_FINANCE_SANDBOX", "B3_CSV", "MANUAL"]);
      expect(SYNC_STATUSES).toEqual(["SYNCED", "PENDING", "ERROR"]);
      expect(PRODUCT_CLASSES).toContain("RENDA_FIXA");
      expect(PRODUCT_CLASSES).toContain("TESOURO");
      expect(PRODUCT_CLASSES).toContain("COE");
      expect(CURRENCIES).toEqual(["BRL", "USD", "EUR"]);
      expect(LIQUIDITY_TIERS).toEqual(["D_0", "D_1_TO_5", "D_6_TO_30", "D_PLUS_30", "AT_MATURITY"]);
      expect(EVENT_PHASES).toEqual(["REALIZED", "PROJECTED"]);
    });
  });

  describe("Relacoes Drizzle", () => {
    it("deve exportar objetos de relations definidos para todas as tabelas", () => {
      expect(userRelations).toBeDefined();
      expect(connectedInstitutionRelations).toBeDefined();
      expect(portfolioAssetRelations).toBeDefined();
      expect(calendarLedgerEventRelations).toBeDefined();
      expect(investmentGoalRelations).toBeDefined();
      expect(goalAssetAllocationRelations).toBeDefined();
      expect(agentQuantumForecastRelations).toBeDefined();
    });
  });
});
