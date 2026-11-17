import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  uuid,
  jsonb,
  bigint,
  integer,
  date,
} from "drizzle-orm/pg-core";

export const PROVIDER_TYPES = [
  "OPEN_FINANCE_SANDBOX",
  "B3_CSV",
  "MANUAL",
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const SYNC_STATUSES = ["SYNCED", "PENDING", "ERROR"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const PRODUCT_CLASSES = [
  "RENDA_FIXA",
  "FUNDOS",
  "BOLSA_BR",
  "BOLSA_INT",
  "COE",
  "CRIPTO",
  "TESOURO",
  "CAMBIO",
  "ETF",
] as const;
export type DbProductClass = (typeof PRODUCT_CLASSES)[number];

export const CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type DbCurrency = (typeof CURRENCIES)[number];

export const INDEXERS = [
  "CDI",
  "IPCA",
  "SELIC",
  "PRE",
  "IBOV",
  "SP500",
  "CRYPTO",
] as const;
export type DbIndexer = (typeof INDEXERS)[number];

export const LIQUIDITY_TIERS = [
  "D_0",
  "D_1_TO_5",
  "D_6_TO_30",
  "D_PLUS_30",
  "AT_MATURITY",
] as const;
export type DbLiquidityTier = (typeof LIQUIDITY_TIERS)[number];

export const GOAL_LIQUIDITY_TIERS = [
  "D_0",
  "D_1_TO_5",
  "D_6_TO_30",
  "ANY",
] as const;
export type DbGoalLiquidityTier = (typeof GOAL_LIQUIDITY_TIERS)[number];
export type GoalLiquidityTier = DbGoalLiquidityTier;

export const EVENT_PHASES = ["REALIZED", "PROJECTED"] as const;
export type DbEventPhase = (typeof EVENT_PHASES)[number];

export const EVENT_TYPES = [
  "CONTRIBUTION",
  "DIVIDEND_JCP",
  "COUPON",
  "MATURITY",
  "DAILY_YIELD_SNAPSHOT",
] as const;
export type DbEventType = (typeof EVENT_TYPES)[number];

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const simulacoes = pgTable(
  "simulacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tipo: text("tipo").$type<"juros_compostos" | "comparador">().notNull(),
    nome: text("nome"),
    parametros: jsonb("parametros").notNull(),
    criadoEm: timestamp("criado_em").defaultNow().notNull(),
  },
  (table) => [index("simulacoes_userId_idx").on(table.userId)],
);

export const connectedInstitution = pgTable(
  "connected_institution",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerType: text("provider_type").$type<ProviderType>().notNull(),
    institutionName: text("institution_name").notNull(),
    encryptedAccessToken: text("encrypted_access_token"),
    syncStatus: text("sync_status")
      .$type<SyncStatus>()
      .default("SYNCED")
      .notNull(),
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("connected_institution_userId_idx").on(table.userId)],
);

export const portfolioAsset = pgTable(
  "portfolio_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => connectedInstitution.id, { onDelete: "cascade" }),
    productClass: text("product_class").$type<DbProductClass>().notNull(),
    tickerOrCode: text("ticker_or_code").notNull(),
    assetName: text("asset_name").notNull(),
    currency: text("currency").$type<DbCurrency>().default("BRL").notNull(),
    investedCents: bigint("invested_cents", { mode: "bigint" }).notNull(),
    currentGrossCents: bigint("current_gross_cents", {
      mode: "bigint",
    }).notNull(),
    currentNetCents: bigint("current_net_cents", { mode: "bigint" }).notNull(),
    annualRateBps: integer("annual_rate_bps").notNull(),
    indexer: text("indexer").$type<DbIndexer>().notNull(),
    liquidityTier: text("liquidity_tier").$type<DbLiquidityTier>().notNull(),
    liquidityDays: integer("liquidity_days").default(0).notNull(),
    fgcCovered: boolean("fgc_covered").default(false).notNull(),
    maturityDate: timestamp("maturity_date"),
    metadataParameters: jsonb("metadata_parameters").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_asset_userId_idx").on(table.userId),
    index("portfolio_asset_institutionId_idx").on(table.institutionId),
  ],
);

