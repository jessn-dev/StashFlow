import { Installment } from '../types'

/**
 * Standard Amortization Formula:
 * M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
 *
 * M = Total monthly payment
 * P = Principal loan amount
 * i = Monthly interest rate (annual rate / 12)
 * n = Number of months (loan duration)
 *
 * Floating-point precision: remainingBalance is rounded to 2 decimal places
 * after each iteration to prevent cent-level drift accumulating over long loan
 * terms (e.g. 360 months). Without this, a $300k/30yr loan can drift by ~$0.50
 * by the final payment.
 */
export function generateInstallmentSchedule(
  principal: number,
  annualInterestRate: number,
  durationMonths: number,
  startDate: string
): Installment[] {
  const schedule: Installment[] = []
  const current = new Date(startDate)

  // Zero-interest loan: equal principal payments, no interest component
  if (annualInterestRate === 0) {
    const monthlyPayment = principal / durationMonths

    for (let m = 1; m <= durationMonths; m++) {
      const remainingBalance = m === durationMonths
        ? 0
        : Number((principal - monthlyPayment * m).toFixed(2))

      schedule.push({
        dueDate: current.toISOString().split('T')[0],
        principal: Number(monthlyPayment.toFixed(2)),
        interest: 0,
        total: Number(monthlyPayment.toFixed(2)),
        remainingBalance: Math.max(0, remainingBalance),
      })
      current.setUTCMonth(current.getUTCMonth() + 1)
    }
    return schedule
  }

  const monthlyRate = annualInterestRate / 100 / 12
  const monthlyPayment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, durationMonths))) /
    (Math.pow(1 + monthlyRate, durationMonths) - 1)

  let remainingBalance = principal

  for (let m = 1; m <= durationMonths; m++) {
    const interest = remainingBalance * monthlyRate
    const principalPaid = monthlyPayment - interest

    // Round running balance to cents after each step to prevent floating-point
    // drift accumulating across long loan terms.
    remainingBalance = Number((remainingBalance - principalPaid).toFixed(2))

    // Force the final payment to zero out exactly regardless of rounding residue
    const finalBalance = m === durationMonths ? 0 : Math.max(0, remainingBalance)

    schedule.push({
      dueDate: current.toISOString().split('T')[0],
      principal: Number(principalPaid.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      total: Number(monthlyPayment.toFixed(2)),
      remainingBalance: finalBalance,
    })

    current.setUTCMonth(current.getUTCMonth() + 1)
  }

  return schedule
}
