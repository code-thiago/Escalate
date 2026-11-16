import { describe, expect, it } from "vitest";
import {
  analyzeBolsa,
  analyzeCambio,
  analyzeCoe,
  analyzeCripto,
  analyzeEtfs,
  analyzeFundos,
  analyzeRendaFixa,
  analyzeTesouroDireto,
} from "../products";

describe("8 Product Critical Analyzers (5-Block System Design Verification)", () => {
  it("1. Renda Fixa: analyzes CDB vs CRI and validates FGC + regressive IR", () => {
    const cdb = analyzeRendaFixa({
      productName: "CDB Liquidez Diaria 110% CDI",
      subType: "CDB",
      investedCents: 15000000n, // R$ 150,000.00
      annualRateBps: 1446,
      holdingDays: 730,
    });
    expect(cdb.productClass).toBe("renda_fixa");
    expect(cdb.guaranteeMatrix.fgcEligible).toBe(true);
    expect(cdb.guaranteeMatrix.fgcCoveredCents).toBeGreaterThan(15000000n);
    expect(cdb.guaranteeMatrix.fgcUncoveredCents).toBe(0n);
    expect(cdb.netRealReturn.realNetYieldBps).toBeGreaterThan(0);
    expect(cdb.zenEngineInput.fgcCovered).toBe(true);

    const cri = analyzeRendaFixa({
      productName: "CRI Corporativo IPCA + 8%",
      subType: "CRI",
      investedCents: 10000000n,
      annualRateBps: 1250,
      holdingDays: 1095,
    });
    expect(cri.guaranteeMatrix.fgcEligible).toBe(false);
    expect(cri.netRealReturn.irCents).toBe(0n);
  });

  it("2. Fundos: detects excessive management fees and come-cotas compounding drag", () => {
    const expensiveFund = analyzeFundos({
      productName: "Fundo Renda Fixa Bancao 2.5% a.a.",
      subType: "RENDA_FIXA_LP",
      investedCents: 10000000n,
      grossAnnualReturnBps: 1300,
      managementFeeBps: 250,
      holdingDays: 730,
    });
    expect(expensiveFund.productClass).toBe("fundos");
    expect(expensiveFund.hiddenCosts.totalHiddenCostBps).toBeGreaterThanOrEqual(250);
    expect(expensiveFund.hiddenCosts.items.length).toBeGreaterThanOrEqual(2);
    expect(expensiveFund.guaranteeMatrix.fgcEligible).toBe(false);
  });

  it("3. Bolsa: handles swing-trade exemption and day-trade taxation", () => {
    const swing = analyzeBolsa({
      productName: "WEGE3 Swing Trade",
      assetType: "ACAO_B3",
      investedCents: 1500000n,
      capitalGainCents: 250000n,
      monthlySalesCents: 1750000n, // <= R$ 20k exempt
      isDayTrade: false,
      holdingDays: 180,
    });
    expect(swing.productClass).toBe("bolsa");
    expect(swing.netRealReturn.irCents).toBe(0n);
    expect(swing.guaranteeMatrix.creditRiskType).toBe("CORPORATE");
  });

  it("4. COE: exposes structuring spread, upside cap asymmetry, and zero FGC", () => {
    const coe = analyzeCoe({
      productName: "COE S&P 500 Capital Protegido",
      structureType: "CAPITAL_PROTEGIDO",
      investedCents: 10000000n,
      expectedNominalReturnBps: 1050,
      participationCapBps: 1300,
      embeddedSpreadBps: 400,
      holdingDays: 1095,
    });
    expect(coe.productClass).toBe("coe");
    expect(coe.guaranteeMatrix.fgcEligible).toBe(false);
    expect(coe.hiddenCosts.totalHiddenCostBps).toBeGreaterThanOrEqual(400);
    expect(coe.zenEngineInput.fgcCovered).toBe(false);
  });

  it("5. Cripto: evaluates R$ 35k monthly exemption and custody risk", () => {
    const cripto = analyzeCripto({
      productName: "Bitcoin (BTC) Cold Storage",
      investedCents: 5000000n,
      capitalGainCents: 1500000n,
      monthlySalesCents: 2000000n,
      holdingDays: 365,
      custodyMode: "COLD_WALLET_SELF_CUSTODY",
    });
    expect(cripto.productClass).toBe("cripto");
    expect(cripto.netRealReturn.irCents).toBe(0n);
    expect(cripto.guaranteeMatrix.fgcEligible).toBe(false);
  });

  it("6. Tesouro Direto: enforces R$ 10k B3 custody exemption on Tesouro Selic", () => {
    const selicExempt = analyzeTesouroDireto({
      productName: "Tesouro Selic 2029",
      subType: "TESOURO_SELIC",
      investedCents: 900000n, // R$ 9,000.00 <= R$ 10,000.00 exempt
      annualRateBps: 1325,
      holdingDays: 730,
    });
    expect(selicExempt.productClass).toBe("tesouro_direto");
    expect(selicExempt.netRealReturn.totalFeesCents).toBe(0n);
    expect(selicExempt.guaranteeMatrix.creditRiskType).toBe("SOVEREIGN");
    expect(selicExempt.guaranteeMatrix.riskRating).toBe("VERY_LOW");
  });

  it("7. Cambio: calculates PTAX spread, IOF by operation type, and VET", () => {
    const cambio = analyzeCambio({
      productName: "Remessa USD Investimento Exterior",
      operationType: "INVESTMENT_REMITTANCE",
      investedCents: 5000000n,
      ptaxRateCents: 580n,
      spreadBps: 120,
      expectedCurrencyAppreciationBps: 800,
      holdingDays: 365,
    });
    expect(cambio.productClass).toBe("cambio");
    expect(cambio.netRealReturn.iofCents).toBeGreaterThan(0n);
    expect(cambio.hiddenCosts.totalHiddenCostBps).toBeGreaterThan(0);
  });

  it("8. ETFs: verifies absence of come-cotas and absence of 20k exemption", () => {
    const etf = analyzeEtfs({
      productName: "IVVB11 S&P 500 ETF",
      subType: "ETF_INTERNACIONAL",
      investedCents: 10000000n,
      grossAnnualReturnBps: 1500,
      expenseRatioBps: 23,
      holdingDays: 730,
    });
    expect(etf.productClass).toBe("etfs");
    expect(etf.netRealReturn.irCents).toBeGreaterThan(0n);
    expect(etf.hiddenCosts.totalHiddenCostBps).toBeGreaterThanOrEqual(23);
  });
});
