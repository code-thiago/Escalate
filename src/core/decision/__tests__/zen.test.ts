import { describe, expect, it } from "vitest";
import { sanitizeZenInput, zenService } from "../zen";

describe("GoRules ZEN Engine Singleton & JDM Graph Evaluation", () => {
  it("sanitizes BigInt values safely and throws RangeError on unsafe overflow", () => {
    const safe = sanitizeZenInput({
      amountCents: 25000000n,
      nested: [{ feeCents: 1500n }],
    }) as { amountCents: number; nested: Array<{ feeCents: number }> };

    expect(safe.amountCents).toBe(25000000);
    expect(safe.nested[0].feeCents).toBe(1500);

    expect(() =>
      sanitizeZenInput({
        overflow: BigInt(Number.MAX_SAFE_INTEGER) + 100n,
      }),
    ).toThrow(RangeError);
  });

  it("evaluates goal-allocation-guard.jdm.json and catches liquidity mismatch", async () => {
    const rejected = await zenService.evaluateGoalGuard({
      totalAllocatedBps: 5000,
      assetLiquidityDays: 365,
      goalTargetDays: 90,
      assetLiquidityTier: "AT_MATURITY",
      goalHorizonMonths: 3,
      allocationBps: 5000,
      riskProfile: "CONSERVADOR",
    });

    expect(rejected.approved).toBe(false);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.warningFlags).toContain("MATURITY_MISMATCH_LOCKED_ASSET");
    expect(rejected.trace).toBeDefined();

    const approved = await zenService.evaluateGoalGuard({
      totalAllocatedBps: 4000,
      assetLiquidityDays: 0,
      goalTargetDays: 365,
      assetLiquidityTier: "D_0",
      goalHorizonMonths: 12,
      allocationBps: 4000,
      riskProfile: "MODERADO",
    });

    expect(approved.approved).toBe(true);
    expect(approved.status).toBe("APPROVED");
  });

  it("evaluates product-critical-analysis.jdm.json across COE, expensive funds, and Tesouro", async () => {
    const coeEval = await zenService.evaluateProductAnalysis({
      productClass: "coe",
      annualRateBps: 1000,
      feeBps: 400,
      fgcCovered: false,
      liquidityTier: "AT_MATURITY",
      holdingPeriodDays: 1095,
    });
    expect(coeEval.criticalScore).toBe(30);
    expect(coeEval.riskLevel).toBe("CRITICAL");
    expect(coeEval.redFlags).toContain("EMBEDDED_OPTION_SPREAD");

    const tesouroEval = await zenService.evaluateProductAnalysis({
      productClass: "tesouro_direto",
      annualRateBps: 1325,
      feeBps: 20,
      fgcCovered: false,
      liquidityTier: "D_0",
      holdingPeriodDays: 730,
    });
    expect(tesouroEval.criticalScore).toBe(95);
    expect(tesouroEval.riskLevel).toBe("LOW");
  });

  it("evaluates portfolio-quantum-health.jdm.json with Von Neumann entropy and FGC excess", async () => {
    const criticalPortfolio = await zenService.evaluatePortfolioHealth({
      normalizedEntropyScoreBps: 2500,
      quantumTailRisk99Bps: 1800,
      fgcExcessCents: 15000000n,
      liquidityMismatchCount: 1,
      vonNeumannEntropy: 0.25,
      systemicCoherenceIndex: 0.85,
      d0LiquidityBps: 800,
      hhiConcentration: 4200,
    });

    expect(criticalPortfolio.healthState).toBe("CRITICAL");
    expect(criticalPortfolio.rebalanceRequired).toBe(true);
    expect(criticalPortfolio.alerts).toContain("QUANTUM_ENTANGLEMENT_ALERT");
    expect(criticalPortfolio.alerts).toContain("FGC_CEILING_EXCEEDED");
  });
});
