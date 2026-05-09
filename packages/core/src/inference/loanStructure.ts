import { LoanInterestType } from '../schema/index.ts';

export interface LoanInferenceInput {
  principal: number | null;
  monthly_payment: number | null;
  interest_rate_annual: number | null;
  term_months: number | null;
  payment_pattern?: 'fixed' | 'decreasing' | 'unknown';
  rate_type_hint?: 'flat' | 'effective' | 'unknown';
  balloon_payment?: boolean | null;
  lender_type?: 'bank' | 'dealer' | 'informal' | 'unknown';
  country?: 'US' | 'PH' | 'SG' | string | null;
}

export interface LoanInferenceAlternative {
  interest_type: LoanInterestType;
  confidence: number;
}

export interface LoanInferenceResult {
  interest_type: LoanInterestType;
  confidence: number;
  reason: string;
  alternatives: LoanInferenceAlternative[];
}

const DEFAULT_RESULT: LoanInferenceResult = {
  interest_type: 'Standard Amortized',
  confidence: 0.5,
  reason: 'Insufficient data — assuming standard loan. Results may differ.',
  alternatives: [],
};

function computeBenchmarks(
  principal: number,
  rateAnnualPct: number,
  termMonths: number,
): { amortized: number; addOn: number; interestOnly: number } {
  const r = rateAnnualPct / 100 / 12;
  const amortized =
    r === 0
      ? principal / termMonths
      : (principal * r * Math.pow(1 + r, termMonths)) /
        (Math.pow(1 + r, termMonths) - 1);
  const addOn =
    (principal * (1 + (rateAnnualPct / 100) * (termMonths / 12))) / termMonths;
  const interestOnly = principal * r;
  return { amortized, addOn, interestOnly };
}

function relDiff(a: number, b: number): number {
  if (b === 0) return Infinity;
  return Math.abs(a - b) / b;
}

function applyContextualBoost(
  confidence: number,
  type: LoanInterestType,
  input: LoanInferenceInput,
): number {
  let boost = 0;
  const country = input.country?.toUpperCase();
  const lender = input.lender_type;

  if (type === 'Add-on Interest') {
    if (country === 'PH') boost += 0.05;
    if (lender === 'dealer') boost += 0.03;
  }
  if (type === 'Standard Amortized') {
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

export function inferLoanStructure(input: LoanInferenceInput): LoanInferenceResult {
  // Hard rules — bypass numerical matching
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

  if (diffAmortized < 0.05) {
    candidates.push({ type: 'Standard Amortized', diff: diffAmortized, baseConf: 0.85 });
  }
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
    reason: EXPLANATIONS[winner.type],
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
    // derivative of pv w.r.t. r
    const fprime = (M / (r * r)) * (termMonths * r / (pow * (1 + r)) - 1 + u);
    if (Math.abs(fprime) < 1e-14) break;
    const dr = f / fprime;
    r -= dr;
    if (r <= 0) r = 0.0001;
    if (r > 1) r = 1;
    if (Math.abs(dr) < 1e-12) break;
  }

  return r * 12 * 100;
}
