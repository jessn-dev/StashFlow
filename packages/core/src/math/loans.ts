import { 
  Installment, 
  LoanInterestType, 
  LoanInterestBasis 
} from '../schema'

export interface AmortizationOptions {
  principal: number
  annualRate: number
  durationMonths: number
  startDate: string
  paymentStartDate?: string
  interestType?: LoanInterestType
  interestBasis?: LoanInterestBasis
  financedFees?: number
}

/**
 * Helper to round to 2 decimal places reliably.
 */
function round(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Enhanced Amortization Engine
 * Supports multiple interest models and global day count conventions.
 */
export function generateInstallmentSchedule(options: AmortizationOptions): Installment[] {
  const {
    principal: basePrincipal,
    annualRate,
    durationMonths,
    startDate,
    paymentStartDate,
    interestType = 'Standard Amortized',
    interestBasis = 'Actual/365',
    financedFees = 0
  } = options

  if (durationMonths <= 0 || basePrincipal <= 0) return []

  const schedule: Installment[] = []
  const loanPrincipal = basePrincipal + financedFees
  let remainingBalance = loanPrincipal
  
  const firstPaymentDate = paymentStartDate ? new Date(paymentStartDate) : new Date(startDate)
  
  // Handle invalid date strings
  if (isNaN(firstPaymentDate.getTime())) {
    return []
  }

  const firstPayment = firstPaymentDate
  if (!paymentStartDate) {
    firstPayment.setUTCMonth(firstPayment.getUTCMonth() + 1)
  }

  // 1. Calculate Monthly Interest Rate Factor based on Basis
  const getMonthlyInterest = (balance: number, periodStartDate: Date): number => {
    const rateDecimal = annualRate / 100
    if (interestBasis === '30/360') {
      return round(balance * (rateDecimal / 12))
    }
    const daysInYear = interestBasis === 'Actual/360' ? 360 : 365
    const year = periodStartDate.getUTCFullYear()
    const month = periodStartDate.getUTCMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return round((balance * rateDecimal * daysInMonth) / daysInYear)
  }

  // 2. Handle Add-on Interest upfront (common in PH/JP)
  // Interest is calculated on the original principal for the entire term.
  if (interestType === 'Add-on Interest') {
    const totalInterest = round(loanPrincipal * (annualRate / 100) * (durationMonths / 12))
    const monthlyPrincipal = round(loanPrincipal / durationMonths)
    const monthlyInterest = round(totalInterest / durationMonths)
    const monthlyPayment = monthlyPrincipal + monthlyInterest

    for (let m = 1; m <= durationMonths; m++) {
      const dueDate = new Date(firstPayment)
      dueDate.setUTCMonth(dueDate.getUTCMonth() + (m - 1))
      
      let p = monthlyPrincipal
      let i = monthlyInterest
      
      // Adjust last installment for rounding residuals
      if (m === durationMonths) {
        p = remainingBalance
        i = round(totalInterest - (monthlyInterest * (durationMonths - 1)))
      }

      remainingBalance = round(remainingBalance - p)
      
      schedule.push({
        dueDate: dueDate.toISOString().split('T')[0],
        principal: p,
        interest: i,
        total: round(p + i),
        remainingBalance: Math.max(0, remainingBalance)
      })
    }
    return schedule
  }

  // 3. Standard Amortization & Other Reducing Balance types
  const monthlyRate = annualRate / 100 / 12
  
  let fixedMonthlyPayment = 0
  if (interestType === 'Standard Amortized') {
    if (annualRate === 0) {
      fixedMonthlyPayment = loanPrincipal / durationMonths
    } else {
      fixedMonthlyPayment = (loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, durationMonths))) /
                            (Math.pow(1 + monthlyRate, durationMonths) - 1)
    }
  } else if (interestType === 'Interest-Only') {
    fixedMonthlyPayment = loanPrincipal * monthlyRate
  }

  for (let m = 1; m <= durationMonths; m++) {
    const dueDate = new Date(firstPayment)
    dueDate.setUTCMonth(dueDate.getUTCMonth() + (m - 1))
    
    const periodStart = new Date(dueDate)
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 1)

    const interest = getMonthlyInterest(remainingBalance, periodStart)
    let principalPaid = 0

    if (interestType === 'Fixed Principal') {
      principalPaid = round(loanPrincipal / durationMonths)
    } else if (interestType === 'Interest-Only') {
      principalPaid = m === durationMonths ? remainingBalance : 0
    } else {
      // Standard Amortized
      principalPaid = round(fixedMonthlyPayment - interest)
    }

    // Final adjustment to clear balance exactly
    if (m === durationMonths || principalPaid > remainingBalance) {
      principalPaid = remainingBalance
    }

    remainingBalance = round(remainingBalance - principalPaid)

    schedule.push({
      dueDate: dueDate.toISOString().split('T')[0],
      principal: principalPaid,
      interest: interest,
      total: round(principalPaid + interest),
      remainingBalance: Math.max(0, remainingBalance)
    })

    if (remainingBalance <= 0 && m < durationMonths) {
       // Loan paid off early due to rounding or zero balance
       break;
    }
  }

  return schedule
}

/**
 * Recalculates the remaining schedule after a lump-sum prepayment.
 */
export function recalculateAfterPrepayment(
  options: AmortizationOptions & { 
    currentRemainingBalance: number,
    prepaymentAmount: number,
    target: 'shorter_term' | 'lower_installment'
  }
): Installment[] {
  const { 
    currentRemainingBalance, 
    prepaymentAmount, 
    target, 
    ...origOptions 
  } = options

  const newPrincipal = round(currentRemainingBalance - prepaymentAmount)
  if (newPrincipal <= 0) return []
  
  if (target === 'shorter_term') {
    // Keep original monthly payment (approximately), solve for new duration
    // We use the original fixedMonthlyPayment from the previous schedule
    const monthlyRate = origOptions.annualRate / 100 / 12
    const originalSchedule = generateInstallmentSchedule(origOptions)
    const originalPayment = originalSchedule[0]?.total || 0

    if (originalPayment <= 0) return []

    // Solve for n: P = (PMT/i) * (1 - (1+i)^-n)
    // n = -log(1 - (P*i)/PMT) / log(1+i)
    let newDuration = origOptions.durationMonths
    if (monthlyRate > 0) {
      const n = -Math.log(1 - (newPrincipal * monthlyRate) / originalPayment) / Math.log(1 + monthlyRate)
      newDuration = Math.ceil(n)
    } else {
      // Zero interest case: Principal / Payment
      newDuration = Math.ceil(newPrincipal / originalPayment)
    }

    return generateInstallmentSchedule({
      ...origOptions,
      principal: newPrincipal,
      durationMonths: Math.max(1, newDuration)
    })
  }

  // Lower installment: Keep original remaining duration
  // We need to calculate how many months were left
  // For simplicity, we'll assume the user wants the same END DATE
  return generateInstallmentSchedule({
    ...origOptions,
    principal: newPrincipal
    // durationMonths would ideally be remainingMonths
  })
}
