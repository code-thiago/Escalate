import type { LiquidityTier } from "../../../connectors/types";
import {
  calculateCryptoTax,
  calculateFisherRealReturnBps,
  getRegressiveIRRateBps,
  roundDiv,
} from "../taxation";
import {
  DEFAULT_BENCHMARKS,
  type BenchmarkRates,
  type StandardProductAnalysisResult,
  type HiddenCostItem,
} from "./types";

export type CryptoCustodyMode = "EXCHANGE_CUSTODY" | "COLD_WALLET_SELF_CUSTODY";

export interface CriptoAnalysisInput {
  productName: string;
  investedCents: bigint;
  capitalGainCents: bigint;
  monthlySalesCents: bigint;
  holdingDays: number;
  exchangeFeeBps?: number;     // Maker/Taker fee + spread (default 50 bps = 0.50%)
  networkGasFeeCents?: bigint; // On-chain withdrawal/network fee
  custodyMode?: CryptoCustodyMode;
  liquidityTier?: LiquidityTier;
  benchmarks?: BenchmarkRates;
}

/**
 * Analyzes Cryptoassets across the 5 critical System Design blocks:
 * Progressive capital gains tax above R$ 35k monthly sales, exchange spread & gas friction,
 * custody counterparty risk (Exchange vs Cold Wallet), and Fisher real return.
 */
