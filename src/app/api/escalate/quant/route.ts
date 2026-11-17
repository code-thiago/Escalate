// src/app/api/escalate/quant/route.ts
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  BlackLittermanView,
  DCFInputSchema,
  UnifiedAssetMathVectorSchema,
} from '@escalate/contracts';
import {
  applyBlackLittermanViews,
  calculateDiscountedCashFlow,
  calculateMarkowitzCovariancePortfolio,
} from '../../../../../apps/api/src/modules/quant/quant-engine';
import { buildCompactPortfolioDigestForAgent } from '../../../../../apps/api/src/modules/portfolio/custody-quant-bridge';

const MarkowitzBlActionViewSchema = z.object({
  ticker: z.string().min(1),
  directionalShock: z.number(),
  confidenceOmega: z.number().min(0.01).max(0.99),
  rationaleDigest: z.string().max(280).default(''),
});

const MarkowitzBlPayloadSchema = z.object({
  assets: z.array(UnifiedAssetMathVectorSchema).min(1),
  correlationMatrix: z.array(z.array(z.number())),
  riskFreeRateAnnual: z.number(),
  views: z.array(MarkowitzBlActionViewSchema).optional().default([]),
  equilibriumReturns: z.record(z.string(), z.number()).optional(),
  maxShockCap: z.number().positive().optional(),
});

const AgentDigestPayloadSchema = z.object({
  portfolioName: z.string().min(1),
  assets: z.array(UnifiedAssetMathVectorSchema),
  riskFreeRateAnnual: z.number(),
  cvmCandidateText: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;
    const rawPayload = body?.payload ?? body;

    if (action === 'RUN_DCF') {
      const parsedDcf = DCFInputSchema.parse({
        freeCashFlows: rawPayload?.freeCashFlows,
        wacc: rawPayload?.wacc,
        terminalGrowthRate: rawPayload?.terminalGrowthRate,
        netDebtDecimal: rawPayload?.netDebtDecimal ?? '0.00',
        sharesOutstandingDecimal: rawPayload?.sharesOutstandingDecimal ?? '1.00',
      });

      const result = calculateDiscountedCashFlow({
        freeCashFlows: parsedDcf.freeCashFlows,
        wacc: parsedDcf.wacc,
        terminalGrowthRate: parsedDcf.terminalGrowthRate,
      });

      return NextResponse.json({ status: 'ok', result }, { status: 200 });
    }

    if (action === 'RUN_MARKOWITZ_BL') {
      const parsed = MarkowitzBlPayloadSchema.parse(rawPayload);

      const markowitz = calculateMarkowitzCovariancePortfolio(
        parsed.assets,
        parsed.correlationMatrix,
        parsed.riskFreeRateAnnual
      );

      const baseEquilibrium: Record<string, number> = {};
      for (const asset of parsed.assets) {
        baseEquilibrium[asset.ticker] = asset.expectedReturnAnnual;
      }
      const mergedEquilibrium = {
        ...baseEquilibrium,
        ...(parsed.equilibriumReturns ?? {}),
      };

      const posteriorReturns = applyBlackLittermanViews(
        mergedEquilibrium,
        parsed.views as BlackLittermanView[],
        parsed.maxShockCap ?? 0.15
      );

      return NextResponse.json(
        { status: 'ok', markowitz, posteriorReturns },
        { status: 200 }
      );
    }

    if (action === 'BUILD_AGENT_DIGEST') {
      const parsed = AgentDigestPayloadSchema.parse(rawPayload);
      const digest = buildCompactPortfolioDigestForAgent({
        portfolioName: parsed.portfolioName,
        assets: parsed.assets,
        riskFreeRateAnnual: parsed.riskFreeRateAnnual,
        cvmCandidateText: parsed.cvmCandidateText,
      });

      return NextResponse.json({ status: 'ok', digest }, { status: 200 });
    }

    return NextResponse.json(
      { error: `UNSUPPORTED_QUANT_ACTION: ${String(action)}` },
      { status: 422 }
    );
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const message = err.issues.map((issue) => issue.message).join('; ');
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'UNKNOWN_QUANT_ENGINE_ERROR';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
