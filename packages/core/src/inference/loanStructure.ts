import { LoanInterestType } from '../schema/mod.ts';

/**
 * Raw data inputs required for loan structure inference.
 * Fields are optional to allow for partial data processing during user input.
 */
export interface LoanInferenceInput {
  /** The total amount borrowed. */
  principal: number | null;
  /** The recurring monthly payment amount. */
  monthly_payment: number | null;
  /** The quoted annual interest rate (as a percentage, e.g., 5.5). */
  interest_rate_annual: number | null;
  /** Total length of the loan in months. */
  term_months: number | null;
  /** Observed behavior of payments over time. */
  payment_pattern?: 'fixed' | 'decreasing' | 'unknown';
  /** Explicit hint about how interest was quoted. */
  rate_type_hint?: 'flat' | 'effective' | 'unknown';
  /** Whether a large final payment is required. */
  balloon_payment?: boolean | null;
  /** The category of the entity providing the loan. */
  lender_type?: 'bank' | 'dealer' | 'informal' | 'unknown';
  /** ISO 3166-1 alpha-2 country code. */
  country?: 'US' | 'PH' | 'SG' | null;
}

/**
 * A secondary possibility for the loan structure if the primary match is not certain.
 */
export interface LoanInferenceAlternative {
  /** The alternative interest calculation type. */
  interest_type: LoanInterestType;
  /** Probability score (0 to 1). */
  confidence: number;
}

/**
 * The final output of the inference engine.
 */
export interface LoanInferenceResult {
  /** The most likely interest calculation type. */
  interest_type: LoanInterestType;
  /** Probability score for the primary match (0 to 1). */
  confidence: number;
  /** Human-readable justification for the inference. */
  reason: string;
  /** List of other possible structures. */
  alternatives: LoanInferenceAlternative[];
}

const DEFAULT_RESULT: LoanInferenceResult = {
  interest_type: 'Standard Amortized',
  confidence: 0.5,
  reason: 'Insufficient data — assuming standard loan. Results may differ.',
  alternatives: [],
};

/**
 * Calculates theoretical monthly payments for various loan types to serve as benchmarks.
 * 
 * @param principal - Loan principal.
 * @param rateAnnualPct - Annual interest rate (%).
 * @param termMonths - Term in months.
 * @returns Object containing calculated payments for different structures.
 */
function computeBenchmarks(
  principal: number,
  rateAnnualPct: number,
  termMonths: number,
): { amortized: number; addOn: number; interestOnly: number } {
  const r = rateAnnualPct / 100 / 12;
  // Standard Amortization (Reducing Balance) formula
  const amortized =
    r === 0
      ? principal / termMonths
      : (principal * r * Math.pow(1 + r, termMonths)) /
        (Math.pow(1 + r, termMonths) - 1);
  // Add-on (Flat) Interest formula: (P + (P * r * t)) / n
  const addOn =
    (principal * (1 + (rateAnnualPct / 100) * (termMonths / 12))) / termMonths;
  // Interest-Only: monthly interest without principal reduction
  const interestOnly = principal * r;
  return { amortized, addOn, interestOnly };
}

/**
 * Calculates the relative difference between two numbers.
 */
function relDiff(a: number, b: number): number {
  if (b === 0) return Infinity;
  return Math.abs(a - b) / b;
}

/**
 * Adjusts confidence scores based on regional and lender context.
 * Certain loan types are more prevalent in specific markets or lender categories.
 */
function applyContextualBoost(
  confidence: number,
  type: LoanInterestType,
  input: LoanInferenceInput,
): number {
  let boost = 0;
  const country = input.country?.toUpperCase();
  const lender = input.lender_type;

  if (type === 'Add-on Interest') {
    // Add-on rates are very common in Philippines auto and personal loans.
    if (country === 'PH') boost += 0.05;
    if (lender === 'dealer') boost += 0.03;
  }
  if (type === 'Standard Amortized') {
    // Standard in US banking for most consumer credit.
    if (country === 'US') boost += 0.05;
    if (lender === 'bank') boost += 0.03;
  }

  return Math.min(0.98, confidence + boost);
}

