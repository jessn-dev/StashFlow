import {
  Loan,
  LoanPayment,
  LoanMetrics,
  LoanInterestType,
  convertToBase,
  calculateDTIRatio,
  getRegionByCurrency,
  generateAmortizationSchedule,
  aggregateLoanFinancials,
} from '@stashflow/core';
import { ILoanQuery, IExchangeRateQuery, IProfileQuery, ITransactionQuery, PaymentSummary } from '../queries/interfaces';

export interface LoansPageData {
  loans: Loan[];
  loanMetrics: Record<string, LoanMetrics>;
  totalDebt: number;
  totalMonthlyInstallment: number;
  avgInterestRate: number;
  activeLoanCount: number;
  dtiRatio: number;
  dtiHealthy: boolean;
  currency: string;
}

export class LoansService {
  constructor(
    private loanQuery: ILoanQuery,
    private exchangeRateQuery: IExchangeRateQuery,
    private profileQuery: IProfileQuery,
    private transactionQuery: ITransactionQuery,
  ) {}

  async getLoansPageData(userId: string): Promise<LoansPageData> {
    const profile = await this.profileQuery.get(userId);
    const currency = profile?.preferred_currency ?? 'USD';
    const region = getRegionByCurrency(currency);

    const [loans, rates, incomes, paymentSummaries] = await Promise.all([
      this.loanQuery.getAll(userId),
      this.exchangeRateQuery.getLatest(),
      this.transactionQuery.getIncomes(userId),
      this.loanQuery.getPaymentSummaries(userId),
    ]);

    const { totalDebt, totalMonthlyInstallment, avgInterestRate, activeLoanCount } =
      aggregateLoanFinancials(loans, rates);

    const monthlyIncome = incomes.reduce((acc, inc) => {
      const rate = rates[inc.currency] ?? 1;
      return acc + convertToBase(inc.amount, rate);
    }, 0);

    const dtiResult = calculateDTIRatio(totalMonthlyInstallment, monthlyIncome, region);

    const summaryByLoanId = new Map<string, PaymentSummary>(
      paymentSummaries.map(s => [s.loanId, s])
    );

    const loanMetrics: Record<string, LoanMetrics> = {};
    for (const loan of loans) {
      const summary = summaryByLoanId.get(loan.id);
      const paidCount = summary?.paidCount ?? 0;
      const paidPercent = loan.duration_months > 0
        ? Math.min(100, Math.round((paidCount / loan.duration_months) * 100))
        : 0;

      let remainingBalance = loan.principal;
      try {
        const schedule = generateAmortizationSchedule({
          principal: loan.principal,
          annualInterestRate: loan.interest_rate / 100,
          durationMonths: loan.duration_months,
          startDate: loan.start_date,
          interestType: (loan.interest_type ?? 'Standard Amortized') as LoanInterestType,
          ...(loan.interest_basis ? { interestBasis: loan.interest_basis } : {}),
        });
        if (paidCount > 0) {
          const entryIndex = Math.min(paidCount - 1, schedule.entries.length - 1);
          remainingBalance = schedule.entries[entryIndex]?.remainingBalance ?? loan.principal;
        }
      } catch {
        // keep principal as fallback
      }

      loanMetrics[loan.id] = {
        paidCount,
        paidPercent,
        remainingBalance,
        nextDueDate: summary?.nextDueDate ?? null,
      };
    }

    return {
      loans,
      loanMetrics,
      totalDebt,
      totalMonthlyInstallment,
      avgInterestRate,
      activeLoanCount,
      dtiRatio: dtiResult.ratio,
      dtiHealthy: dtiResult.isHealthy,
      currency,
    };
  }

  async getLoanDetail(loanId: string, userId: string): Promise<{ loan: Loan; payments: LoanPayment[] } | null> {
    const loan = await this.loanQuery.getById(loanId, userId);
    if (!loan) return null;

    const payments = await this.loanQuery.getPayments(loanId);
    return { loan, payments };
  }
}