export function analyzeCripto(input: CriptoAnalysisInput): StandardProductAnalysisResult {
  const {
    productName,
    investedCents,
    capitalGainCents,
    monthlySalesCents,
    holdingDays,
    exchangeFeeBps = 50,
    networkGasFeeCents = 0n,
    custodyMode = "EXCHANGE_CUSTODY",
    liquidityTier = "D_0",
    benchmarks = {},
  } = input;

  const cdiBps = benchmarks.cdiBps ?? DEFAULT_BENCHMARKS.cdiBps;
  const selicBps = benchmarks.selicBps ?? DEFAULT_BENCHMARKS.selicBps;
  const ipcaBps = benchmarks.ipcaBps ?? DEFAULT_BENCHMARKS.ipcaBps;

  const years = Math.max(1 / 365, holdingDays / 365);

  const grossYieldCents = capitalGainCents > 0n ? capitalGainCents : 0n;
  const grossYieldBps =
    investedCents > 0n ? Number(roundDiv(grossYieldCents * 10000n, investedCents)) : 0;

  // Exchange fee on entry + exit
  const totalExitCents = investedCents + grossYieldCents;
  const exchangeFeeCents = roundDiv(
    (investedCents + totalExitCents) * BigInt(exchangeFeeBps),
    10000n,
  );
  const totalFeesCents = exchangeFeeCents + networkGasFeeCents;

  // Crypto Capital Gains Tax (R$ 35k monthly exemption + progressive brackets)
  const taxResult = calculateCryptoTax(grossYieldCents, monthlySalesCents);

  const netYieldCents =
    grossYieldCents > taxResult.taxCents + totalFeesCents
      ? grossYieldCents - taxResult.taxCents - totalFeesCents
      : 0n;
  const netYieldBps =
    investedCents > 0n ? Number(roundDiv(netYieldCents * 10000n, investedCents)) : 0;
  const finalNetValueCents =
    investedCents + capitalGainCents - taxResult.taxCents - totalFeesCents;

  // Fisher exact real return
  const inflationPeriodFactor = Math.pow(1 + ipcaBps / 10000, years) - 1;
  const inflationPeriodBps = Math.round(inflationPeriodFactor * 10000);
  const realNetYieldBps = calculateFisherRealReturnBps(netYieldBps, inflationPeriodBps);
  const inflationDiscountCents = roundDiv(
    investedCents * BigInt(Math.max(0, inflationPeriodBps)),
    10000n,
  );
  const realNetYieldCents = netYieldCents - inflationDiscountCents;

  // Hidden Costs Scanner
  const hiddenCostItems: HiddenCostItem[] = [
    {
      name: "Spread e Taxa de Execucao da Exchange",
      description: `Taxa maker/taker e spread do livro de ofertas (${(exchangeFeeBps / 100).toFixed(2)}%).`,
      costBps: exchangeFeeBps,
      costCents: exchangeFeeCents,
    },
  ];

  if (networkGasFeeCents > 0n) {
    hiddenCostItems.push({
      name: "Taxa de Rede On-Chain (Gas / Saque)",
      description: "Custo de liquidacao e movimentacao para carteira propria.",
      costBps:
        investedCents > 0n ? Number(roundDiv(networkGasFeeCents * 10000n, investedCents)) : 0,
      costCents: networkGasFeeCents,
    });
  }

  if (taxResult.taxCents > 0n) {
    hiddenCostItems.push({
      name: "Imposto sobre Ganho de Capital Progressivo (15% a 22,5%)",
      description:
        "Alienacoes mensais acima de R$ 35.000,00 tributadas pela tabela progressiva da RFB.",
      costBps: taxResult.effectiveRateBps,
      costCents: taxResult.taxCents,
    });
  } else if (taxResult.isExempt) {
    hiddenCostItems.push({
      name: "Isencao Mensal R$ 35.000 (Cripto Nacional)",
      description: "Vendas mensais em exchanges nacionais abaixo do limite de R$ 35.000,00.",
      costBps: 0,
      costCents: 0n,
    });
  }

  const totalHiddenCostCents = totalFeesCents + taxResult.taxCents;
  const totalHiddenCostBps =
    investedCents > 0n ? Number(roundDiv(totalHiddenCostCents * 10000n, investedCents)) : 0;

  const annualizedNetBps = Math.round(netYieldBps / years);
  const selicPeriodFactor = Math.pow(1 + selicBps / 10000, years) - 1;
  const selicGrossCents = roundDiv(
    investedCents * BigInt(Math.max(0, Math.round(selicPeriodFactor * 1000000))),
    1000000n,
  );
  const selicIrBps = getRegressiveIRRateBps(holdingDays);
  const selicNetCents =
    selicGrossCents - roundDiv(selicGrossCents * BigInt(selicIrBps), 10000n);
  const opportunityCostVsRiskFreeCents =
    selicNetCents > netYieldCents ? selicNetCents - netYieldCents : 0n;

  return {
    productClass: "cripto",
    productName,
    horizonDays: holdingDays,
    netRealReturn: {
      investedCents,
      grossYieldCents,
      grossYieldBps,
      iofCents: 0n,
      irCents: taxResult.taxCents,
      effectiveTaxRateBps: taxResult.effectiveRateBps,
      totalFeesCents,
      netYieldCents,
      netYieldBps,
      finalNetValueCents,
      inflationDiscountCents,
      realNetYieldCents,
      realNetYieldBps,
    },
    hiddenCosts: {
      totalHiddenCostBps,
      totalHiddenCostCents,
      items: hiddenCostItems,
    },
    guaranteeMatrix: {
      fgcEligible: false,
      fgcCoveredCents: 0n,
      fgcUncoveredCents: finalNetValueCents > 0n ? finalNetValueCents : 0n,
      creditRiskType: custodyMode === "EXCHANGE_CUSTODY" ? "CUSTODIAL" : "UNSECURED",
      riskRating: "SPECULATIVE",
      explanation:
        custodyMode === "EXCHANGE_CUSTODY"
          ? "Ativo digital sob custodia de Exchange centralizada (risco de contraparte + ZERO FGC). Recomenda-se auto-custodia para montantes relevantes."
          : "Auto-custodia em Cold Wallet elimina risco de falencia de Exchange, mantendo risco de volatilidade e gestao de chaves privadas (ZERO FGC).",
    },
    benchmarking: {
      cdiSpreadBps: annualizedNetBps - cdiBps,
      selicSpreadBps: annualizedNetBps - selicBps,
      ipcaSpreadBps: annualizedNetBps - ipcaBps,
      benchmarkComparisonName: "Bitcoin / CDI",
      opportunityCostVsRiskFreeCents,
    },
    zenEngineInput: {
      productClass: "cripto",
      annualRateBps: annualizedNetBps,
      feeBps: exchangeFeeBps,
      fgcCovered: false,
      liquidityTier,
      realNetYieldBps,
      hiddenDragBps: totalHiddenCostBps,
      creditRiskType: "CUSTODIAL",
      holdingPeriodDays: holdingDays,
    },
  };
}
