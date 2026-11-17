export type ProductClass =
  | "renda_fixa"
  | "fundos"
  | "bolsa"
  | "coe"
  | "cripto"
  | "tesouro_direto"
  | "cambio"
  | "etfs";

export type LiquidityTier =
  | "D_0"
  | "D_1_TO_5"
  | "D_6_TO_30"
  | "D_PLUS_30"
  | "AT_MATURITY";

export type ProviderType = "OPEN_FINANCE_SANDBOX" | "B3_CSV" | "MANUAL";

export interface NormalizedPositionDTO {
  institutionId: string;
  productClass: ProductClass;
  tickerOrCode: string;
  assetName: string;
  currency: string;
  investedCents: bigint;
  currentGrossCents: bigint;
  currentNetCents: bigint;
  annualRateBps: number;
  indexer: string;
  liquidityTier: LiquidityTier;
  liquidityDays: number;
  fgcCovered: boolean;
  maturityDate: string | null;
  metadataParameters?: Record<string, unknown>;
}

export interface AccountConnector {
  syncPositions(userId: string, credentialsOrData: unknown): Promise<NormalizedPositionDTO[]>;
}
