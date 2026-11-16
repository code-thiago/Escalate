import { describe, expect, it } from "vitest";
import {
  analyzePortfolioDensityMatrix,
  QuantumForecastInputSchema,
  simulateQuantumWalkForecast,
} from "../index";

describe("Quantum Mathematics Engine (DTQW & Portfolio Density Matrix / Von Neumann Entropy)", () => {
  it("conserves unitarity sum_x P(x, t) === 1.0 within 10^-9 across quantum, mixed, and classical regimes", () => {
    for (const gamma of [0, 0.25, 0.5, 1.0]) {
      const result = simulateQuantumWalkForecast({
        portfolioNetCents: 50000000n, // R$ 500,000.00
        horizonDays: 30,
        decoherenceRate: gamma,
        confidenceLevelBps: 9900,
        annualDriftBps: 1250,
        annualVolatilityBps: 1800,
      });

      expect(Math.abs(result.totalProbabilitySum - 1.0)).toBeLessThan(1e-9);
      expect(result.p10Cents).toBeLessThanOrEqual(result.p50Cents);
      expect(result.p50Cents).toBeLessThanOrEqual(result.p90Cents);
      expect(typeof result.p50Cents).toBe("bigint");
      expect(typeof result.quantumVaR99Cents).toBe("bigint");
    }
  });

  it("exhibits wider ballistic tail dispersion in coherent quantum mode (gamma = 0) than classical mode (gamma = 1)", () => {
    const quantumMode = simulateQuantumWalkForecast({
      portfolioNetCents: 100000000n,
      horizonDays: 60,
      decoherenceRate: 0.0,
      confidenceLevelBps: 9900,
    });

    const classicalMode = simulateQuantumWalkForecast({
      portfolioNetCents: 100000000n,
      horizonDays: 60,
      decoherenceRate: 1.0,
      confidenceLevelBps: 9900,
    });

    const quantumSpread = quantumMode.p90Cents - quantumMode.p10Cents;
    const classicalSpread = classicalMode.p90Cents - classicalMode.p10Cents;
    expect(quantumSpread).toBeGreaterThan(classicalSpread);
  });

  it("enforces Zod validation bounds on horizonDays [5..252] and decoherenceRate [0..1]", () => {
    expect(() =>
      QuantumForecastInputSchema.parse({
        portfolioNetCents: 100000n,
        horizonDays: 2, // below min 5
        decoherenceRate: 0.2,
      }),
    ).toThrow();

    expect(() =>
      QuantumForecastInputSchema.parse({
        portfolioNetCents: 100000n,
        horizonDays: 500, // above max 252
        decoherenceRate: 0.2,
      }),
    ).toThrow();
  });

  it("computes maximum Von Neumann Entropy S(rho) = ln(N) for orthogonal identity correlation matrix", () => {
    const identity4x4 = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    const res = analyzePortfolioDensityMatrix(identity4x4, ["SELIC", "SP500", "BTC", "GOLD"]);
    expect(Math.abs(res.trace - 1.0)).toBeLessThan(1e-9);
    expect(Math.abs(res.vonNeumannEntropy - Math.log(4))).toBeLessThan(1e-5);
    expect(res.normalizedEntropyScoreBps).toBe(10000);
    expect(res.systemicCoherenceIndex).toBe(0);
  });

  it("computes zero Von Neumann Entropy S(rho) = 0 for maximally entangled (all-ones) correlation matrix", () => {
    const fullyCorrelated3x3 = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];

    const res = analyzePortfolioDensityMatrix(fullyCorrelated3x3, ["IBOV", "BOVA11", "SMAL11"]);
    expect(Math.abs(res.trace - 1.0)).toBeLessThan(1e-9);
    expect(res.vonNeumannEntropy).toBeLessThan(1e-5);
    expect(res.normalizedEntropyScoreBps).toBe(0);
    expect(res.systemicCoherenceIndex).toBe(1);
    expect(res.entanglementPairs[0].entanglementSeverity).toBe("CRITICAL");
  });
});
