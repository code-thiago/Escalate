// src/app/api/escalate/trading-ocr/route.ts
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  calculateGarch11ConditionalVolatility,
  runKalmanFilterPriceSeries,
} from '../../../../../apps/api/src/modules/quant/trading-stochastic-engine';
import {
  SaaSTokenMeter,
  SaaSSubscriptionTier,
} from '../../../../../apps/api/src/modules/billing/saas-token-meter';
import { normalizeOcrExtractedHoldings } from '../../../../../apps/api/src/modules/portfolio/ocr-statement-normalizer';

const globalTokenMeter = new SaaSTokenMeter();

const SubscriptionTierEnum = z.enum(['FREE_TRIAL', 'PRO_QUANT', 'INSTITUTIONAL']);

const GarchParamsSchema = z.object({
  omega: z.number(),
  alpha: z.number(),
  beta: z.number(),
  previousReturnShock: z.number(),
  previousVolatility: z.number(),
});

const KalmanParamsSchema = z.object({
  noisyPrices: z.array(z.number()),
  processNoiseQ: z.number(),
  measurementNoiseR: z.number(),
  initialEstimate: z.number().optional(),
  initialErrorCov: z.number().optional(),
});

const OcrItemSchema = z.object({
  tickerOrName: z.string().min(1),
  categoryHint: z.enum(['COE', 'PREV', 'FIXED_INCOME', 'FUND']),
  grossBalanceBrl: z.string().min(1),
  contractedRateAnnual: z.number(),
  lockupDays: z.number().int().min(0),
  confidenceScore: z.number().min(0).max(1),
});

const TradingOcrActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('RUN_GARCH_KALMAN'),
    tenantId: z.string().min(1).default('default-tenant'),
    tier: SubscriptionTierEnum.default('FREE_TRIAL'),
    garch: GarchParamsSchema,
    kalman: KalmanParamsSchema,
  }),
  z.object({
    action: z.literal('INGEST_OCR_STATEMENT'),
    tenantId: z.string().min(1).default('default-tenant'),
    tier: SubscriptionTierEnum.default('FREE_TRIAL'),
    requestedTokens: z.number().int().nonnegative(),
    items: z.array(OcrItemSchema).min(1),
  }),
]);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json();
    const payload = TradingOcrActionSchema.parse(rawBody);

    if (payload.action === 'RUN_GARCH_KALMAN') {
      const metering = globalTokenMeter.authorizeAndDebitTokens({
        tenantId: payload.tenantId,
        tier: payload.tier as SaaSSubscriptionTier,
        requestedTokens: 0,
        isZeroTokenDeterministicRoute: true,
      });

      const garch = calculateGarch11ConditionalVolatility(payload.garch);
      const kalman = runKalmanFilterPriceSeries(payload.kalman);

      return NextResponse.json(
        {
          status: 'ok',
          garch,
          kalman,
          metering,
        },
        { status: 200 }
      );
    }

    const metering = globalTokenMeter.authorizeAndDebitTokens({
      tenantId: payload.tenantId,
      tier: payload.tier as SaaSSubscriptionTier,
      requestedTokens: payload.requestedTokens,
      isZeroTokenDeterministicRoute: false,
    });

    if (!metering.allowed) {
      return NextResponse.json(
        {
          error: 'SAAS_TOKEN_QUOTA_EXCEEDED',
          metering,
        },
        { status: 429 }
      );
    }

    const normalized = normalizeOcrExtractedHoldings(payload.items);

    return NextResponse.json(
      {
        status: 'ok',
        normalized,
        metering,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const message = err.issues.map((issue) => issue.message).join('; ');
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'TRADING_OCR_API_ERROR';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
