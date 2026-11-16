/**
 * Taxation Engine for Brazilian Financial Markets
 * 
 * Implements regressive IR (Lei 11.033/2004), regressive IOF (Decreto 6.306/2007),
 * Bolsa capital gains (Lei 11.033/2004), Crypto progressive capital gains (Lei 13.259/2016),
 * equivalent yield conversions, and Fisher exact real return formula.
 *
 * All monetary amounts are handled strictly in integer cents (bigint).
 * All rates and shares are handled in integer basis points (number, 1 bps = 0.01% = 0.0001).
 */

export const IOF_TABLE_DAYS_1_TO_30: readonly number[] = [
  9600, 9300, 9000, 8600, 8300, 8000, 7600, 7300, 7000, 6600,
  6300, 6000, 5600, 5300, 5000, 4600, 4300, 4000, 3600, 3300,
  3000, 2600, 2300, 2000, 1600, 1300, 1000, 600, 300, 0,
] as const;

export const REGRESSIVE_IR_TABLE = [
  { maxDays: 180, rateBps: 2250 }, // 22.5%
  { maxDays: 360, rateBps: 2000 }, // 20.0%
  { maxDays: 720, rateBps: 1750 }, // 17.5%
  { maxDays: Number.POSITIVE_INFINITY, rateBps: 1500 }, // 15.0%
] as const;

export const BOLSA_SWING_EXEMPTION_THRESHOLD_CENTS = 2000000n; // R$ 20,000.00
export const CRYPTO_MONTHLY_EXEMPTION_THRESHOLD_CENTS = 3500000n; // R$ 35,000.00

export const CRYPTO_BRACKETS = [
  { maxCents: 500000000n, rateBps: 1500 },  // Up to R$ 5,000,000.00 -> 15%
  { maxCents: 1000000000n, rateBps: 1750 }, // R$ 5M to R$ 10M -> 17.5%
  { maxCents: 3000000000n, rateBps: 2000 }, // R$ 10M to R$ 30M -> 20.0%
  { maxCents: -1n, rateBps: 2250 },         // Above R$ 30M -> 22.5%
] as const;

/**
 * Standard half-up integer division for BigInt currency calculations.
 */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  if (numerator === 0n) return 0n;
  const isNegative = (numerator < 0n) !== (denominator < 0n);
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const quotient = (absNum + absDen / 2n) / absDen;
  return isNegative ? -quotient : quotient;
}

/**
 * Returns the regressive IR rate in basis points for a given holding period in calendar days.
 */
export function getRegressiveIRRateBps(days: number): number {
  if (days < 0) return 2250;
  for (const bracket of REGRESSIVE_IR_TABLE) {
    if (days <= bracket.maxDays) {
      return bracket.rateBps;
    }
  }
  return 1500;
}

/**
 * Returns the regressive IOF rate in basis points for a given day (1 to 30+).
 */
export function getIOFRateBps(days: number): number {
  if (days <= 0) return 9600;
  if (days >= 30) return 0;
  return IOF_TABLE_DAYS_1_TO_30[days - 1] ?? 0;
}

export interface FixedIncomeTaxResult {
  iofCents: bigint;
  irCents: bigint;
  netYieldCents: bigint;
  effectiveIrBps: number;
  effectiveIofBps: number;
  totalTaxCents: bigint;
}

/**
 * Calculates IOF and Regressive IR for Fixed Income instruments.
 * IOF is applied first against gross yield. IR is then applied to (grossYield - IOF).
 */
export function calculateFixedIncomeTax(
  grossYieldCents: bigint,
  days: number,
  isExempt = false
): FixedIncomeTaxResult {
  if (grossYieldCents <= 0n) {
    return {
      iofCents: 0n,
      irCents: 0n,
      netYieldCents: grossYieldCents,
      effectiveIrBps: 0,
      effectiveIofBps: 0,
      totalTaxCents: 0n,
    };
  }

  const iofBps = getIOFRateBps(days);
  const iofCents = isExempt && days >= 30
    ? 0n
    : roundDiv(grossYieldCents * BigInt(iofBps), 10000n);

  const taxableBase = grossYieldCents > iofCents ? grossYieldCents - iofCents : 0n;
  const irBps = isExempt ? 0 : getRegressiveIRRateBps(days);
  const irCents = isExempt || taxableBase <= 0n
    ? 0n
    : roundDiv(taxableBase * BigInt(irBps), 10000n);

  const totalTaxCents = iofCents + irCents;
  const netYieldCents = grossYieldCents - totalTaxCents;

  const effectiveIofBps = grossYieldCents > 0n
    ? Number(roundDiv(iofCents * 10000n, grossYieldCents))
    : 0;

  const effectiveIrBps = grossYieldCents > 0n
    ? Number(roundDiv(irCents * 10000n, grossYieldCents))
    : 0;

  return {
    iofCents,
    irCents,
    netYieldCents,
    effectiveIrBps,
    effectiveIofBps,
    totalTaxCents,
  };
}

