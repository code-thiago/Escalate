import { z } from "zod";

export const QuantumForecastInputSchema = z.object({
  portfolioNetCents: z.union([z.bigint(), z.number().int().nonnegative()]).transform((v) => BigInt(v)),
  horizonDays: z.number().int().min(5).max(252),
  decoherenceRate: z.number().min(0).max(1),
  confidenceLevelBps: z.union([z.literal(9500), z.literal(9900)]).default(9900),
  annualDriftBps: z.number().int().min(-5000).max(10000).default(1250),
  annualVolatilityBps: z.number().int().min(50).max(15000).default(1600),
  coinAngleRad: z.number().min(0.05).max(Math.PI / 2 - 0.05).optional(),
});

export type QuantumForecastInput = z.input<typeof QuantumForecastInputSchema>;

export interface QuantumWalkDistributionBin {
  latticePosition: number;
  returnBps: number;
  projectedBalanceCents: bigint;
  quantumProbability: number;
  classicalProbability: number;
  blendedProbability: number;
}

export interface QuantumWalkResult {
  horizonDays: number;
  decoherenceRate: number;
  totalProbabilitySum: number;
  distribution: QuantumWalkDistributionBin[];
  p10Cents: bigint;
  p50Cents: bigint;
  p90Cents: bigint;
  quantumVaR95Cents: bigint;
  quantumVaR99Cents: bigint;
  quantumTailRisk99Bps: number;
}

export interface EntanglementPair {
  assetA: string;
  assetB: string;
  correlation: number;
  entanglementSeverity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

export interface DensityMatrixResult {
  dimension: number;
  labels: string[];
  densityMatrix: number[][];
  trace: number;
  eigenvalues: number[];
  vonNeumannEntropy: number;
  maxTheoreticalEntropy: number;
  normalizedEntropyScoreBps: number;
  systemicCoherenceIndex: number;
  entanglementPairs: EntanglementPair[];
}