export const calendarLedgerEvent = pgTable(
  "calendar_ledger_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => portfolioAsset.id, {
      onDelete: "cascade",
    }),
    eventDate: date("event_date").notNull(),
    eventPhase: text("event_phase").$type<DbEventPhase>().notNull(),
    eventType: text("event_type").$type<DbEventType>().notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    yieldBps: integer("yield_bps").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("calendar_ledger_event_userId_idx").on(table.userId),
    index("calendar_ledger_event_eventDate_idx").on(table.eventDate),
  ],
);

export const investmentGoal = pgTable(
  "investment_goal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetAmountCents: bigint("target_amount_cents", {
      mode: "bigint",
    }).notNull(),
    targetDate: date("target_date").notNull(),
    requiredLiquidityMaxTier: text("required_liquidity_max_tier")
      .$type<DbGoalLiquidityTier>()
      .default("ANY")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("investment_goal_userId_idx").on(table.userId)],
);

export const goalAssetAllocation = pgTable(
  "goal_asset_allocation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => investmentGoal.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => portfolioAsset.id, { onDelete: "cascade" }),
    allocatedBps: integer("allocated_bps").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("goal_asset_allocation_goalId_idx").on(table.goalId),
    index("goal_asset_allocation_assetId_idx").on(table.assetId),
  ],
);

export const agentQuantumForecast = pgTable(
  "agent_quantum_forecast",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    horizonSteps: integer("horizon_steps").notNull(),
    vonNeumannEntropyBps: integer("von_neumann_entropy_bps").notNull(),
    quantumDistributionSummary: jsonb(
      "quantum_distribution_summary",
    ).notNull(),
    zenDecisionOutput: jsonb("zen_decision_output").notNull(),
    zenExecutionTrace: jsonb("zen_execution_trace").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_quantum_forecast_userId_idx").on(table.userId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  simulacoes: many(simulacoes),
  connectedInstitutions: many(connectedInstitution),
  portfolioAssets: many(portfolioAsset),
  calendarLedgerEvents: many(calendarLedgerEvent),
  investmentGoals: many(investmentGoal),
  agentQuantumForecasts: many(agentQuantumForecast),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const simulacoesRelations = relations(simulacoes, ({ one }) => ({
  user: one(user, {
    fields: [simulacoes.userId],
    references: [user.id],
  }),
}));

export const connectedInstitutionRelations = relations(
  connectedInstitution,
  ({ one, many }) => ({
    user: one(user, {
      fields: [connectedInstitution.userId],
      references: [user.id],
    }),
    assets: many(portfolioAsset),
  }),
);

export const portfolioAssetRelations = relations(
  portfolioAsset,
  ({ one, many }) => ({
    user: one(user, {
      fields: [portfolioAsset.userId],
      references: [user.id],
    }),
    institution: one(connectedInstitution, {
      fields: [portfolioAsset.institutionId],
      references: [connectedInstitution.id],
    }),
    events: many(calendarLedgerEvent),
    allocations: many(goalAssetAllocation),
  }),
);

export const calendarLedgerEventRelations = relations(
  calendarLedgerEvent,
  ({ one }) => ({
    user: one(user, {
      fields: [calendarLedgerEvent.userId],
      references: [user.id],
    }),
    asset: one(portfolioAsset, {
      fields: [calendarLedgerEvent.assetId],
      references: [portfolioAsset.id],
    }),
  }),
);

export const investmentGoalRelations = relations(
  investmentGoal,
  ({ one, many }) => ({
    user: one(user, {
      fields: [investmentGoal.userId],
      references: [user.id],
    }),
    allocations: many(goalAssetAllocation),
  }),
);

export const goalAssetAllocationRelations = relations(
  goalAssetAllocation,
  ({ one }) => ({
    goal: one(investmentGoal, {
      fields: [goalAssetAllocation.goalId],
      references: [investmentGoal.id],
    }),
    asset: one(portfolioAsset, {
      fields: [goalAssetAllocation.assetId],
      references: [portfolioAsset.id],
    }),
  }),
);

export const agentQuantumForecastRelations = relations(
  agentQuantumForecast,
  ({ one }) => ({
    user: one(user, {
      fields: [agentQuantumForecast.userId],
      references: [user.id],
    }),
  }),
);