export interface BolsaTaxResult {
  taxableGainCents: bigint;
  taxCents: bigint;
  rateBps: number;
  isExempt: boolean;
  dedoDuroCents: bigint;
  effectiveTaxBps: number;
}

/**
 * Calculates capital gains tax for B3 Stock Market operations.
 * Enforces R$ 20,000 monthly sales exemption for swing-trade (does NOT apply to day-trade).
 */
export function calculateBolsaTax(
  capitalGainCents: bigint,
  monthlySalesCents: bigint,
  isDayTrade: boolean,
  accumulatedLossCents = 0n
): BolsaTaxResult {
  const netGainAfterLoss = capitalGainCents > accumulatedLossCents
    ? capitalGainCents - accumulatedLossCents
    : 0n;

  if (netGainAfterLoss <= 0n) {
    return {
      taxableGainCents: 0n,
      taxCents: 0n,
      rateBps: isDayTrade ? 2000 : 1500,
      isExempt: false,
      dedoDuroCents: 0n,
      effectiveTaxBps: 0,
    };
  }

  if (isDayTrade) {
    const rateBps = 2000; // 20%
    const taxCents = roundDiv(netGainAfterLoss * BigInt(rateBps), 10000n);
    // Dedo-duro IRRF on day trade: 1.0% of day-trade gain
    const dedoDuroCents = roundDiv(netGainAfterLoss * 100n, 10000n);

    return {
      taxableGainCents: netGainAfterLoss,
      taxCents,
      rateBps,
      isExempt: false,
      dedoDuroCents,
      effectiveTaxBps: capitalGainCents > 0n
        ? Number(roundDiv(taxCents * 10000n, capitalGainCents))
        : 0,
    };
  }

  // Swing Trade
  const isExempt = monthlySalesCents <= BOLSA_SWING_EXEMPTION_THRESHOLD_CENTS;
  const rateBps = 1500; // 15%
  const taxCents = isExempt ? 0n : roundDiv(netGainAfterLoss * BigInt(rateBps), 10000n);
  // Dedo-duro IRRF on swing trade: 0.005% of sales
  const dedoDuroCents = roundDiv(monthlySalesCents * 5n, 100000n);

  return {
    taxableGainCents: isExempt ? 0n : netGainAfterLoss,
    taxCents,
    rateBps,
    isExempt,
    dedoDuroCents,
    effectiveTaxBps: (!isExempt && capitalGainCents > 0n)
      ? Number(roundDiv(taxCents * 10000n, capitalGainCents))
      : 0,
  };
}

export interface CryptoTaxResult {
  taxCents: bigint;
  effectiveRateBps: number;
  isExempt: boolean;
  taxableGainCents: bigint;
}

/**
 * Calculates capital gains tax for Cryptoassets according to Lei 13.259/2016.
 * Enforces R$ 35,000 monthly sales exemption.
 * Progressive brackets: 15% (up to 5M), 17.5% (5M-10M), 20% (10M-30M), 22.5% (>30M).
 */
export function calculateCryptoTax(
  capitalGainCents: bigint,
  monthlySalesCents: bigint
): CryptoTaxResult {
  if (capitalGainCents <= 0n) {
    return {
      taxCents: 0n,
      effectiveRateBps: 0,
      isExempt: false,
      taxableGainCents: 0n,
    };
  }

  if (monthlySalesCents <= CRYPTO_MONTHLY_EXEMPTION_THRESHOLD_CENTS) {
    return {
      taxCents: 0n,
      effectiveRateBps: 0,
      isExempt: true,
      taxableGainCents: 0n,
    };
  }

  let remainingGain = capitalGainCents;
  let totalTax = 0n;

  // Bracket 1: up to 5M
  const b1Cap = 500000000n;
  const b1Gain = remainingGain > b1Cap ? b1Cap : remainingGain;
  totalTax += roundDiv(b1Gain * 1500n, 10000n);
  remainingGain -= b1Gain;

  // Bracket 2: 5M to 10M (chunk of 5M)
  if (remainingGain > 0n) {
    const b2Cap = 500000000n;
    const b2Gain = remainingGain > b2Cap ? b2Cap : remainingGain;
    totalTax += roundDiv(b2Gain * 1750n, 10000n);
    remainingGain -= b2Gain;
  }

  // Bracket 3: 10M to 30M (chunk of 20M)
  if (remainingGain > 0n) {
    const b3Cap = 2000000000n;
    const b3Gain = remainingGain > b3Cap ? b3Cap : remainingGain;
    totalTax += roundDiv(b3Gain * 2000n, 10000n);
    remainingGain -= b3Gain;
  }

  // Bracket 4: above 30M
  if (remainingGain > 0n) {
    totalTax += roundDiv(remainingGain * 2250n, 10000n);
  }

  const effectiveRateBps = Number(roundDiv(totalTax * 10000n, capitalGainCents));

  return {
    taxCents: totalTax,
    effectiveRateBps,
    isExempt: false,
    taxableGainCents: capitalGainCents,
  };
}

