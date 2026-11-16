import { describe, expect, it } from "vitest";
import {
  calculateBolsaTax,
  calculateComeCotasImpact,
  calculateCryptoTax,
  calculateEquivalentTaxFreeRateBps,
  calculateEquivalentTaxableRateBps,
  calculateFisherRealReturnBps,
  calculateFixedIncomeTax,
  getIOFRateBps,
  getRegressiveIRRateBps,
} from "../taxation";
import {
  calculateFgcGuarantee,
  evaluateFgcPosition,
  FGC_CONGLOMERATE_CAP_CENTS,
  FGC_GLOBAL_4_YEAR_CAP_CENTS,
  isFgcEligibleInstrument,
} from "../fgc";
import type { NormalizedPositionDTO } from "../../../connectors/types";

describe("Taxation Engine (Regressive IR, IOF, Bolsa, Cripto, Fisher & Come-Cotas)", () => {
  it("computes regressive IR brackets accurately for 180, 360, 720, and >720 days", () => {
    expect(getRegressiveIRRateBps(90)).toBe(2250);
    expect(getRegressiveIRRateBps(180)).toBe(2250);
    expect(getRegressiveIRRateBps(181)).toBe(2000);
    expect(getRegressiveIRRateBps(360)).toBe(2000);
    expect(getRegressiveIRRateBps(361)).toBe(1750);
    expect(getRegressiveIRRateBps(720)).toBe(1750);
    expect(getRegressiveIRRateBps(721)).toBe(1500);
    expect(getRegressiveIRRateBps(1080)).toBe(1500);
  });

  it("computes IOF table from day 1 (96%) to day 29 (3%) and day 30+ (0%)", () => {
    expect(getIOFRateBps(1)).toBe(9600);
    expect(getIOFRateBps(15)).toBe(5000);
    expect(getIOFRateBps(29)).toBe(300);
    expect(getIOFRateBps(30)).toBe(0);
    expect(getIOFRateBps(90)).toBe(0);
  });

  it("applies IOF before IR on short-term fixed income redemptions (<30 days)", () => {
    // R$ 1,000.00 gross yield at day 15 -> 50% IOF (R$ 500), then 22.5% IR on remaining R$ 500 (R$ 112.50)
    const res = calculateFixedIncomeTax(100000n, 15, false);
    expect(res.iofCents).toBe(50000n);
    expect(res.irCents).toBe(11250n);
    expect(res.totalTaxCents).toBe(61250n);
    expect(res.netYieldCents).toBe(38750n);
  });

  it("respects tax-exempt instruments (LCI/LCA/CRI/CRA) after 30 days", () => {
    const res = calculateFixedIncomeTax(250000n, 365, true);
    expect(res.iofCents).toBe(0n);
    expect(res.irCents).toBe(0n);
    expect(res.netYieldCents).toBe(250000n);
  });

  it("enforces R$ 20,000 monthly swing-trade exemption in Bolsa and taxes day-trade at 20%", () => {
    const exemptSwing = calculateBolsaTax(300000n, 1950000n, false);
    expect(exemptSwing.isExempt).toBe(true);
    expect(exemptSwing.taxCents).toBe(0n);

    const taxedSwing = calculateBolsaTax(300000n, 2500000n, false);
    expect(taxedSwing.isExempt).toBe(false);
    expect(taxedSwing.rateBps).toBe(1500);
    expect(taxedSwing.taxCents).toBe(45000n);

    const dayTrade = calculateBolsaTax(300000n, 1000000n, true);
    expect(dayTrade.isExempt).toBe(false);
    expect(dayTrade.rateBps).toBe(2000);
    expect(dayTrade.taxCents).toBe(60000n);
  });

  it("enforces R$ 35,000 monthly crypto sales exemption and progressive brackets above it", () => {
    const exemptCrypto = calculateCryptoTax(500000n, 3400000n);
    expect(exemptCrypto.isExempt).toBe(true);
    expect(exemptCrypto.taxCents).toBe(0n);

    const taxedCrypto = calculateCryptoTax(1000000n, 4000000n);
    expect(taxedCrypto.isExempt).toBe(false);
    expect(taxedCrypto.effectiveRateBps).toBe(1500);
    expect(taxedCrypto.taxCents).toBe(150000n);
  });

  it("computes Fisher exact real return and tax-equivalent rates", () => {
    // (1 + 0.12) / (1 + 0.045) - 1 = 0.07177 -> 718 bps
    const realReturnBps = calculateFisherRealReturnBps(1200, 450);
    expect(realReturnBps).toBe(718);

    const eqTaxFree = calculateEquivalentTaxFreeRateBps(1000, 721); // 15% IR -> 850 bps
    expect(eqTaxFree).toBe(850);

    const eqTaxable = calculateEquivalentTaxableRateBps(850, 721);
    expect(eqTaxable).toBe(1000);
  });

  it("simulates semiannual come-cotas compounding drag over multi-year horizons", () => {
    const sim = calculateComeCotasImpact(10000000n, 1200, 1095, "LONGO_PRAZO");
    expect(sim.semestersCount).toBe(6);
    expect(sim.cumulativeTaxCents).toBeGreaterThan(0n);
    expect(sim.lossFromCompoundingCents).toBeGreaterThan(0n);
  });
});

