import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeBolsa,
  analyzeCambio,
  analyzeCoe,
  analyzeCripto,
  analyzeEtfs,
  analyzeFundos,
  analyzeRendaFixa,
  analyzeTesouroDireto,
} from "@/src/core/finance/products";
import { zenService } from "@/src/core/decision/zen";
import { serializeBigIntJson } from "@/src/lib/formatters";

export const runtime = "nodejs";

const ProductAnalysisRequestSchema = z.object({
  productClass: z.enum([
    "renda_fixa",
    "fundos",
    "bolsa",
    "coe",
    "cripto",
    "tesouro_direto",
    "cambio",
    "etfs",
  ]),
  productName: z.string().min(2).max(140).default("Ativo Analisado"),
  investedCents: z.number().int().positive().max(100000000000),
  annualRateBps: z.number().int().min(-5000).max(20000).default(1325),
  holdingDays: z.number().int().min(1).max(18250).default(730),
  feeBps: z.number().int().min(0).max(5000).default(0),
  subType: z.string().optional(),
  isExemptTax: z.boolean().optional(),
  fgcCovered: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = ProductAnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parametros invalidos para analise critica.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      productClass,
      productName,
      investedCents,
      annualRateBps,
      holdingDays,
      feeBps,
      isExemptTax,
      fgcCovered,
    } = parsed.data;

    const invBig = BigInt(investedCents);
    let analysis;

    switch (productClass) {
      case "renda_fixa":
        analysis = analyzeRendaFixa({
          productName,
          subType: isExemptTax ? "LCI" : "CDB",
          investedCents: invBig,
          annualRateBps,
          holdingDays,
          isExemptTax,
          hasFgc: fgcCovered,
          brokerFeeBps: feeBps,
        });
        break;
      case "fundos":
        analysis = analyzeFundos({
          productName,
          subType: "MULTIMERCADO",
          investedCents: invBig,
          grossAnnualReturnBps: annualRateBps,
          managementFeeBps: feeBps || 150,
          holdingDays,
        });
        break;
      case "bolsa":
        analysis = analyzeBolsa({
          productName,
          investedCents: invBig,
          capitalGainCents: (invBig * BigInt(Math.max(0, annualRateBps))) / 10000n,
          monthlySalesCents: invBig,
          holdingDays,
        });
        break;
      case "coe":
        analysis = analyzeCoe({
          productName,
          investedCents: invBig,
          expectedNominalReturnBps: annualRateBps,
          embeddedSpreadBps: feeBps || 400,
          holdingDays,
        });
        break;
      case "cripto":
        analysis = analyzeCripto({
          productName,
          investedCents: invBig,
          capitalGainCents: (invBig * BigInt(Math.max(0, annualRateBps))) / 10000n,
          monthlySalesCents: invBig,
          holdingDays,
          exchangeFeeBps: feeBps || 50,
        });
        break;
      case "tesouro_direto":
        analysis = analyzeTesouroDireto({
          productName,
          subType: "TESOURO_IPCA",
          investedCents: invBig,
          annualRateBps,
          holdingDays,
        });
        break;
      case "cambio":
        analysis = analyzeCambio({
          productName,
          investedCents: invBig,
          ptaxRateCents: 580n,
          spreadBps: feeBps || 120,
          expectedCurrencyAppreciationBps: annualRateBps,
          holdingDays,
        });
        break;
      case "etfs":
        analysis = analyzeEtfs({
          productName,
          investedCents: invBig,
          grossAnnualReturnBps: annualRateBps,
          expenseRatioBps: feeBps || 23,
          holdingDays,
        });
        break;
    }

    const zenScorecard = await zenService.evaluateProductAnalysis({
      productClass: analysis.zenEngineInput.productClass,
      annualRateBps: analysis.zenEngineInput.annualRateBps,
      feeBps: analysis.zenEngineInput.feeBps,
      fgcCovered: analysis.zenEngineInput.fgcCovered,
      liquidityTier: analysis.zenEngineInput.liquidityTier,
      holdingPeriodDays: analysis.zenEngineInput.holdingPeriodDays,
      isExemptTax: isExemptTax ?? analysis.netRealReturn.irCents === 0n,
    });

    return NextResponse.json({
      analysis: serializeBigIntJson(analysis),
      zenScorecard: serializeBigIntJson(zenScorecard),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao executar analise critica do produto.",
      },
      { status: 500 },
    );
  }
}