/**
 * Calculates the equivalent tax-free rate (e.g. LCI/LCA equivalent to a taxable CDB).
 */
export function calculateEquivalentTaxFreeRateBps(taxableRateBps: number, days: number): number {
  const irBps = getRegressiveIRRateBps(days);
  return Math.round((taxableRateBps * (10000 - irBps)) / 10000);
}

/**
 * Calculates the equivalent taxable rate (e.g. CDB gross rate needed to match a tax-free LCI/LCA).
 */
export function calculateEquivalentTaxableRateBps(taxFreeRateBps: number, days: number): number {
  const irBps = getRegressiveIRRateBps(days);
  if (irBps >= 10000) return 0;
  return Math.round((taxFreeRateBps * 10000) / (10000 - irBps));
}

/**
 * Calculates exact real return in basis points using Fisher's exact formula:
 * (1 + r_real) = (1 + r_nominal) / (1 + i_inflation)
 *
 * r_real_bps = round(((10000 + nominalBps) * 10000) / (10000 + inflationBps) - 10000)
 */
export function calculateFisherRealReturnBps(nominalReturnBps: number, inflationBps: number): number {
  const denominator = 10000 + inflationBps;
  if (denominator <= 0) return 0;
  const numerator = (10000 + nominalReturnBps) * 10000;
  return Math.round(numerator / denominator) - 10000;
}

export interface ComeCotasSimulationResult {
  cumulativeTaxCents: bigint;
  netValueAfterComeCotasCents: bigint;
  lossFromCompoundingCents: bigint; // Drag caused by losing compounding on prepaid tax
  semestersCount: number;
}

/**
 * Simulates the impact of semiannual come-cotas in open-ended investment funds.
 * Long term funds: 15% (1500 bps). Short term funds: 20% (2000 bps).
 */
export function calculateComeCotasImpact(
  investedCents: bigint,
  annualNominalRateBps: number,
  days: number,
  fundType: "CURTO_PRAZO" | "LONGO_PRAZO" = "LONGO_PRAZO"
): ComeCotasSimulationResult {
  const taxRateBps = fundType === "CURTO_PRAZO" ? 2000 : 1500;
  const semestersCount = Math.floor(days / 182.5);

  if (semestersCount <= 0 || investedCents <= 0n) {
    return {
      cumulativeTaxCents: 0n,
      netValueAfterComeCotasCents: investedCents,
      lossFromCompoundingCents: 0n,
      semestersCount: 0,
    };
  }

  // Semiannual nominal rate: (1 + r_a)^(0.5) - 1
  const annualFactor = 1 + annualNominalRateBps / 10000;
  const semesterFactor = Math.sqrt(annualFactor);
  const semesterRateBps = Math.round((semesterFactor - 1) * 10000);

  // Path A: With semiannual come-cotas deduction
  let currentBalance = investedCents;
  let cumulativeTaxCents = 0n;

  for (let s = 0; s < semestersCount; s++) {
    const grossSemesterYield = roundDiv(currentBalance * BigInt(semesterRateBps), 10000n);
    const taxThisSemester = roundDiv(grossSemesterYield * BigInt(taxRateBps), 10000n);
    cumulativeTaxCents += taxThisSemester;
    currentBalance = currentBalance + grossSemesterYield - taxThisSemester;
  }

  // Path B: Without come-cotas (tax deferred until redemption)
  let balanceWithoutComeCotas = investedCents;
  for (let s = 0; s < semestersCount; s++) {
    const grossSemesterYield = roundDiv(balanceWithoutComeCotas * BigInt(semesterRateBps), 10000n);
    balanceWithoutComeCotas += grossSemesterYield;
  }
  const deferredTax = roundDiv((balanceWithoutComeCotas - investedCents) * BigInt(taxRateBps), 10000n);
  const netWithoutComeCotas = balanceWithoutComeCotas - deferredTax;

  const lossFromCompoundingCents = netWithoutComeCotas > currentBalance
    ? netWithoutComeCotas - currentBalance
    : 0n;

  return {
    cumulativeTaxCents,
    netValueAfterComeCotasCents: currentBalance,
    lossFromCompoundingCents,
    semestersCount,
  };
}