const EXPLANATIONS: Record<LoanInterestType, string> = {
  'Standard Amortized':
    'Your payment closely matches a standard loan where interest is applied to the remaining balance.',
  'Add-on Interest':
    'Your payment is higher than expected for a standard loan. This suggests interest was calculated upfront on the full principal (flat/add-on rate).',
  'Interest-Only':
    'Your payment appears to cover only interest, with the full principal due at the end of the term.',
  'Fixed Principal':
    'Your payments follow a decreasing pattern with a fixed amount of principal paid each period.',
};

/**
 * Predicts the underlying mathematical structure of a loan based on payment patterns and metadata.
 * 
 * PSEUDOCODE:
 * 1. Check "Hard Rules" (explicit hints):
 *    a. If balloon payment exists -> Interest-Only.
 *    b. If payment pattern is decreasing -> Fixed Principal.
 *    c. If rate hint is 'flat' -> Add-on Interest.
 * 2. Validate numerical data: If principal, payment, rate, or term are missing/invalid -> Return default.
 * 3. Generate Benchmarks: Calculate what the payment *should* be for Amortized, Add-on, and Interest-Only.
 * 4. Compare: Calculate relative difference between user's actual payment and each benchmark.
 * 5. Score Candidates:
 *    a. If diff < 5% for Amortized/Interest-Only, add as candidate.
 *    b. If diff < 8% for Add-on (and payment > amortized), add as candidate.
 * 6. Select Winner:
 *    a. If candidates exist, pick the one with the smallest difference.
 *    b. If no candidates match closely, pick the closest overall but with lower confidence.
 * 7. Apply Contextual Boosts: Adjust confidence based on country/lender.
 * 8. Format and return result with alternatives.
 * 
 * @param input - Partial or full loan data.
 * @returns Inference result with type and confidence.
 */
export function inferLoanStructure(input: LoanInferenceInput): LoanInferenceResult {
  // Hard rules — bypass numerical matching if qualitative data is definitive.
  if (input.balloon_payment === true) {
    return {
      interest_type: 'Interest-Only',
      confidence: 0.95,
      reason:
        'A balloon payment indicates principal is due at term end — this is an interest-only structure.',
      alternatives: [],
    };
  }

  if (input.payment_pattern === 'decreasing') {
    return {
      interest_type: 'Fixed Principal',
      confidence: 0.90,
      reason: 'Decreasing payments indicate a fixed-principal structure where interest declines each period.',
      alternatives: [],
    };
  }

  if (input.rate_type_hint === 'flat') {
    return {
      interest_type: 'Add-on Interest',
      confidence: applyContextualBoost(0.95, 'Add-on Interest', input),
      reason: 'Rate was described as flat or add-on — interest is calculated upfront on the full principal.',
      alternatives: [],
    };
  }

  const { principal, monthly_payment, interest_rate_annual, term_months } = input;
  const hasAllValues =
    principal != null && principal > 0 &&
    monthly_payment != null && monthly_payment > 0 &&
    interest_rate_annual != null && interest_rate_annual > 0 &&
    term_months != null && term_months > 0;

  if (!hasAllValues) {
    return DEFAULT_RESULT;
  }

  const { amortized, addOn, interestOnly } = computeBenchmarks(
    principal,
    interest_rate_annual,
    term_months,
  );
  const userPayment = monthly_payment;

  const diffAmortized = relDiff(userPayment, amortized);
  const diffAddOn = relDiff(userPayment, addOn);
  const diffInterestOnly = relDiff(userPayment, interestOnly);

  type Candidate = { type: LoanInterestType; diff: number; baseConf: number };
  const candidates: Candidate[] = [];

  // Logic: 5% tolerance is usually enough for floating point or rounding differences.
  if (diffAmortized < 0.05) {
    candidates.push({ type: 'Standard Amortized', diff: diffAmortized, baseConf: 0.85 });
  }
  // Add-on interest payments are always higher than amortized for the same rate.
  if (diffAddOn < 0.08 && userPayment > amortized * 1.10) {
    candidates.push({ type: 'Add-on Interest', diff: diffAddOn, baseConf: 0.80 });
  }
  if (diffInterestOnly < 0.05) {
    candidates.push({ type: 'Interest-Only', diff: diffInterestOnly, baseConf: 0.85 });
  }

  if (candidates.length === 0) {
    const all: Candidate[] = [
      { type: 'Standard Amortized', diff: diffAmortized, baseConf: 0.85 },
      { type: 'Add-on Interest', diff: diffAddOn, baseConf: 0.80 },
      { type: 'Interest-Only', diff: diffInterestOnly, baseConf: 0.85 },
    ];
    const closest = all.reduce((a, b) => (a.diff < b.diff ? a : b));
    const conf = Math.max(0.1, 0.6 - closest.diff);
    return {
      interest_type: closest.type,
      confidence: applyContextualBoost(conf, closest.type, input),
      reason: `Payment doesn't match a standard pattern. Closest match is ${closest.type} — please verify in Advanced Settings.`,
      alternatives: all
        .filter(c => c.type !== closest.type)
        .map(c => ({
          interest_type: c.type,
          confidence: Math.max(0.1, 0.6 - c.diff),
        })),
    };
  }

  candidates.sort((a, b) => a.diff - b.diff);
  const winner = candidates[0]!;
  const boostedConf = applyContextualBoost(winner.baseConf, winner.type, input);

  return {
    interest_type: winner.type,
    confidence: boostedConf,
    reason: EXPLANATIONS[winner.type] || 'Inferred based on payment patterns.',
    alternatives: candidates
      .slice(1)
      .map(c => ({
        interest_type: c.type,
        confidence: applyContextualBoost(c.baseConf, c.type, input),
      })),
  };
}

