import { BaseQuery } from './base';
import { Income, Expense, UnifiedTransaction, TransactionSummary, convertToBase, ExpenseCategory } from '@stashflow/core';
import { ITransactionQuery, TransactionFilterOpts, PeriodSummary, HistoricalSummary, SpendingByCategory } from './interfaces';

/**
 * Query implementation for transaction-related operations.
 * Handles fetching incomes, expenses, unified transactions, and calculating financial summaries.
 */
export class TransactionQuery extends BaseQuery implements ITransactionQuery {
  /**
   * Fetches all income records for a specific user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of Income objects.
   * @throws Will throw an error if the database query fails.
   */
  async getIncomes(userId: string): Promise<Income[]> {
    const { data, error } = await this.client
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetches all expense records for a specific user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of Expense objects.
   * @throws Will throw an error if the database query fails.
   */
  async getExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Combines incomes and expenses into a unified transaction list, sorted by date.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of UnifiedTransaction objects.
   * @throws Will throw an error if any of the underlying queries fail.
   */
  async getAllTransactions(userId: string): Promise<UnifiedTransaction[]> {
    /*
     * PSEUDOCODE:
     * 1. Fetch both incomes and expenses in parallel for efficiency.
     * 2. Map income records to the UnifiedTransaction structure (type: 'income').
     * 3. Map expense records to the UnifiedTransaction structure (type: 'expense').
     * 4. Merge both arrays.
     * 5. Sort the final list by date in descending order.
     */
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
        provenance: (inc as any).provenance,
        source_document_id: (inc as any).source_document_id,
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
        provenance: (exp as any).provenance,
        source_document_id: (exp as any).source_document_id,
      })),
    ];

    // Standard descending date sort to ensure newest transactions appear first in feeds.
    return unified.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Fetches filtered transactions from the unified view with pagination support.
   * 
   * @param userId - Unique identifier of the user.
   * @param opts - Filtering and pagination options.
   * @returns A promise resolving to a filtered array of UnifiedTransaction objects.
   * @throws Will throw an error if the database query fails.
   */
  async getTransactionsFiltered(userId: string, opts: TransactionFilterOpts): Promise<UnifiedTransaction[]> {
    const { dateFrom, dateTo, type = 'all', search, limit = 100, cursor } = opts;

    let query = this.client
      .from('unified_transactions')
      .select('*')
      .eq('user_id', userId);

    if (type !== 'all') {
      query = query.eq('type', type);
    }

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    
    // Simple text search across description and notes using ILIKE for case-insensitivity.
    if (search) {
      query = query.or(`description.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    /*
     * PSEUDOCODE:
     * 1. Check if a pagination cursor exists.
     * 2. Split cursor into its components (date and ID).
     * 3. Apply keyset pagination logic: (date < cDate) OR (date = cDate AND id < cId).
     * 4. Order by date and ID to ensure stable pagination.
     * 5. Limit results to the requested amount.
     */
    if (cursor) {
      const [cDate, cId] = cursor.split('|');
      if (cDate && cId) {
        // Use composite comparison to handle multiple transactions on the same day.
        query = query.or(`date.lt.${cDate},and(date.eq.${cDate},id.lt.${cId})`);
      }
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as UnifiedTransaction[];
  }

  /**
   * Calculates a summary of income and expenses for a specific date range.
   * All amounts are converted to the user's preferred currency.
   * 
   * @param userId - Unique identifier of the user.
   * @param dateFrom - Start of the period (ISO date string).
   * @param dateTo - End of the period (ISO date string).
   * @returns A promise resolving to a PeriodSummary.
   * @throws Will throw an error if any database query fails.
   */
  async getSummaryForPeriod(userId: string, dateFrom: string, dateTo: string): Promise<PeriodSummary> {
    /*
     * PSEUDOCODE:
     * 1. Fetch user profile (for currency), exchange rates, incomes, and expenses in parallel.
     * 2. Determine base currency (defaulting to USD if not set).
     * 3. Normalize exchange rates into a map for quick lookup.
     * 4. Iterate through incomes, converting each to base currency and summing.
     * 5. Iterate through expenses, converting each to base currency and summing.
     * 6. Return the totals along with net flow and transaction count.
     */
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

    // We convert everything to base currency immediately to ensure financial calculations are consistent.
    incomeRes.data?.forEach((i) => {
      totalIncome += convertToBase(i.amount, rates[i.currency] ?? 1);
    });
    expenseRes.data?.forEach((e) => {
      totalExpenses += convertToBase(e.amount, rates[e.currency] ?? 1);
    });

    const count = (incomeRes.data?.length ?? 0) + (expenseRes.data?.length ?? 0);

    return { totalIncome, totalExpenses, netFlow: totalIncome - totalExpenses, currency, count };
  }

  /**
   * Generates monthly summaries for a historical period.
   * 
   * @param userId - Unique identifier of the user.
   * @param months - Number of months to look back (default: 12).
   * @returns A promise resolving to an array of HistoricalSummary objects.
   * @throws Will throw an error if any database query fails.
   */
  async getHistoricalSummaries(userId: string, months: number = 12): Promise<HistoricalSummary[]> {
    /*
     * PSEUDOCODE:
     * 1. Calculate the start date based on the requested month count.
     * 2. Fetch exchange rates, incomes, expenses, and user profile in parallel.
     * 3. Initialize an empty summary map for each month in the range to ensure no gaps.
     * 4. Bucket incomes into months, converting to base currency.
     * 5. Bucket expenses into months, converting to base currency.
     * 6. Calculate net flow for each month.
     * 7. Convert map to sorted array.
     */
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1).toISOString().split('T')[0]!;

    const [ratesRes, incomeRes, expenseRes, profileRes] = await Promise.all([
      this.client.from('exchange_rates').select('target, rate'),
      this.client.from('incomes').select('amount, currency, date').eq('user_id', userId).gte('date', startDate),
      this.client.from('expenses').select('amount, currency, date').eq('user_id', userId).gte('date', startDate),
      this.client.from('profiles').select('preferred_currency').eq('id', userId).maybeSingle(),
    ]);

    const baseCurrency = profileRes.data?.preferred_currency || 'USD';
    const rates: Record<string, number> = { USD: 1 };
    ratesRes.data?.forEach((r) => { rates[r.target] = Number(r.rate); });

    const summaries: Record<string, TransactionSummary> = {};

    // Initialize months to ensure even months with zero activity are represented in charts.
    for (let i = 0; i < months; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      summaries[monthKey] = { totalIncome: 0, totalExpenses: 0, netFlow: 0, currency: baseCurrency };
    }

    incomeRes.data?.forEach((inc) => {
      const month = inc.date.slice(0, 7);
      if (summaries[month]) {
        summaries[month]!.totalIncome += convertToBase(inc.amount, rates[inc.currency] ?? 1);
      }
    });

    expenseRes.data?.forEach((exp) => {
      const month = exp.date.slice(0, 7);
      if (summaries[month]) {
        summaries[month]!.totalExpenses += convertToBase(exp.amount, rates[exp.currency] ?? 1);
      }
    });

    Object.values(summaries).forEach((s) => {
      s.netFlow = s.totalIncome - s.totalExpenses;
    });

    return Object.entries(summaries)
      .map(([month, s]) => ({ month, ...s } as HistoricalSummary))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Breaks down spending by category for a specific period.
   * 
   * @param userId - Unique identifier of the user.
   * @param dateFrom - Start of the period (ISO date string).
   * @param dateTo - End of the period (ISO date string).
   * @returns A promise resolving to an array of spending by category, sorted by amount descending.
   * @throws Will throw an error if any database query fails.
   */
  async getSpendingByCategory(userId: string, dateFrom: string, dateTo: string): Promise<SpendingByCategory[]> {
    /*
     * PSEUDOCODE:
     * 1. Fetch exchange rates and expenses for the period.
     * 2. Initialize a map to hold totals per category.
     * 3. Iterate through expenses, converting to base currency.
     * 4. Aggregate amounts by category (using 'other' for null categories).
     * 5. Return sorted array of results.
     */
    const [ratesRes, expenseRes] = await Promise.all([
      this.client.from('exchange_rates').select('target, rate'),
      this.client.from('expenses').select('amount, currency, category').eq('user_id', userId).gte('date', dateFrom).lte('date', dateTo),
    ]);

    const rates: Record<string, number> = { USD: 1 };
    ratesRes.data?.forEach((r) => { rates[r.target] = Number(r.rate); });

    const categories: Record<string, number> = {};

    expenseRes.data?.forEach((exp) => {
      const cat = exp.category || 'other';
      const amountInBase = convertToBase(exp.amount, rates[exp.currency] ?? 1);
      categories[cat] = (categories[cat] || 0) + amountInBase;
    });

    return Object.entries(categories).map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * Retrieves a high-level transaction summary for a specific month.
   * 
   * @param userId - Unique identifier of the user.
   * @param month - Month string (YYYY-MM).
   * @returns A promise resolving to a TransactionSummary.
   * @throws Will throw an error if any database query fails.
   */
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

  /**
   * Analyzes spending trends by comparing the last 30 days to the previous 30-day period.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of trend analysis objects.
   * @throws Will throw an error if any database query fails.
   */
  async getTrendAnalysis(userId: string): Promise<{ category: ExpenseCategory; changePercent: number; currentAmount: number }[]> {
    /*
     * PSEUDOCODE:
     * 1. Define date windows: [now - 30d] and [now - 60d to now - 30d].
     * 2. Fetch expenses for both windows and exchange rates.
     * 3. Aggregate spending by category for both periods (normalized to base currency).
     * 4. Calculate percentage change for each category.
     * 5. Filter for significant changes (>= 10%) to reduce noise.
     */
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

    const [currentRes, previousRes, ratesRes] = await Promise.all([
      this.client.from('expenses').select('amount, currency, category').eq('user_id', userId).gte('date', thirtyDaysAgo),
      this.client.from('expenses').select('amount, currency, category').eq('user_id', userId).gte('date', sixtyDaysAgo).lt('date', thirtyDaysAgo),
      this.client.from('exchange_rates').select('target, rate'),
    ]);

    const rates: Record<string, number> = { USD: 1 };
    ratesRes.data?.forEach((r) => { rates[r.target] = Number(r.rate); });

    const currentMap: Record<string, number> = {};
    const previousMap: Record<string, number> = {};

    currentRes.data?.forEach((e) => {
      const cat = e.category || 'other';
      currentMap[cat] = (currentMap[cat] || 0) + convertToBase(e.amount, rates[e.currency] ?? 1);
    });

    previousRes.data?.forEach((e) => {
      const cat = e.category || 'other';
      previousMap[cat] = (previousMap[cat] || 0) + convertToBase(e.amount, rates[e.currency] ?? 1);
    });

    return Object.entries(currentMap).map(([cat, current]) => {
      const prev = previousMap[cat] || 0;
      // If previous spending was zero, we treat it as a 100% increase to avoid division by zero.
      const change = prev === 0 ? 100 : ((current - prev) / prev) * 100;
      return { category: cat as ExpenseCategory, changePercent: Math.round(change), currentAmount: current, previousAmount: prev };
    }).filter(t =>
      Math.abs(t.changePercent) >= 10 &&
      // Suppress micro-spending spikes: require at least $20 USD-equivalent in the current period.
      // Without this, a $0.50→$5.50 change becomes "1000% increase" — technically true but meaningless.
      t.currentAmount >= 20
    );
  }
}