describe("FGC Guarantee Engine (R$ 250k per Conglomerate & R$ 1M 4-Year Global Cap)", () => {
  it("correctly classifies FGC eligible and ineligible instruments", () => {
    expect(isFgcEligibleInstrument("renda_fixa", "CDB BANCO INTER")).toBe(true);
    expect(isFgcEligibleInstrument("renda_fixa", "LCI CAIXA")).toBe(true);
    expect(isFgcEligibleInstrument("renda_fixa", "CRI CYRELA")).toBe(false);
    expect(isFgcEligibleInstrument("renda_fixa", "DEBENTURE VALE")).toBe(false);
    expect(isFgcEligibleInstrument("tesouro_direto", "TESOURO SELIC")).toBe(false);
    expect(isFgcEligibleInstrument("coe", "COE NASDAQ")).toBe(false);
  });

  it("caps single position coverage at R$ 250,000.00 (25,000,000 cents)", () => {
    const evaluation = evaluateFgcPosition({
      currentGrossCents: 35000000n,
      fgcCovered: true,
    });
    expect(evaluation.coveredCents).toBe(FGC_CONGLOMERATE_CAP_CENTS);
    expect(evaluation.uncoveredCents).toBe(10000000n);
    expect(evaluation.isCovered).toBe(true);
  });

  it("aggregates multiple positions by conglomerate and enforces R$ 1M global ceiling", () => {
    const createPos = (
      institutionId: string,
      grossCents: bigint,
      ticker = "CDB-100",
    ): NormalizedPositionDTO => ({
      institutionId,
      productClass: "renda_fixa",
      tickerOrCode: ticker,
      assetName: `${ticker} ${institutionId}`,
      currency: "BRL",
      liquidityTier: "D_0",
      liquidityDays: 0,
      investedCents: grossCents,
      currentGrossCents: grossCents,
      currentNetCents: grossCents,
      annualRateBps: 1300,
      indexer: "CDI",
      fgcCovered: true,
      maturityDate: null,
    });

    const positions: NormalizedPositionDTO[] = [
      createPos("CONGLOMERATE_A", 20000000n, "CDB-1"),
      createPos("CONGLOMERATE_A", 10000000n, "LCI-2"), // Total A = R$ 300k -> R$ 250k covered, R$ 50k excess
      createPos("CONGLOMERATE_B", 25000000n), // R$ 250k covered
      createPos("CONGLOMERATE_C", 25000000n), // R$ 250k covered
      createPos("CONGLOMERATE_D", 25000000n), // R$ 250k covered
      createPos("CONGLOMERATE_E", 25000000n), // R$ 250k -> exceeds 1M global ceiling!
    ];

    const analysis = calculateFgcGuarantee(positions);
    expect(analysis.totalEligibleCents).toBe(130000000n); // R$ 1.3M total eligible
    expect(analysis.coveredCents).toBe(FGC_GLOBAL_4_YEAR_CAP_CENTS); // Capped at R$ 1,000,000.00
    expect(analysis.uncoveredCents).toBe(30000000n); // R$ 300k uncovered
    expect(analysis.coveredCents + analysis.uncoveredCents).toBe(analysis.totalEligibleCents);
    expect(analysis.isGlobalCapExceeded).toBe(true);
    expect(analysis.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