/**
 * Newton-Raphson IRR solve to find the effective annual rate of a flat-rate (add-on) loan.
 * flatRateAnnualPct: e.g. 12 for 12%. Returns EIR as a percentage, e.g. 21.5.
 * 
 * PSEUDOCODE:
 * 1. Calculate the actual monthly payment (M) for a principal of 1 using the flat rate.
 * 2. Set an initial guess for the effective monthly rate (r) equal to flat rate / 12.
 * 3. Loop up to 50 iterations:
 *    a. Calculate the Present Value (PV) of the annuity given M and current r.
 *    b. Calculate the difference (f) between PV and the target principal (1).
 *    c. If f is negligible, break.
 *    d. Calculate the derivative (fprime) of the PV function.
 *    e. Adjust r by f / fprime.
 *    f. Constrain r to realistic bounds (0.0001 to 1).
 * 4. Return the converged r multiplied by 12 and 100 to get the annual percentage.
 * 
 * @param flatRateAnnualPct - The quoted 'flat' rate.
 * @param termMonths - Total payments.
 * @returns The Effective Interest Rate (EIR) as a percentage.
 */
export function computeAddOnEIR(flatRateAnnualPct: number, termMonths: number): number {
  if (flatRateAnnualPct <= 0) return 0;
  const flatRate = flatRateAnnualPct / 100;
  // Monthly payment normalized to principal = 1
  const M = (1 + flatRate * (termMonths / 12)) / termMonths;
  let r = flatRate / 12;

  for (let i = 0; i < 50; i++) {
    const pow = Math.pow(1 + r, termMonths);
    const u = 1 / pow;
    const pv = M * (1 - u) / r;
    const f = pv - 1;
    if (Math.abs(f) < 1e-12) break;
    // derivative of pv w.r.t. r (standard annuity derivative)
    const fprime = (M / (r * r)) * (termMonths * r / (pow * (1 + r)) - 1 + u);
    if (Math.abs(fprime) < 1e-14) break;
    const dr = f / fprime;
    r -= dr;
    // Security check: prevent convergence to negative rates or extreme values.
    if (r <= 0) r = 0.0001;
    if (r > 1) r = 1;
    if (Math.abs(dr) < 1e-12) break;
  }

  return r * 12 * 100;
}
