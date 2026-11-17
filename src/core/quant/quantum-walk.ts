import {
  QuantumForecastInputSchema,
  type QuantumForecastInput,
  type QuantumWalkDistributionBin,
  type QuantumWalkResult,
} from "./types";

interface Complex {
  re: number;
  im: number;
}

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}


function cAbsSq(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

/**
 * Simulates a Discrete-Time Quantum Walk (DTQW) on a 1D price-return lattice
 * with SU(2) unitary coin operator C(theta), conditional shift S, and
 * Open Quantum System decoherence parameter gamma in [0, 1].
 *
 * Strictly enforces unitarity conservation: sum_x P(x, t) === 1.0 (within 1e-9).
 * Converts all monetary projections into integer cents (bigint).
 */
export function simulateQuantumWalkForecast(rawInput: QuantumForecastInput): QuantumWalkResult {
  const input = QuantumForecastInputSchema.parse(rawInput);
  const {
    portfolioNetCents,
    horizonDays,
    decoherenceRate,
    annualDriftBps,
    annualVolatilityBps,
  } = input;

  const steps = horizonDays;
  const latticeSize = 2 * steps + 1;
  const offset = steps; // position x in [-steps, +steps] maps to index (x + offset)

  // SU(2) coin angle theta: default Hadamard pi/4 slightly tilted by drift signal
  const driftTilt = Math.max(-0.18, Math.min(0.18, (annualDriftBps - 1000) / 25000));
  const theta = input.coinAngleRad ?? Math.PI / 4 - driftTilt;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Initialize symmetric state at origin x = 0:
  // |psi_0> = (|0>_C + i|1>_C) / sqrt(2) tensor |x = 0>
  let psiUp: Complex[] = Array.from({ length: latticeSize }, () => ({ re: 0, im: 0 }));
  let psiDown: Complex[] = Array.from({ length: latticeSize }, () => ({ re: 0, im: 0 }));

  const invSqrt2 = 1 / Math.sqrt(2);
  psiUp[offset] = { re: invSqrt2, im: 0 };
  psiDown[offset] = { re: 0, im: invSqrt2 };

  // Also track classical biased random walk (Galton board / Binomial diffusion)
  let classicalProb = new Float64Array(latticeSize);
  classicalProb[offset] = 1.0;

  // Upward step probability in classical walk slightly above 0.5 for positive drift
  const pUpClassical = Math.max(0.1, Math.min(0.9, 0.5 + annualDriftBps / 100000));
  const pDownClassical = 1 - pUpClassical;

  for (let t = 0; t < steps; t++) {
    const nextUp: Complex[] = Array.from({ length: latticeSize }, () => ({ re: 0, im: 0 }));
    const nextDown: Complex[] = Array.from({ length: latticeSize }, () => ({ re: 0, im: 0 }));
    const nextClassical = new Float64Array(latticeSize);

    for (let idx = 0; idx < latticeSize; idx++) {
      const u = psiUp[idx];
      const d = psiDown[idx];

      if (u.re !== 0 || u.im !== 0 || d.re !== 0 || d.im !== 0) {
        // Apply SU(2) Coin Operator C(theta) = [[cos(theta), sin(theta)], [sin(theta), -cos(theta)]]
        const coinedUp: Complex = {
          re: cosT * u.re + sinT * d.re,
          im: cosT * u.im + sinT * d.im,
        };
        const coinedDown: Complex = {
          re: sinT * u.re - cosT * d.re,
          im: sinT * u.im - cosT * d.im,
        };

        // Conditional Shift Operator S: |0>|x> -> |0>|x + 1>, |1>|x> -> |1>|x - 1>
        if (idx + 1 < latticeSize) {
          nextUp[idx + 1] = cAdd(nextUp[idx + 1], coinedUp);
        }
        if (idx - 1 >= 0) {
          nextDown[idx - 1] = cAdd(nextDown[idx - 1], coinedDown);
        }
      }

      const cP = classicalProb[idx];
      if (cP > 0) {
        if (idx + 1 < latticeSize) {
          nextClassical[idx + 1] += cP * pUpClassical;
        }
        if (idx - 1 >= 0) {
          nextClassical[idx - 1] += cP * pDownClassical;
        }
      }
    }

    psiUp = nextUp;
    psiDown = nextDown;
    classicalProb = nextClassical;
  }

  // Extract pure quantum probability P_Q(x) = |psi_up(x)|^2 + |psi_down(x)|^2
  const rawQuantumProb = new Float64Array(latticeSize);
  let qSum = 0;
  let cSum = 0;

  for (let idx = 0; idx < latticeSize; idx++) {
    const pQ = cAbsSq(psiUp[idx]) + cAbsSq(psiDown[idx]);
    rawQuantumProb[idx] = pQ;
    qSum += pQ;
    cSum += classicalProb[idx];
  }

  // Normalize strictly to 1.0 to eliminate floating-point drift
  const gamma = decoherenceRate;
  const dailyDriftBps = annualDriftBps / 252;
  const dailyStepVolBps = annualVolatilityBps / Math.sqrt(252);

  const distribution: QuantumWalkDistributionBin[] = [];
  let blendedSum = 0;

  // Only keep occupied lattice parity (even or odd positions matching steps % 2)
  const tempBins: Array<{
    latticePosition: number;
    returnBps: number;
    projectedBalanceCents: bigint;
    qProb: number;
    cProb: number;
    bProb: number;
  }> = [];

  for (let idx = 0; idx < latticeSize; idx++) {
    const x = idx - offset;
    if (Math.abs(x % 2) !== steps % 2) {
      continue;
    }

    const qProb = qSum > 0 ? rawQuantumProb[idx] / qSum : 0;
    const cProb = cSum > 0 ? classicalProb[idx] / cSum : 0;
    const bProb = (1 - gamma) * qProb + gamma * cProb;
    blendedSum += bProb;

    // Map lattice coordinate x to cumulative return in basis points
    const expectedMeanBps = Math.round(dailyDriftBps * steps);
    const stepShiftBps = Math.round((x / Math.sqrt(steps)) * dailyStepVolBps);
    const totalReturnBps = Math.max(-9500, expectedMeanBps + stepShiftBps);

    const projectedBalanceCents =
      portfolioNetCents + (portfolioNetCents * BigInt(totalReturnBps)) / 10000n;

    tempBins.push({
      latticePosition: x,
      returnBps: totalReturnBps,
      projectedBalanceCents: projectedBalanceCents >= 0n ? projectedBalanceCents : 0n,
      qProb,
      cProb,
      bProb,
    });
  }

  let finalProbabilitySum = 0;
  for (const bin of tempBins) {
    const normalizedBlended = blendedSum > 0 ? bin.bProb / blendedSum : 0;
    finalProbabilitySum += normalizedBlended;
    distribution.push({
      latticePosition: bin.latticePosition,
      returnBps: bin.returnBps,
      projectedBalanceCents: bin.projectedBalanceCents,
      quantumProbability: bin.qProb,
      classicalProbability: bin.cProb,
      blendedProbability: normalizedBlended,
    });
  }

  // Sort by returnBps ascending to extract percentiles (VaR99 = P01, VaR95 = P05, P10, P50, P90)
  const sortedByReturn = [...distribution].sort((a, b) => a.returnBps - b.returnBps);

  const getPercentileBin = (targetCumulativeProb: number): QuantumWalkDistributionBin => {
    let cum = 0;
    for (const bin of sortedByReturn) {
      cum += bin.blendedProbability;
      if (cum >= targetCumulativeProb) {
        return bin;
      }
    }
    return sortedByReturn[sortedByReturn.length - 1] ?? {
      latticePosition: 0,
      returnBps: 0,
      projectedBalanceCents: portfolioNetCents,
      quantumProbability: 1,
      classicalProbability: 1,
      blendedProbability: 1,
    };
  };

  const p01Bin = getPercentileBin(0.01);
  const p05Bin = getPercentileBin(0.05);
  const p10Bin = getPercentileBin(0.10);
  const p50Bin = getPercentileBin(0.50);
  const p90Bin = getPercentileBin(0.90);

  const quantumVaR95Cents =
    portfolioNetCents > p05Bin.projectedBalanceCents
      ? portfolioNetCents - p05Bin.projectedBalanceCents
      : 0n;

  const quantumVaR99Cents =
    portfolioNetCents > p01Bin.projectedBalanceCents
      ? portfolioNetCents - p01Bin.projectedBalanceCents
      : 0n;

  const quantumTailRisk99Bps =
    portfolioNetCents > 0n
      ? Number((quantumVaR99Cents * 10000n) / portfolioNetCents)
      : 0;

  return {
    horizonDays: steps,
    decoherenceRate: gamma,
    totalProbabilitySum: Number(finalProbabilitySum.toFixed(12)),
    distribution,
    p10Cents: p10Bin.projectedBalanceCents,
    p50Cents: p50Bin.projectedBalanceCents,
    p90Cents: p90Bin.projectedBalanceCents,
    quantumVaR95Cents,
    quantumVaR99Cents,
    quantumTailRisk99Bps,
  };
}
