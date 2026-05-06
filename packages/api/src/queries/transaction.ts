import { BaseQuery } from './base';
import { Income, Expense, UnifiedTransaction, TransactionSummary, convertToBase } from '@stashflow/core';
import { ITransactionQuery, TransactionFilterOpts, PeriodSummary } from './interfaces';

export class TransactionQuery extends BaseQuery implements ITransactionQuery {
  async getIncomes(userId: string): Promise<Income[]> {
    const { data, error } = await this.client
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAllTransactions(userId: string): Promise<UnifiedTransaction[]> {
    const [incomes, expenses] = await Promise.all([
      this.getIncomes(userId),
      this.getExpenses(userId),
    ]);

    const unified: UnifiedTransaction[] = [
      ...incomes.map((inc) => ({
        id: inc.id,
        type: 'income' as const,
        amount: inc.amount,
        currency: inc.currency,
        description: inc.source,
        date: inc.date,
        notes: inc.notes,
      })),
      ...expenses.map((exp) => ({
        id: exp.id,
        type: 'expense' as const,
        amount: exp.amount,
        currency: exp.currency,
        description: exp.description,
        date: exp.date,
        category: exp.category,
        notes: exp.notes,
      })),
    ];

    return unified.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTransactionsFiltered(userId: string, opts: TransactionFilterOpts): Promise<UnifiedTransaction[]> {
    const { dateFrom, dateTo, type = 'all', search, limit = 100 } = opts;

    const buildIncomeQuery = () => {
      let q = this.client.from('incomes').select('*').eq('user_id', userId);
      if (dateFrom) q = q.gte('date', dateFrom);
      if (dateTo) q = q.lte('date', dateTo);
      if (search) q = q.or(`source.ilike.%${search}%,notes.ilike.%${search}%`);
      return q.order('date', { ascending: false }).limit(limit);
    };

    const buildExpenseQuery = () => {
      let q = this.client.from('expenses').select('*').eq('user_id', userId);
      if (dateFrom) q = q.gte('date', dateFrom);
      if (dateTo) q = q.lte('date', dateTo);
      if (search) q = q.or(`description.ilike.%${search}%,notes.ilike.%${search}%`);
      return q.order('date', { ascending: false }).limit(limit);
    };

    const [incomesRes, expensesRes] = await Promise.all([
      type === 'all' || type === 'income' ? buildIncomeQuery() : Promise.resolve({ data: [] as Income[], error: null }),
      type === 'all' || type === 'expense' ? buildExpenseQuery() : Promise.resolve({ data: [] as Expense[], error: null }),
    ]);

    if (incomesRes.error) throw incomesRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const unified: UnifiedTransaction[] = [
      ...(incomesRes.data || []).map((inc) => ({
        id: inc.id,
        type: 'income' as const,
        amount: inc.amount,
        currency: inc.currency,
        description: inc.source,
        date: inc.date,
        notes: inc.notes,
      })),
      ...(expensesRes.data || []).map((exp) => ({
        id: exp.id,
        type: 'expense' as const,
        amount: exp.amount,
        currency: exp.currency,
        description: exp.description,
        date: exp.date,
        category: exp.category,
        notes: exp.notes,
      })),
    ];

    return unified.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }

  async getSummaryForPeriod(userId: string, dateFrom: string, dateTo: string): Promise<PeriodSummary> {
    const [profileRes, ratesRes, incomeRes, expenseRes] = await Promise.all([
      this.client.from('profiles').select('preferred_currency').eq('id', userId).single(),
      this.client.from('exchange_rates').select('target, rate'),
      this.client.from('incomes').select('amount, currency').eq('user_id', userId).gte('date', dateFrom).lte('date', dateTo),
      this.client.from('expenses').select('amount, currency').eq('user_id', userId).gte('date', dateFrom).lte('date', dateTo),
    ]);

    const currency = profileRes.data?.preferred_currency || 'USD';
    const rates: Record<string, number> = { USD: 1 };
    ratesRes.data?.forEach((r) => { rates[r.target] = Number(r.rate); });

    let totalIncome = 0;
    let totalExpenses = 0;

    incomeRes.data?.forEach((i) => {
      totalIncome += convertToBase(i.amount, rates[i.currency] ?? 1);
    });
    expenseRes.data?.forEach((e) => {
      totalExpenses += convertToBase(e.amount, rates[e.currency] ?? 1);
    });

    const count = (incomeRes.data?.length ?? 0) + (expenseRes.data?.length ?? 0);

    return { totalIncome, totalExpenses, netFlow: totalIncome - totalExpenses, currency, count };
  }

  async getTransactionSummary(userId: string, month: string): Promise<TransactionSummary> {
    const [{ data: profile }, { data: ratesData }] = await Promise.all([
      this.client.from('profiles').select('preferred_currency').eq('id', userId).single(),
      this.client.from('exchange_rates').select('target, rate'),
    ]);

    const currency = profile?.preferred_currency || 'USD';
    const rates: Record<string, number> = {};
    ratesData?.forEach((r) => {
      rates[r.target] = Number(r.rate);
    });

    const all = await this.getAllTransactions(userId);
    const filtered = all.filter((t) => t.date.startsWith(month));

    let totalIncome = 0;
    let totalExpenses = 0;

    filtered.forEach((t) => {
      const rate = rates[t.currency] ?? 1;
      const amountInBase = convertToBase(t.amount, rate);

      if (t.type === 'income') totalIncome += amountInBase;
      else totalExpenses += amountInBase;
    });

    return {
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      currency,
    };
  }
}
