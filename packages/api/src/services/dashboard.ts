import { 
  aggregateDashboardData, 
  DashboardPayload,
  getRegionByCurrency
} from '@stashflow/core';
import { 
  IProfileQuery, 
  ITransactionQuery, 
  ILoanQuery, 
  IGoalQuery, 
  IExchangeRateQuery 
} from '../queries/interfaces';

export class DashboardService {
  constructor(
    private profileQuery: IProfileQuery,
    private transactionQuery: ITransactionQuery,
    private loanQuery: ILoanQuery,
    private goalQuery: IGoalQuery,
    private exchangeRateQuery: IExchangeRateQuery
  ) {}

  async getDashboardData(userId: string): Promise<DashboardPayload> {
    const profile = await this.profileQuery.get(userId);
    if (!profile) throw new Error('Profile not found');

    const [incomes, expenses, loans, goals, rates] = await Promise.all([
      this.transactionQuery.getIncomes(userId),
      this.transactionQuery.getExpenses(userId),
      this.loanQuery.getAll(userId),
      this.goalQuery.getAll(userId),
      this.exchangeRateQuery.getLatest(),
    ]);

    return aggregateDashboardData({
      incomes,
      expenses,
      loans,
      goals,
      rates,
      region: getRegionByCurrency(profile.preferred_currency || 'USD'),
      currency: profile.preferred_currency || 'USD',
    });
  }
}
