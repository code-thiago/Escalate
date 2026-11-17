import type { NormalizedPositionDTO } from "../../connectors/types";
import { consolidatePortfolio, calculateLiquidityLadder } from "./portfolio";
import { buildBiphasicCalendar, summarizeBiphasicCalendar } from "./calendar";
import { computeGoalProgress } from "./goals";
import { calculateFgcGuarantee } from "./fgc";
import type {
  CalendarLedgerEventRecord,
  GoalAllocationWithAsset,
  InvestmentGoal,
} from "./types";

export interface ConnectedAccountSummary {
  id: string;
  institutionName: string;
  providerType: "OPEN_FINANCE_SANDBOX" | "B3_CSV" | "MANUAL";
  status: "ACTIVE" | "NEEDS_REAUTH";
  lastSyncAt: string;
  assetsCount: number;
  totalNetCents: bigint;
}

export const INITIAL_CONNECTED_ACCOUNTS: ConnectedAccountSummary[] = [
  {
    id: "conn-btg-of",
    institutionName: "BTG Pactual Wealth (Open Finance)",
    providerType: "OPEN_FINANCE_SANDBOX",
    status: "ACTIVE",
    lastSyncAt: "2026-11-05T13:45:00Z",
    assetsCount: 3,
    totalNetCents: 38240000n,
  },
  {
    id: "conn-itau-of",
    institutionName: "Itau Personnalite (Open Finance)",
    providerType: "OPEN_FINANCE_SANDBOX",
    status: "ACTIVE",
    lastSyncAt: "2026-11-05T13:42:00Z",
    assetsCount: 2,
    totalNetCents: 28450000n,
  },
  {
    id: "conn-b3-cei",
    institutionName: "B3 Area do Investidor (CEI CSV)",
    providerType: "B3_CSV",
    status: "ACTIVE",
    lastSyncAt: "2026-11-04T18:20:00Z",
    assetsCount: 3,
    totalNetCents: 26800000n,
  },
  {
    id: "conn-cold-manual",
    institutionName: "Custodia Direta & Exterior (Manual)",
    providerType: "MANUAL",
    status: "ACTIVE",
    lastSyncAt: "2026-11-05T10:15:00Z",
    assetsCount: 2,
    totalNetCents: 11200000n,
  },
];

