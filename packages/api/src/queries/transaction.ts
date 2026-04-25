import { BaseQuery } from './base';
import { Income, Expense } from '@stashflow/core';
import { ITransactionQuery } from './interfaces';

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
}
