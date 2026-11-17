// packages/contracts/src/asset-vector.ts
import { z } from 'zod';

export const AssetClassEnum = z.enum([
  'FIXED_INCOME',
  'TESOURO',
  'EQUITY_BR',
  'EQUITY_INTL',
  'FUND',
  'ETF',
  'PREV',
  'COE',
  'GOLD',
  'FX',
  'CRYPTO',
  'IPO',
]);

export const BenchmarkIndexerEnum = z.enum([
  'CDI',
  'IPCA',
  'SELIC',
  'IBOV',
  'SP500',
  'USD',
  'BTC',
  'PRE',
]);

export const TaxRegimeEnum = z.enum([
  'ISENTO',
  'REGRESSIVA_RF',
  'REGRESSIVA_PREV',
  'SWING_TRADE_15',
  'COME_COTAS',
  'EXTERIOR_15',
]);

export const UnifiedAssetMathVectorSchema = z.object({
  assetId: z.string().min(1),
  ticker: z.string().min(1),
  assetClass: AssetClassEnum,
  benchmarkIndexer: BenchmarkIndexerEnum,
  quantityDecimal: z.string().regex(/^\d+(\.\d+)?$/, 'Must be exact decimal string'),
  unitPriceDecimal: z.string().regex(/^\d+(\.\d+)?$/, 'Must be exact decimal string'),
  expectedReturnAnnual: z.number().min(-1).max(5),
  volatilityAnnual: z.number().min(0).max(5),
  liquidityDays: z.number().int().min(0),
  taxRegime: TaxRegimeEnum,
});

export type UnifiedAssetMathVector = z.infer<typeof UnifiedAssetMathVectorSchema>;

export const DCFInputSchema = z.object({
  freeCashFlows: z.array(z.string()).min(1),
  wacc: z.number().gt(0).lt(1),
  terminalGrowthRate: z.number().min(-0.05).lt(1),
  netDebtDecimal: z.string(),
  sharesOutstandingDecimal: z.string(),
}).refine((data) => data.wacc > data.terminalGrowthRate, {
  message: 'GORULES_GUARD_VIOLATION: WACC must be strictly greater than terminal growth rate (g) to prevent negative or infinite Terminal Value.',
  path: ['terminalGrowthRate'],
});

export type DCFInput = z.infer<typeof DCFInputSchema>;

const IMPERATIVE_CVM_VERBS = /\b(compre|venda|aloque|invista|resgate|troque|compre\s+agora|venda\s+agora)\b/i;

export function enforceCvmResolution20Grammar(text: string): {
  isCompliant: boolean;
  sanitizedText: string;
  violationMatch?: string;
} {
  const match = text.match(IMPERATIVE_CVM_VERBS);
  if (match) {
    return {
      isCompliant: false,
      violationMatch: match[0],
      sanitizedText:
        '[CVM_RESOLUTION_20_BLOCK]: Analytical output intercepted by GoRules deterministic guardrail. Imperative investment advice verbs are prohibited. Displaying mathematical simulation parameters only.',
    };
  }
  return {
    isCompliant: true,
    sanitizedText: `${text}\n\n[DISCLAIMER CVM]: Simulacao estritamente matematica e educacional baseada nos parametros informados pelo usuario. Nao configura recomendacao de investimento (Resolucao CVM 20).`,
  };
}

export const EncryptedApiVaultRecordSchema = z.object({
  keyId: z.string().min(1),
  provider: z.enum(['BINANCE_READONLY', 'B3_CEI']),
  ciphertextHex: z.string().regex(/^[0-9a-fA-F]+$/),
  ivHex: z.string().length(24),
  authTagHex: z.string().length(32),
  createdAt: z.string().datetime(),
});

export type EncryptedApiVaultRecord = z.infer<typeof EncryptedApiVaultRecordSchema>;

export const BlackLittermanViewSchema = z.object({
  ticker: z.string().min(1),
  directionalShock: z.number().min(-0.30).max(0.30),
  confidenceOmega: z.number().min(0.01).max(0.99),
  rationaleDigest: z.string().max(280),
});

export type BlackLittermanView = z.infer<typeof BlackLittermanViewSchema>;

export const CoeOpportunityAuditSchema = z.object({
  coeTicker: z.string().min(1),
  expectedReturnAnnual: z.number(),
  cdiBenchmarkAnnual: z.number(),
  liquidityDays: z.number().int().min(0),
  illiquidityPenaltyAnnual: z.number(),
  netSpreadVsCdiAnnual: z.number(),
  verdict: z.enum(['SUBOPTIMAL_VS_CDI', 'COMPETITIVE']),
});

export type CoeOpportunityAudit = z.infer<typeof CoeOpportunityAuditSchema>;