export const INITIAL_PORTFOLIO_POSITIONS: NormalizedPositionDTO[] = [
  {
    institutionId: "ITAU_CONGLOMERATE",
    productClass: "renda_fixa",
    tickerOrCode: "CDB-ITAU-DI",
    assetName: "CDB Itau Liquidez Diaria 102% CDI",
    currency: "BRL",
    investedCents: 16000000n,
    currentGrossCents: 18100000n,
    currentNetCents: 17750000n,
    annualRateBps: 1350,
    indexer: "CDI",
    liquidityTier: "D_0",
    liquidityDays: 0,
    fgcCovered: true,
    maturityDate: "2027-05-15",
  },
  {
    institutionId: "ITAU_CONGLOMERATE",
    productClass: "renda_fixa",
    tickerOrCode: "LCI-ITAU-95",
    assetName: "LCI Itau Imobiliario 95% CDI Isento",
    currency: "BRL",
    investedCents: 9800000n,
    currentGrossCents: 10700000n,
    currentNetCents: 10700000n,
    annualRateBps: 1258,
    indexer: "CDI",
    liquidityTier: "D_PLUS_30",
    liquidityDays: 90,
    fgcCovered: true,
    maturityDate: "2027-02-20",
  },
  {
    institutionId: "BTG_CONGLOMERATE",
    productClass: "tesouro_direto",
    tickerOrCode: "TESOURO-IPCA-2035",
    assetName: "Tesouro IPCA+ 2035 Soberano",
    currency: "BRL",
    investedCents: 19500000n,
    currentGrossCents: 22100000n,
    currentNetCents: 21710000n,
    annualRateBps: 1125,
    indexer: "IPCA",
    liquidityTier: "D_1_TO_5",
    liquidityDays: 1,
    fgcCovered: false,
    maturityDate: "2035-05-15",
  },
  {
    institutionId: "BTG_CONGLOMERATE",
    productClass: "fundos",
    tickerOrCode: "BTG-ABS-MM",
    assetName: "Fundo Quantitativo Multimercado LP",
    currency: "BRL",
    investedCents: 11000000n,
    currentGrossCents: 12450000n,
    currentNetCents: 12230000n,
    annualRateBps: 1410,
    indexer: "CDI+",
    liquidityTier: "D_6_TO_30",
    liquidityDays: 30,
    fgcCovered: false,
    maturityDate: null,
  },
  {
    institutionId: "BTG_CONGLOMERATE",
    productClass: "coe",
    tickerOrCode: "COE-SP500-CAP",
    assetName: "COE S&P 500 Capital Protegido Travado",
    currency: "BRL",
    investedCents: 4000000n,
    currentGrossCents: 4380000n,
    currentNetCents: 4300000n,
    annualRateBps: 980,
    indexer: "SP500",
    liquidityTier: "AT_MATURITY",
    liquidityDays: 540,
    fgcCovered: false,
    maturityDate: "2027-08-10",
  },
  {
    institutionId: "B3_CUSTODY",
    productClass: "bolsa",
    tickerOrCode: "WEGE3",
    assetName: "WEG S.A. ON Novo Mercado",
    currency: "BRL",
    investedCents: 8200000n,
    currentGrossCents: 9600000n,
    currentNetCents: 9600000n,
    annualRateBps: 1620,
    indexer: "IBOV",
    liquidityTier: "D_1_TO_5",
    liquidityDays: 2,
    fgcCovered: false,
    maturityDate: null,
  },
  {
    institutionId: "B3_CUSTODY",
    productClass: "etfs",
    tickerOrCode: "IVVB11",
    assetName: "iShares S&P 500 FII ETF B3",
    currency: "BRL",
    investedCents: 10500000n,
    currentGrossCents: 12400000n,
    currentNetCents: 12120000n,
    annualRateBps: 1540,
    indexer: "SP500",
    liquidityTier: "D_1_TO_5",
    liquidityDays: 2,
    fgcCovered: false,
    maturityDate: null,
  },
  {
    institutionId: "B3_CUSTODY",
    productClass: "renda_fixa",
    tickerOrCode: "CRI-LOG-IPCA",
    assetName: "CRI Logistica Prime IPCA + 7.8% Isento",
    currency: "BRL",
    investedCents: 4800000n,
    currentGrossCents: 5080000n,
    currentNetCents: 5080000n,
    annualRateBps: 1245,
    indexer: "IPCA",
    liquidityTier: "AT_MATURITY",
    liquidityDays: 720,
    fgcCovered: false,
    maturityDate: "2028-11-15",
  },
  {
    institutionId: "SELF_CUSTODY",
    productClass: "cripto",
    tickerOrCode: "BTC-COLD",
    assetName: "Bitcoin Native SegWit (Hardware Wallet)",
    currency: "BRL",
    investedCents: 4500000n,
    currentGrossCents: 6400000n,
    currentNetCents: 6400000n,
    annualRateBps: 2400,
    indexer: "BTC",
    liquidityTier: "D_0",
    liquidityDays: 0,
    fgcCovered: false,
    maturityDate: null,
  },
  {
    institutionId: "GLOBAL_REMITTANCE",
    productClass: "cambio",
    tickerOrCode: "USD-TREASURY-MM",
    assetName: "Reserva Cambial USD T-Bills 4.85%",
    currency: "USD",
    investedCents: 4500000n,
    currentGrossCents: 4850000n,
    currentNetCents: 4800000n,
    annualRateBps: 1080,
    indexer: "PTAX+SOFR",
    liquidityTier: "D_1_TO_5",
    liquidityDays: 2,
    fgcCovered: false,
    maturityDate: null,
  },
];

export const INITIAL_CALENDAR_EVENTS: CalendarLedgerEventRecord[] = [
  {
    id: "ev-1",
    eventDate: "2026-08-12",
    eventType: "DIVIDEND_JCP",
    amountCents: 84500n,
    yieldBps: 88,
    assetId: "WEGE3",
    description: "Proventos JCP + Dividendos WEGE3",
  },
  {
    id: "ev-2",
    eventDate: "2026-08-28",
    eventType: "DAILY_YIELD_SNAPSHOT",
    amountCents: 685000n,
    yieldBps: 67,
    assetId: "CDB-ITAU-DI",
    description: "Rendimento Mensal Consolidado Renda Fixa & Tesouro",
  },
  {
    id: "ev-3",
    eventDate: "2026-09-15",
    eventType: "COUPON",
    amountCents: 192000n,
    yieldBps: 89,
    assetId: "CRI-LOG-IPCA",
    description: "Cupom Semestral Isento CRI Logistica",
  },
  {
    id: "ev-4",
    eventDate: "2026-09-30",
    eventType: "DAILY_YIELD_SNAPSHOT",
    amountCents: 740000n,
    yieldBps: 72,
    assetId: "TESOURO-IPCA-2035",
    description: "Marcacao e Accrual Mensal Carteira Consolidada",
  },
  {
    id: "ev-5",
    eventDate: "2026-10-18",
    eventType: "DIVIDEND_JCP",
    amountCents: 112000n,
    yieldBps: 94,
    assetId: "WEGE3",
    description: "Distribuicao Trimestral Dividendos B3",
  },
  {
    id: "ev-6",
    eventDate: "2026-10-30",
    eventType: "DAILY_YIELD_SNAPSHOT",
    amountCents: 815000n,
    yieldBps: 79,
    assetId: "CDB-ITAU-DI",
    description: "Accrual Liquido Mensal Outubro/2026",
  },
  {
    id: "ev-7",
    eventDate: "2026-11-05",
    eventType: "DAILY_YIELD_SNAPSHOT",
    amountCents: 210000n,
    yieldBps: 21,
    assetId: "CDB-ITAU-DI",
    description: "Accrual Parcial Novembro/2026 (Data-Base Atual)",
  },
  {
    id: "ev-8",
    eventDate: "2026-12-15",
    eventType: "DIVIDEND_JCP",
    amountCents: 145000n,
    yieldBps: 110,
    assetId: "WEGE3",
    description: "Provento Programado JCP Dezembro",
  },
];

