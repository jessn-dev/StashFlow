import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../services/dashboard';
import {
  IProfileQuery,
  ITransactionQuery,
  ILoanQuery,
  IGoalQuery,
  IExchangeRateQuery,
} from '../queries/interfaces';

describe('DashboardService', () => {
  let service: DashboardService;
  let profileQuery: IProfileQuery;
  let transactionQuery: ITransactionQuery;
  let loanQuery: ILoanQuery;
  let goalQuery: IGoalQuery;
  let exchangeRateQuery: IExchangeRateQuery;

  beforeEach(() => {
    profileQuery = { get: vi.fn(), update: vi.fn() };
    transactionQuery = { getIncomes: vi.fn(), getExpenses: vi.fn() };
    loanQuery = { getAll: vi.fn(), getPayments: vi.fn() };
    goalQuery = { getAll: vi.fn() };
    exchangeRateQuery = { getLatest: vi.fn() };

    service = new DashboardService(
      profileQuery,
      transactionQuery,
      loanQuery,
      goalQuery,
      exchangeRateQuery
    );
  });

  it('should aggregate data from all queries', async () => {
    vi.mocked(profileQuery.get).mockResolvedValue({ id: '123', preferred_currency: 'USD' } as any);
    vi.mocked(transactionQuery.getIncomes).mockResolvedValue([]);
    vi.mocked(transactionQuery.getExpenses).mockResolvedValue([]);
    vi.mocked(loanQuery.getAll).mockResolvedValue([]);
    vi.mocked(goalQuery.getAll).mockResolvedValue([]);
    vi.mocked(exchangeRateQuery.getLatest).mockResolvedValue({ USD: 1 });

    const data = await service.getDashboardData('123');

    expect(data).toBeDefined();
    expect(profileQuery.get).toHaveBeenCalledWith('123');
    expect(transactionQuery.getIncomes).toHaveBeenCalledWith('123');
  });

  it('should throw error if profile not found', async () => {
    vi.mocked(profileQuery.get).mockResolvedValue(null);

    await expect(service.getDashboardData('456')).rejects.toThrow('Profile not found');
  });
});
