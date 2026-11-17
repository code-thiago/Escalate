// apps/api/src/modules/portfolio/sinacor-b3-parser.ts
import Decimal from 'decimal.js';
import {
  UnifiedAssetMathVectorSchema,
  CoeOpportunityAuditSchema,
  UnifiedAssetMathVector,
  CoeOpportunityAudit,
} from '@escalate/contracts';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_EVEN });

interface CategoryMapping {
  assetClass: UnifiedAssetMathVector['assetClass'];
  benchmarkIndexer: UnifiedAssetMathVector['benchmarkIndexer'];
  taxRegime: UnifiedAssetMathVector['taxRegime'];
  volatilityAnnual: number;
}

const RAW_CATEGORY_MAP: Record<string, CategoryMapping> = {
  TESOURO: {
    assetClass: 'TESOURO',
    benchmarkIndexer: 'IPCA',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.04,
  },
  FIXED_INCOME_EXEMPT: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'ISENTO',
    volatilityAnnual: 0.015,
  },
  LCI: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'ISENTO',
    volatilityAnnual: 0.015,
  },
  LCA: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'ISENTO',
    volatilityAnnual: 0.015,
  },
  FIXED_INCOME_TAXABLE: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.02,
  },
  CDB: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.02,
  },
  DEBENTURE: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.02,
  },
  EQUITY_BR: {
    assetClass: 'EQUITY_BR',
    benchmarkIndexer: 'IBOV',
    taxRegime: 'SWING_TRADE_15',
    volatilityAnnual: 0.24,
  },
  ETF: {
    assetClass: 'ETF',
    benchmarkIndexer: 'IBOV',
    taxRegime: 'SWING_TRADE_15',
    volatilityAnnual: 0.18,
  },
  GOLD: {
    assetClass: 'GOLD',
    benchmarkIndexer: 'USD',
    taxRegime: 'SWING_TRADE_15',
    volatilityAnnual: 0.16,
  },
  COE: {
    assetClass: 'COE',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.08,
  },
  PREV: {
    assetClass: 'PREV',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_PREV',
    volatilityAnnual: 0.06,
  },
  FUND: {
    assetClass: 'FUND',
    benchmarkIndexer: 'CDI',
    taxRegime: 'COME_COTAS',
    volatilityAnnual: 0.10,
  },
};

function sanitizeDecimalString(rawValue: string | undefined): string {
  const normalized = (rawValue ?? '').trim().replace(',', '.');
  return new Decimal(normalized).toFixed();
}

export function parseB3AndSinacorRows(
  rows: Array<Record<string, string>>
): UnifiedAssetMathVector[] {
  return rows.map((row, index) => {
    const rawCatKey = (row.rawCategory ?? '').trim().toUpperCase();
    const mapping = RAW_CATEGORY_MAP[rawCatKey];

    if (!mapping) {
      throw new Error(
        `SINACOR_B3_UNSUPPORTED_CATEGORY: Row ${index} has unsupported rawCategory "${row.rawCategory ?? ''}"`
      );
    }

    const quantityDecimal = sanitizeDecimalString(row.quantity);
    const unitPriceDecimal = sanitizeDecimalString(row.unitPrice);
    const expectedReturnAnnual = new Decimal(
      (row.expectedReturnAnnual ?? '0').trim().replace(',', '.')
    ).toNumber();
    const liquidityDays = Number.parseInt((row.liquidityDays ?? '0').trim(), 10);

    return UnifiedAssetMathVectorSchema.parse({
      assetId: (row.assetId ?? '').trim(),
      ticker: (row.ticker ?? '').trim().toUpperCase(),
      assetClass: mapping.assetClass,
      benchmarkIndexer: mapping.benchmarkIndexer,
      quantityDecimal,
      unitPriceDecimal,
      expectedReturnAnnual,
      volatilityAnnual: mapping.volatilityAnnual,
      liquidityDays,
      taxRegime: mapping.taxRegime,
    });
  });
}

export function auditCoeOpportunityCost(params: {
  coeTicker: string;
  expectedReturnAnnual: number;
  cdiBenchmarkAnnual: number;
  liquidityDays: number;
}): CoeOpportunityAudit {
  const liquidityDaysDec = new Decimal(params.liquidityDays);
  const illiquidityPenaltyDec = liquidityDaysDec
    .div(new Decimal(365))
    .mul(new Decimal('0.0075'));

  const netSpreadDec = new Decimal(params.expectedReturnAnnual)
    .minus(new Decimal(params.cdiBenchmarkAnnual))
    .minus(illiquidityPenaltyDec);

  const illiquidityPenaltyAnnual = Number(illiquidityPenaltyDec.toFixed(6));
  const netSpreadVsCdiAnnual = Number(netSpreadDec.toFixed(6));
  const verdict =
    netSpreadVsCdiAnnual < 0 ? 'SUBOPTIMAL_VS_CDI' : 'COMPETITIVE';

  return CoeOpportunityAuditSchema.parse({
    coeTicker: params.coeTicker.trim(),
    expectedReturnAnnual: params.expectedReturnAnnual,
    cdiBenchmarkAnnual: params.cdiBenchmarkAnnual,
    liquidityDays: params.liquidityDays,
    illiquidityPenaltyAnnual,
    netSpreadVsCdiAnnual,
    verdict,
  });
}
