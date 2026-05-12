import { LoanInterestType, LoanInterestBasis } from '../schema/mod.ts';

/**
 * Represents a single payment period in an amortization schedule.
 */
export interface AmortizationEntry {
  /** The period number (usually month) */
  period: number;
  /** Amount of the payment applied to the principal balance */
  principalPayment: number;
  /** Amount of the payment applied to interest */
  interestPayment: number;
  /** The balance remaining after this payment is applied */
  remainingBalance: number;
  /** The expected date for this payment in YYYY-MM-DD format */
  dueDate: string;
}

/**
 * Represents the complete results of an amortization calculation.
 */
export interface AmortizationSchedule {
  /** The periodic payment amount (may vary for some loan types) */
  monthlyPayment: number;
  /** The total interest paid over the life of the loan */
  totalInterest: number;
  /** The total amount paid (principal + interest) */
  totalPayment: number;
  /** The detailed period-by-period breakdown */
  entries: AmortizationEntry[];
}

/**
 * Generates an amortization schedule for a loan based on various interest calculation methods.
 * 
 * Supports:
 * - Standard Amortized: Traditional level-payment mortgage style.
 * - Interest-Only: Payments cover only interest until the final period.
 * - Add-on Interest: Interest is calculated upfront on the original principal.
 * - Fixed Principal: Principal is split equally; interest decreases over time.
 * 
 * @param params - Calculation parameters including principal, rate, and duration.
 * @returns A complete AmortizationSchedule object containing the monthly breakdown.
 */
export function generateAmortizationSchedule(params: {
  principal: number;
  /** Annual interest rate as a decimal (e.g., 0.05 for 5%) */
  annualInterestRate: number;
  /** Total number of months for the loan term */
  durationMonths: number;
  /** The start date of the loan in ISO format */
  startDate: string;
  /** The method used to calculate interest and payments */
  interestType: LoanInterestType;
  /** The day-count convention (reserved for future use) */
  interestBasis?: LoanInterestBasis;
}): AmortizationSchedule {
  const { interestType } = params;

  switch (interestType) {
    case 'Standard Amortized':
      return calculateStandardAmortized(params);
    case 'Interest-Only':
      return calculateInterestOnly(params);
    case 'Add-on Interest':
      return calculateAddOnInterest(params);
    case 'Fixed Principal':
      return calculateFixedPrincipal(params);
    default:
      throw new Error(`Unsupported interest type: ${interestType}`);
  }
}

/**
 * Calculates an amortization schedule using the Standard Amortized (level payment) method.
 * 
 * @param params - Calculation parameters including principal, rate, and duration.
 * @returns A complete AmortizationSchedule.
 */
function calculateStandardAmortized(params: any): AmortizationSchedule {
  const { principal, annualInterestRate, durationMonths, startDate } = params;
  const monthlyRate = annualInterestRate / 12;
  let entries: AmortizationEntry[] = [];
  let totalInterest = 0;
  let monthlyPayment = 0;

  // PSEUDOCODE: Standard Amortization (Level Payment)
  // 1. Calculate a fixed monthly payment using the annuity formula.
  // 2. For each period, calculate interest on current balance, then principal as remainder of payment.
  // 3. Update balance and record entry.

  if (monthlyRate === 0) {
    monthlyPayment = principal / durationMonths;
  } else {
    monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) / 
                     (Math.pow(1 + monthlyRate, durationMonths) - 1);
  }

  let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    totalInterest += interestPayment;

    entries.push({
      period: i,
      principalPayment,
      interestPayment,
      remainingBalance: Math.max(0, balance),
      dueDate: addMonths(startDate, i),
    });
  }

  return { monthlyPayment, totalInterest, totalPayment: principal + totalInterest, entries };
}

/**
 * Calculates an amortization schedule using the Interest-Only method.
 * 
 * @param params - Calculation parameters including principal, rate, and duration.
 * @returns A complete AmortizationSchedule.
 */