export const INITIAL_INVESTMENT_GOALS: Array<{
  goal: InvestmentGoal;
  allocations: Array<{ tickerOrCode: string; allocatedBps: number }>;
}> = [
  {
    goal: {
      id: "goal-reserva",
      userId: "demo-user",
      title: "Reserva Institucional de Liquidez Imediata",
      targetAmountCents: 20000000n, // R$ 200,000.00
      targetDate: "2026-12-31",
      requiredLiquidityMaxTier: "D_1_TO_5",
    },
    allocations: [
      { tickerOrCode: "CDB-ITAU-DI", allocatedBps: 8500 }, // 85% of CDB Itau
      { tickerOrCode: "TESOURO-IPCA-2035", allocatedBps: 2000 }, // 20% of Tesouro
    ],
  },
  {
    goal: {
      id: "goal-expansao-global",
      userId: "demo-user",
      title: "Hedge Cambial & Expansao Internacional",
      targetAmountCents: 25000000n, // R$ 250,000.00
      targetDate: "2027-06-30",
      requiredLiquidityMaxTier: "D_6_TO_30",
    },
    allocations: [
      { tickerOrCode: "IVVB11", allocatedBps: 10000 }, // 100% IVVB11
      { tickerOrCode: "USD-TREASURY-MM", allocatedBps: 10000 }, // 100% USD Treasury
      { tickerOrCode: "COE-SP500-CAP", allocatedBps: 5000 }, // 50% COE (Triggers intentional liquidity warning for demonstration!)
    ],
  },
  {
    goal: {
      id: "goal-independencia",
      userId: "demo-user",
      title: "Independencia Patrimonial Quant IPCA+",
      targetAmountCents: 100000000n, // R$ 1,000,000.00
      targetDate: "2035-12-31",
      requiredLiquidityMaxTier: "ANY",
    },
    allocations: [
      { tickerOrCode: "TESOURO-IPCA-2035", allocatedBps: 8000 },
      { tickerOrCode: "LCI-ITAU-95", allocatedBps: 10000 },
      { tickerOrCode: "BTG-ABS-MM", allocatedBps: 10000 },
      { tickerOrCode: "WEGE3", allocatedBps: 10000 },
      { tickerOrCode: "CRI-LOG-IPCA", allocatedBps: 10000 },
      { tickerOrCode: "BTC-COLD", allocatedBps: 10000 },
    ],
  },
];

export function computeFullPortfolioDashboardState(
  positions: NormalizedPositionDTO[] = INITIAL_PORTFOLIO_POSITIONS,
  horizonMonths = 6,
) {
  const consolidation = consolidatePortfolio(positions);
  const liquidityLadder = calculateLiquidityLadder(positions);
  const fgcAnalysis = calculateFgcGuarantee(positions);

  const calendarMonths = buildBiphasicCalendar({
    referenceDate: "2026-11-05",
    startYearMonth: "2026-08",
    horizonMonths,
    startingPortfolioCents: consolidation.totalNetCents,
    ledgerEvents: INITIAL_CALENDAR_EVENTS,
    portfolioAssets: positions.map((p, idx) => ({
      id: `asset-${idx}`,
      tickerOrCode: p.tickerOrCode,
      assetName: p.assetName,
      currentNetCents: p.currentNetCents,
      annualRateBps: p.annualRateBps,
      maturityDate: p.maturityDate,
    })),
    expectedRateCurve: {
      p10RateBps: 940,
      p50RateBps: 1345,
      p90RateBps: 1790,
    },
  });

  const calendarSummary = summarizeBiphasicCalendar(calendarMonths);

  const posByTicker = new Map<string, NormalizedPositionDTO>();
  for (const p of positions) {
    posByTicker.set(p.tickerOrCode, p);
  }

  const goalsProgress = INITIAL_INVESTMENT_GOALS.map(({ goal, allocations }) => {
    const resolvedAllocations: GoalAllocationWithAsset[] = [];
    for (const item of allocations) {
      const asset = posByTicker.get(item.tickerOrCode);
      if (asset) {
        resolvedAllocations.push({
          asset,
          allocatedBps: item.allocatedBps,
        });
      }
    }
    return computeGoalProgress(goal, resolvedAllocations);
  });

  return {
    accounts: INITIAL_CONNECTED_ACCOUNTS,
    positions,
    consolidation,
    liquidityLadder,
    fgcAnalysis,
    calendarMonths,
    calendarSummary,
    goalsProgress,
  };
}
