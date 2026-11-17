// apps/api/src/modules/quant/trading-stochastic-engine.ts
import Decimal from 'decimal.js';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_EVEN });

export function calculateGarch11ConditionalVolatility(params: {
  omega: number;
  alpha: number;
  beta: number;
  previousReturnShock: number;
  previousVolatility: number;
}): {
  conditionalVariance: number;
  conditionalVolatility: number;
  isStationary: boolean;
} {
  const omegaDec = new Decimal(params.omega);
  const alphaDec = new Decimal(params.alpha);
  const betaDec = new Decimal(params.beta);
  const shockDec = new Decimal(params.previousReturnShock);
  const prevVolDec = new Decimal(params.previousVolatility);

  if (
    omegaDec.lte(0) ||
    alphaDec.isNegative() ||
    betaDec.isNegative() ||
    prevVolDec.isNegative() ||
    alphaDec.plus(betaDec).gte(1)
  ) {
    throw new Error('GARCH_NON_STATIONARY_PARAMS');
  }

  const conditionalVarianceDec = omegaDec
    .plus(alphaDec.mul(shockDec.pow(2)))
    .plus(betaDec.mul(prevVolDec.pow(2)));

  const conditionalVolatilityDec = conditionalVarianceDec.sqrt();

  return {
    conditionalVariance: Number(conditionalVarianceDec.toFixed(8)),
    conditionalVolatility: Number(conditionalVolatilityDec.toFixed(6)),
    isStationary: true,
  };
}

export function runKalmanFilterPriceSeries(params: {
  noisyPrices: number[];
  processNoiseQ: number;
  measurementNoiseR: number;
  initialEstimate?: number;
  initialErrorCov?: number;
}): {
  filteredPrices: number[];
  finalKalmanGain: number;
  latestSpreadZScore: number;
} {
  if (
    !Array.isArray(params.noisyPrices) ||
    params.noisyPrices.length < 2 ||
    params.processNoiseQ <= 0 ||
    params.measurementNoiseR <= 0
  ) {
    throw new Error('KALMAN_INVALID_PARAMS');
  }

  const qDec = new Decimal(params.processNoiseQ);
  const rDec = new Decimal(params.measurementNoiseR);

  let xHat = new Decimal(params.initialEstimate ?? params.noisyPrices[0]);
  let errorCov = new Decimal(params.initialErrorCov ?? 1);
  let kalmanGain = new Decimal(0);

  const filteredPrices: number[] = [];

  for (let k = 0; k < params.noisyPrices.length; k++) {
    const xPred = xHat;
    const pPred = errorCov.plus(qDec);

    kalmanGain = pPred.div(pPred.plus(rDec));
    const zK = new Decimal(params.noisyPrices[k]);
    xHat = xPred.plus(kalmanGain.mul(zK.minus(xPred)));
    errorCov = new Decimal(1).minus(kalmanGain).mul(pPred);

    filteredPrices.push(Number(xHat.toFixed(6)));
  }

  const lastRawPrice = new Decimal(params.noisyPrices[params.noisyPrices.length - 1]);
  const spreadNormDenom = errorCov.plus(rDec).sqrt();
  const latestSpreadZScoreDec = spreadNormDenom.isZero()
    ? new Decimal(0)
    : lastRawPrice.minus(xHat).div(spreadNormDenom);

  return {
    filteredPrices,
    finalKalmanGain: Number(kalmanGain.toFixed(6)),
    latestSpreadZScore: Number(latestSpreadZScoreDec.toFixed(6)),
  };
}
