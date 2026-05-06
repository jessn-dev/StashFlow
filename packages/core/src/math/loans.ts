import { LoanInterestType, LoanInterestBasis } from '../schema';

export interface AmortizationEntry {
  period: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
  dueDate: string;
}

export interface AmortizationSchedule {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  entries: AmortizationEntry[];
}

/**
 * Generates an amortization schedule for a loan.
 */
export function generateAmortizationSchedule(params: {
  principal: number;
  annualInterestRate: number; // e.g., 0.05 for 5%
  durationMonths: number;
  startDate: string;
  interestType: LoanInterestType;
  interestBasis?: LoanInterestBasis;
}): AmortizationSchedule {
  const { principal, annualInterestRate, durationMonths, startDate, interestType } = params;
  const monthlyRate = annualInterestRate / 12;
  
  let entries: AmortizationEntry[] = [];
  let totalInterest = 0;
  let monthlyPayment = 0;

  if (interestType === 'Standard Amortized') {
    // Formula: P * (r(1+r)^n) / ((1+r)^n - 1)
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
  } else if (interestType === 'Interest-Only') {
    monthlyPayment = principal * monthlyRate;
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
    // Last payment includes principal
  } else if (interestType === 'Add-on Interest') {
    const totalInterestForPeriod = principal * annualInterestRate * (durationMonths / 12);
    monthlyPayment = (principal + totalInterestForPeriod) / durationMonths;
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
  } else if (interestType === 'Fixed Principal') {
    const principalPayment = principal / durationMonths;
    let balance = principal;
    for (let i = 1; i <= durationMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const currentMonthlyPayment = principalPayment + interestPayment;
      balance -= principalPayment;
      totalInterest += interestPayment;

      // In Fixed Principal, the monthlyPayment varies, so we just set the first one or average?
      // Usually, we'd return the first payment or handle it as a schedule.
      if (i === 1) monthlyPayment = currentMonthlyPayment;

      entries.push({
        period: i,
        principalPayment,
        interestPayment,
        remainingBalance: Math.max(0, balance),
        dueDate: addMonths(startDate, i),
      });
    }
  }

  return {
    monthlyPayment,
    totalInterest,
    totalPayment: principal + totalInterest,
    entries,
  };
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0]!;
}