function calculateInterestOnly(params: any): AmortizationSchedule {
  const { principal, annualInterestRate, durationMonths, startDate } = params;
  const monthlyRate = annualInterestRate / 12;
  let entries: AmortizationEntry[] = [];
  let totalInterest = 0;
  const monthlyPayment = principal * monthlyRate;

  // PSEUDOCODE: Interest-Only Loan
  // 1. Monthly payment covers only interest: P * r.
  // 2. Final payment includes a balloon payment of the entire principal.

  let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    const interestPayment = monthlyPayment;
    const principalPayment = i === durationMonths ? principal : 0;
    if (i === durationMonths) balance = 0;
    totalInterest += interestPayment;

    entries.push({
      period: i,
      principalPayment,
      interestPayment,
      remainingBalance: balance,
      dueDate: addMonths(startDate, i),
    });
  }

  return { monthlyPayment, totalInterest, totalPayment: principal + totalInterest, entries };
}

/**
 * Calculates an amortization schedule using the Add-on Interest method.
 * 
 * @param params - Calculation parameters including principal, rate, and duration.
 * @returns A complete AmortizationSchedule.
 */
function calculateAddOnInterest(params: any): AmortizationSchedule {
  const { principal, annualInterestRate, durationMonths, startDate } = params;
  let entries: AmortizationEntry[] = [];
  let totalInterest = 0;

  // PSEUDOCODE: Add-on Interest
  // 1. Calculate total interest upfront for the full term.
  // 2. Repay principal and interest in equal installments over the duration.

  const totalInterestForPeriod = principal * annualInterestRate * (durationMonths / 12);
  const monthlyPayment = (principal + totalInterestForPeriod) / durationMonths;
  const monthlyPrincipal = principal / durationMonths;
  const monthlyInterest = totalInterestForPeriod / durationMonths;
  
  let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    balance -= monthlyPrincipal;
    totalInterest += monthlyInterest;
    entries.push({
      period: i,
      principalPayment: monthlyPrincipal,
      interestPayment: monthlyInterest,
      remainingBalance: Math.max(0, balance),
      dueDate: addMonths(startDate, i),
    });
  }

  return { monthlyPayment, totalInterest, totalPayment: principal + totalInterest, entries };
}

/**
 * Calculates an amortization schedule using the Fixed Principal (decreasing payment) method.
 * 
 * @param params - Calculation parameters including principal, rate, and duration.
 * @returns A complete AmortizationSchedule.
 */
function calculateFixedPrincipal(params: any): AmortizationSchedule {
  const { principal, annualInterestRate, durationMonths, startDate } = params;
  const monthlyRate = annualInterestRate / 12;
  let entries: AmortizationEntry[] = [];
  let totalInterest = 0;
  let monthlyPayment = 0;

  // PSEUDOCODE: Fixed Principal (Decreasing Payment)
  // 1. Constant principal repayment: P / n.
  // 2. Monthly interest calculated on declining balance.
  // 3. Total payment decreases over time.

  const principalPayment = principal / durationMonths;
  let balance = principal;
  for (let i = 1; i <= durationMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const currentMonthlyPayment = principalPayment + interestPayment;
    balance -= principalPayment;
    totalInterest += interestPayment;

    if (i === 1) monthlyPayment = currentMonthlyPayment;

    entries.push({
      period: i,
      principalPayment,
      interestPayment,
      remainingBalance: Math.max(0, balance),
      dueDate: addMonths(startDate, i),
    });
  }

  return { monthlyPayment, totalInterest, totalPayment: principal + totalInterest, entries };
}

/**
 * Offsets a date by a given number of months.
 * 
 * @param dateStr - Base date in YYYY-MM-DD or ISO format.
 * @param months - Number of months to add.
 * @returns Date string in YYYY-MM-DD format.
 */
function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0]!;
}


