import { AccountConnector, NormalizedPositionDTO } from "../types";

export interface OpenFinanceSyncOptions {
  institutionIds?: string[];
}

export class OpenFinanceSandboxAdapter implements AccountConnector {
  private deterministicPositions: NormalizedPositionDTO[] = [
    // XP Investimentos
    {
      institutionId: "XP",
      productClass: "renda_fixa",
      tickerOrCode: "CDB-MASTER-125CDI",
      assetName: "CDB Banco Master 125% CDI",
      currency: "BRL",
      investedCents: 5000000n, // R$ 50.000,00
      currentGrossCents: 5450000n, // R$ 54.500,00
      currentNetCents: 5360000n, // R$ 53.600,00
      annualRateBps: 12500, // 125.00% do CDI
      indexer: "CDI",
      liquidityTier: "AT_MATURITY",
      liquidityDays: 365,
      fgcCovered: true,
      maturityDate: "2027-12-31",
      metadataParameters: { creditRating: "BBB", issuer: "Banco Master" },
    },
    {
      institutionId: "XP",
      productClass: "fundos",
      tickerOrCode: "KNCR11",
      assetName: "Kinea Rendimentos Imobiliários FII",
      currency: "BRL",
      investedCents: 3000000n, // R$ 30.000,00
      currentGrossCents: 3150000n, // R$ 31.500,00
      currentNetCents: 3150000n, // Isento de IR pessoa física
      annualRateBps: 1150, // 11.50% Dividend Yield
      indexer: "CDI",
      liquidityTier: "D_1_TO_5",
      liquidityDays: 2,
      fgcCovered: false,
      maturityDate: null,
      metadataParameters: { quotaQuantity: 300, quotaPriceCents: 10500 },
    },
    {
      institutionId: "XP",
      productClass: "coe",
      tickerOrCode: "COE-SP500-PROT",
      assetName: "COE S&P 500 Alta Ilimitada Capital Protegido",
      currency: "BRL",
      investedCents: 2000000n, // R$ 20.000,00
      currentGrossCents: 2100000n,
      currentNetCents: 2080000n,
      annualRateBps: 950,
      indexer: "SP500",
      liquidityTier: "AT_MATURITY",
      liquidityDays: 730,
      fgcCovered: false,
      maturityDate: "2028-06-30",
      metadataParameters: { protectedCapitalPercentage: 100 },
    },

    // BTG Pactual
    {
      institutionId: "BTG",
      productClass: "renda_fixa",
      tickerOrCode: "CDB-BTG-DIARIO",
      assetName: "CDB BTG Pactual Liquidez Diária 100% CDI",
      currency: "BRL",
      investedCents: 10000000n, // R$ 100.000,00
      currentGrossCents: 10350000n,
      currentNetCents: 10271250n,
      annualRateBps: 10000, // 100.00% CDI
      indexer: "CDI",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: true,
      maturityDate: null,
    },
    {
      institutionId: "BTG",
      productClass: "bolsa",
      tickerOrCode: "PETR4",
      assetName: "Petróleo Brasileiro S.A. Petrobras PN",
      currency: "BRL",
      investedCents: 4500000n, // R$ 45.000,00
      currentGrossCents: 4950000n,
      currentNetCents: 4882500n,
      annualRateBps: 0,
      indexer: "IBOV",
      liquidityTier: "D_1_TO_5",
      liquidityDays: 2,
      fgcCovered: false,
      maturityDate: null,
      metadataParameters: { shareQuantity: 1200, averagePriceCents: 3750 },
    },
    {
      institutionId: "BTG",
      productClass: "etfs",
      tickerOrCode: "BOVA11",
      assetName: "iShares Ibovespa Fundo de Índice ETF",
      currency: "BRL",
      investedCents: 2500000n, // R$ 25.000,00
      currentGrossCents: 2600000n,
      currentNetCents: 2585000n,
      annualRateBps: 0,
      indexer: "IBOV",
      liquidityTier: "D_1_TO_5",
      liquidityDays: 2,
      fgcCovered: false,
      maturityDate: null,
    },

    // Itaú Unibanco
    {
      institutionId: "ITAU",
      productClass: "renda_fixa",
      tickerOrCode: "LCI-ITAU-92CDI",
      assetName: "LCI Itaú 92% do CDI",
      currency: "BRL",
      investedCents: 8000000n, // R$ 80.000,00
      currentGrossCents: 8400000n,
      currentNetCents: 8400000n, // Isento de IR
      annualRateBps: 9200, // 92.00% do CDI
      indexer: "CDI",
      liquidityTier: "D_6_TO_30",
      liquidityDays: 30,
      fgcCovered: true,
      maturityDate: "2026-11-30",
    },
    {
      institutionId: "ITAU",
      productClass: "cambio",
      tickerOrCode: "USD-ACCOUNT",
      assetName: "Saldo em Dólar Comercial Conta Global",
      currency: "USD",
      investedCents: 500000n, // US$ 5.000,00
      currentGrossCents: 500000n,
      currentNetCents: 500000n,
      annualRateBps: 450, // 4.50% Fed Funds
      indexer: "PTAX",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: false,
      maturityDate: null,
    },

    // Tesouro Nacional
    {
      institutionId: "TESOURO",
      productClass: "tesouro_direto",
      tickerOrCode: "TESOURO-SELIC-2029",
      assetName: "Tesouro Selic 2029 (LFT)",
      currency: "BRL",
      investedCents: 6000000n, // R$ 60.000,00
      currentGrossCents: 6300000n,
      currentNetCents: 6247500n,
      annualRateBps: 1325, // 13.25% a.a.
      indexer: "SELIC",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: false, // Risco soberano da União
      maturityDate: "2029-03-01",
    },
    {
      institutionId: "TESOURO",
      productClass: "tesouro_direto",
      tickerOrCode: "TESOURO-IPCA-2035",
      assetName: "Tesouro IPCA+ 2035 com Juros Semestrais (NTN-B)",
      currency: "BRL",
      investedCents: 4000000n, // R$ 40.000,00
      currentGrossCents: 4250000n,
      currentNetCents: 4206250n,
      annualRateBps: 680, // IPCA + 6.80% a.a.
      indexer: "IPCA",
      liquidityTier: "AT_MATURITY",
      liquidityDays: 2500,
      fgcCovered: false,
      maturityDate: "2035-05-15",
    },

    // Cripto Custody
    {
      institutionId: "BINANCE",
      productClass: "cripto",
      tickerOrCode: "BTC",
      assetName: "Bitcoin (BTC)",
      currency: "BRL",
      investedCents: 1500000n, // R$ 15.000,00
      currentGrossCents: 2100000n,
      currentNetCents: 2010000n,
      annualRateBps: 0,
      indexer: "CRYPTO",
      liquidityTier: "D_0",
      liquidityDays: 0,
      fgcCovered: false,
      maturityDate: null,
    },
  ];

  async syncPositions(_userId: string, credentialsOrData?: unknown): Promise<NormalizedPositionDTO[]> {
    const options = (credentialsOrData ?? {}) as OpenFinanceSyncOptions;
    if (options.institutionIds && options.institutionIds.length > 0) {
      const allowed = new Set(options.institutionIds);
      return this.deterministicPositions
        .filter((pos) => allowed.has(pos.institutionId))
        .map((pos) => ({ ...pos }));
    }
    return this.deterministicPositions.map((pos) => ({ ...pos }));
  }
}
