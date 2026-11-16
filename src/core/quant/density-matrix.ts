import type { DensityMatrixResult, EntanglementPair } from "./types";

/**
 * Computes all eigenvalues of a real symmetric matrix using the iterative Jacobi rotation algorithm.
 */
export function computeSymmetricEigenvalues(matrix: number[][], maxIterations = 200): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) return [matrix[0][0]];

  // Deep copy matrix
  const a: number[][] = matrix.map((row) => [...row]);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find largest off-diagonal element |a[p][q]|
    let maxOffDiag = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(a[i][j]);
        if (absVal > maxOffDiag) {
          maxOffDiag = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOffDiag < 1e-12) {
      break;
    }

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    // Rotate rows and columns p and q
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = c * aip - s * aiq;
        a[p][i] = a[i][p];
        a[i][q] = s * aip + c * aiq;
        a[q][i] = a[i][q];
      }
    }

    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = 0;
    a[q][p] = 0;
  }

  return a.map((row, idx) => row[idx]).sort((x, y) => y - x);
}

/**
 * Constructs the Quantum Portfolio Density Matrix rho = (1 / N) * C
 * from an N x N correlation matrix C, computes its spectrum {lambda_i},
 * Von Neumann Entropy S(rho) = -Tr(rho ln rho) = -sum_i lambda_i ln(lambda_i),
 * Normalized Diversification Entropy Score in basis points [0..10000],
 * and Systemic Coherence Index I_sys = 1 - S(rho)/ln(N).
 */
export function analyzePortfolioDensityMatrix(
  correlationMatrix: number[][],
  assetLabels?: string[],
): DensityMatrixResult {
  const n = correlationMatrix.length;
  if (n === 0) {
    return {
      dimension: 0,
      labels: [],
      densityMatrix: [],
      trace: 0,
      eigenvalues: [],
      vonNeumannEntropy: 0,
      maxTheoreticalEntropy: 0,
      normalizedEntropyScoreBps: 0,
      systemicCoherenceIndex: 1,
      entanglementPairs: [],
    };
  }

  const labels =
    assetLabels && assetLabels.length === n
      ? assetLabels
      : Array.from({ length: n }, (_, i) => `ASSET_${i + 1}`);

  // Symmetrize correlation matrix and enforce unit diagonal C_ii = 1
  const cleanCorr: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1.0;
      const vij = correlationMatrix[i]?.[j] ?? 0;
      const vji = correlationMatrix[j]?.[i] ?? vij;
      return Math.max(-1, Math.min(1, 0.5 * (vij + vji)));
    }),
  );

  // Density matrix rho = (1 / N) * C
  const densityMatrix: number[][] = cleanCorr.map((row) => row.map((v) => v / n));

  const rawEigenvalues = computeSymmetricEigenvalues(densityMatrix);
  // Clip small numerical negatives (< 0) from near-singular correlation matrices and renormalize trace to 1.0
  const clipped = rawEigenvalues.map((ev) => (ev > 1e-12 ? ev : 0));
  const sumEv = clipped.reduce((acc, v) => acc + v, 0);
  const eigenvalues = sumEv > 0 ? clipped.map((v) => v / sumEv) : clipped;

  const trace = eigenvalues.reduce((acc, v) => acc + v, 0);

  // Von Neumann Entropy: S(rho) = -sum_{i} lambda_i * ln(lambda_i)
  let vonNeumannEntropy = 0;
  for (const lambda of eigenvalues) {
    if (lambda > 1e-12) {
      vonNeumannEntropy -= lambda * Math.log(lambda);
    }
  }

  const maxTheoreticalEntropy = n > 1 ? Math.log(n) : 0;
  // Clamp S(rho) within [0, ln(N)]
  vonNeumannEntropy = Math.max(0, Math.min(maxTheoreticalEntropy || 0, vonNeumannEntropy));

  const normalizedRatio =
    maxTheoreticalEntropy > 0 ? vonNeumannEntropy / maxTheoreticalEntropy : 1;

  const normalizedEntropyScoreBps = Math.max(
    0,
    Math.min(10000, Math.round(normalizedRatio * 10000)),
  );

  const systemicCoherenceIndex = Number(Math.max(0, Math.min(1, 1 - normalizedRatio)).toFixed(6));

  // Extract off-diagonal entanglement pairs
  const entanglementPairs: EntanglementPair[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const corr = Number(cleanCorr[i][j].toFixed(4));
      const absCorr = Math.abs(corr);
      const entanglementSeverity: EntanglementPair["entanglementSeverity"] =
        absCorr >= 0.85
          ? "CRITICAL"
          : absCorr >= 0.65
            ? "HIGH"
            : absCorr >= 0.4
              ? "MODERATE"
              : "LOW";

      entanglementPairs.push({
        assetA: labels[i],
        assetB: labels[j],
        correlation: corr,
        entanglementSeverity,
      });
    }
  }

  entanglementPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    dimension: n,
    labels,
    densityMatrix,
    trace: Number(trace.toFixed(10)),
    eigenvalues: eigenvalues.map((v) => Number(v.toFixed(8))),
    vonNeumannEntropy: Number(vonNeumannEntropy.toFixed(6)),
    maxTheoreticalEntropy: Number(maxTheoreticalEntropy.toFixed(6)),
    normalizedEntropyScoreBps,
    systemicCoherenceIndex,
    entanglementPairs,
  };
}
