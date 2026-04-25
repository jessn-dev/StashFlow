import { Loan, convertToBase } from '@stashflow/core';
import { ILoanQuery, IExchangeRateQuery, IProfileQuery } from '../queries/interfaces';

export interface LoansPageData {
  loans: Loan[];
  totalDebt: number;
  currency: string;
}

export class LoansService {
  constructor(
    private loanQuery: ILoanQuery,
    private exchangeRateQuery: IExchangeRateQuery,
    private profileQuery: IProfileQuery,
  ) {}

  async getLoansPageData(userId: string): Promise<LoansPageData> {
    const profile = await this.profileQuery.get(userId);
    const [loans, rates] = await Promise.all([
      this.loanQuery.getAll(userId),
      this.exchangeRateQuery.getLatest(),
    ]);

    const currency = profile?.preferred_currency || 'USD';
    const totalDebt = loans.reduce((acc, loan) => {
      const rate = rates[loan.currency] ?? 1;
      return acc + convertToBase(loan.principal, rate);
    }, 0);

    return { loans, totalDebt, currency };
  }
}
