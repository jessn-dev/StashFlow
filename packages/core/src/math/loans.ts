import { LoanInterestType, LoanInterestBasis } from '../schema/mod.ts';
import { convertToBase } from './currency.ts';

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
 * Data point for a debt payoff chart.
 */
export interface DebtPayoffPoint {
  /** Label for the point, usually month (e.g. 'Jan 26') */
  month: string;
  /** Total remaining debt across all loans at this point, in base currency */
  total: number;
}

/**
 * Projects the decline of total debt across multiple loans over time.
 * 
 * @param loans - List of active loans.
 * @param rates - Exchange rates for currency conversion to base.
 * @returns Array of data points for chart visualization.
 */
export function projectDebtPayoff(loans: any[], rates: Record<string, number>): DebtPayoffPoint[] {
  const active = loans.filter((l) => l.status === 'active');
  if (active.length === 0) return [];

  const now = new Date();

  // Compute schedules and current month offset per loan
  const schedules = active.map((loan) => {
    const start = new Date(loan.start_date);
    const elapsed = Math.max(
      0,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
    );
    const schedule = generateAmortizationSchedule({
      principal: loan.principal,
      annualInterestRate: loan.interest_rate / 100,
      durationMonths: loan.duration_months,
      startDate: loan.start_date,
      interestType: (loan.interest_type ?? 'Standard Amortized') as any,
    });
    
    // Fallback rate to 1 if not found
    const currency = loan.currency || 'USD';
    const rate = rates[currency] ?? 1;
    
    return { schedule, elapsed, rate };
  });

  const maxRemaining = Math.max(
    ...schedules.map((s) => Math.max(0, s.schedule.entries.length - s.elapsed)),
  );
  
  // Cap projection at 10 years (120 months)
  const months = Math.min(maxRemaining + 1, 121);

  return Array.from({ length: months }, (_, k) => {
    const date = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    const total = schedules.reduce((sum, { schedule, elapsed, rate }) => {
      const idx = elapsed + k - 1;
      
      let remaining = 0;
      if (k === 0) {
         // Current month balance
         remaining = schedule.entries[elapsed - 1]?.remainingBalance ?? schedule.entries[0]?.remainingBalance ?? (schedule.monthlyPayment * schedule.entries.length);
      } else {
         remaining = schedule.entries[idx]?.remainingBalance ?? 0;
      }
      
      // Convert to base currency
      const converted = convertToBase(remaining, rate);
      
      return sum + converted;
    }, 0);
    
    return { month, total: Math.round(total * 100) / 100 };
  });
}

/**
 * Computes SVG points for a loan's principal decline sparkline.
 * 
 * @param loan - The loan data.
 * @param width - SVG viewbox width (default 120).
 * @param height - SVG viewbox height (default 36).
 * @returns Space-separated SVG points string.
 */
export function computeLoanSparkline(loan: any, width: number = 120, height: number = 36): string {
  try {
    const schedule = generateAmortizationSchedule({
      principal: loan.principal,
      annualInterestRate: loan.interest_rate / 100, // Fixed: handle percentage properly
      durationMonths: loan.duration_months,
      startDate: loan.start_date,
      interestType: (loan.interest_type ?? 'Standard Amortized') as any,
    });

    const entries = schedule.entries;
    // Sample max 60 points for performance/clarity
    const step = Math.max(1, Math.floor(entries.length / 60));
    const sampled = entries.filter((_, i) => i % step === 0);
    
    // Add current balance as first point if needed, or just start from principal
    const max = loan.principal;
    const min = 0;
    const range = max || 1;

    const points = sampled.map((e, i) => {
      const x = (i / (sampled.length - 1)) * width;
      const y = height - (e.remainingBalance / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    if (points.length === 0) return `0,${height} ${width},${height}`;
    
    return points.join(' ');
  } catch {
    // Fallback: horizontal line at bottom
    return `0,${height} ${width},${height}`;
  }
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


