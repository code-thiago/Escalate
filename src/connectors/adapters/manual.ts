import { z } from "zod";
import { AccountConnector, NormalizedPositionDTO } from "../types";

export const ManualAssetInputSchema = z.object({
  institutionId: z.string().min(1, "Instituição é obrigatória").max(64),
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
  tickerOrCode: z
    .string()
    .regex(/^[A-Z0-9.-]{1,12}$/, "Ticker deve ter de 1 a 12 caracteres alfanuméricos maiúsculos, pontos ou hifens"),
  assetName: z.string().min(2, "Nome do ativo deve ter no mínimo 2 caracteres").max(100),
  currency: z.string().default("BRL"),
  investedCents: z.union([
    z.bigint(),
    z.number().int().nonnegative().transform((n) => BigInt(n)),
  ]),
  currentGrossCents: z.union([
    z.bigint(),
    z.number().int().nonnegative().transform((n) => BigInt(n)),
  ]),
  currentNetCents: z
    .union([z.bigint(), z.number().int().nonnegative().transform((n) => BigInt(n))])
    .optional(),
  annualRateBps: z.number().int().nonnegative().default(0),
  indexer: z.string().default("PRE"),
  liquidityTier: z.enum(["D_0", "D_1_TO_5", "D_6_TO_30", "D_PLUS_30", "AT_MATURITY"]),
  liquidityDays: z.number().int().nonnegative().default(0),
  fgcCovered: z.boolean().default(false),
  maturityDate: z.string().nullable().optional().default(null),
  metadataParameters: z.record(z.unknown()).optional(),
});

export type ManualAssetInput = z.infer<typeof ManualAssetInputSchema>;

export class ManualAssetAdapter implements AccountConnector {
  async syncPositions(_userId: string, credentialsOrData: unknown): Promise<NormalizedPositionDTO[]> {
    const payload = credentialsOrData;
    const items = Array.isArray(payload) ? payload : [payload];

    const results: NormalizedPositionDTO[] = [];

    for (const item of items) {
      const validated = ManualAssetInputSchema.parse(item);
      const gross = typeof validated.currentGrossCents === "bigint" ? validated.currentGrossCents : BigInt(validated.currentGrossCents);
      const net = validated.currentNetCents !== undefined
        ? (typeof validated.currentNetCents === "bigint" ? validated.currentNetCents : BigInt(validated.currentNetCents))
        : gross;
      const invested = typeof validated.investedCents === "bigint" ? validated.investedCents : BigInt(validated.investedCents);

      results.push({
        institutionId: validated.institutionId,
        productClass: validated.productClass,
        tickerOrCode: validated.tickerOrCode.toUpperCase(),
        assetName: validated.assetName,
        currency: validated.currency,
        investedCents: invested,
        currentGrossCents: gross,
        currentNetCents: net,
        annualRateBps: validated.annualRateBps,
        indexer: validated.indexer,
        liquidityTier: validated.liquidityTier,
        liquidityDays: validated.liquidityDays,
        fgcCovered: validated.fgcCovered,
        maturityDate: validated.maturityDate || null,
        metadataParameters: validated.metadataParameters,
      });
    }

    return results;
  }
}
