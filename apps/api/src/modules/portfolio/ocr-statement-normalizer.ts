// apps/api/src/modules/portfolio/ocr-statement-normalizer.ts
import Decimal from 'decimal.js';
import {
  UnifiedAssetMathVectorSchema,
  UnifiedAssetMathVector,
} from '@escalate/contracts';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_EVEN });

export type OcrCategoryHint = 'COE' | 'PREV' | 'FIXED_INCOME' | 'FUND';

export interface RawOcrExtractedHolding {
  tickerOrName: string;
  categoryHint: OcrCategoryHint;
  grossBalanceBrl: string;
  contractedRateAnnual: number;
  lockupDays: number;
  confidenceScore: number;
}

export interface NormalizedOcrHoldingsResult {
  acceptedVectors: UnifiedAssetMathVector[];
  rejectedLowConfidence: string[];
}

const OCR_CATEGORY_DEFAULTS: Record<
  OcrCategoryHint,
  {
    assetClass: UnifiedAssetMathVector['assetClass'];
    benchmarkIndexer: UnifiedAssetMathVector['benchmarkIndexer'];
    taxRegime: UnifiedAssetMathVector['taxRegime'];
    volatilityAnnual: number;
  }
> = {
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
  FIXED_INCOME: {
    assetClass: 'FIXED_INCOME',
    benchmarkIndexer: 'CDI',
    taxRegime: 'REGRESSIVA_RF',
    volatilityAnnual: 0.02,
  },
  FUND: {
    assetClass: 'FUND',
    benchmarkIndexer: 'CDI',
    taxRegime: 'COME_COTAS',
    volatilityAnnual: 0.10,
  },
};

export function normalizeOcrExtractedHoldings(
  rawOcrItems: Array<RawOcrExtractedHolding>
): NormalizedOcrHoldingsResult {
  const acceptedVectors: UnifiedAssetMathVector[] = [];
  const rejectedLowConfidence: string[] = [];

  for (let i = 0; i < rawOcrItems.length; i++) {
    const item = rawOcrItems[i];
    const cleanTicker = item.tickerOrName.trim();

    if (item.confidenceScore < 0.80) {
      rejectedLowConfidence.push(cleanTicker);
      continue;
    }

    const defaults = OCR_CATEGORY_DEFAULTS[item.categoryHint];
    const sanitizedBalance = item.grossBalanceBrl.trim().replace(',', '.');
    const unitPriceDecimal = new Decimal(sanitizedBalance).toFixed(2);

    const validatedVector = UnifiedAssetMathVectorSchema.parse({
      assetId: `ocr-${item.categoryHint.toLowerCase()}-${i + 1}`,
      ticker: cleanTicker.toUpperCase(),
      assetClass: defaults.assetClass,
      benchmarkIndexer: defaults.benchmarkIndexer,
      quantityDecimal: '1',
      unitPriceDecimal,
      expectedReturnAnnual: item.contractedRateAnnual,
      volatilityAnnual: defaults.volatilityAnnual,
      liquidityDays: Math.max(0, Math.trunc(item.lockupDays)),
      taxRegime: defaults.taxRegime,
    });

    acceptedVectors.push(validatedVector);
  }

  return {
    acceptedVectors,
    rejectedLowConfidence,
  };
}
