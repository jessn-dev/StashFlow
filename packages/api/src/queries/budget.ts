import { BaseQuery } from './base';
import { Budget, BudgetPeriod } from '@stashflow/core';
import { IBudgetQuery } from './interfaces';

export class BudgetQuery extends BaseQuery implements IBudgetQuery {
  async getActive(userId: string): Promise<Budget[]> {
    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  async getPeriods(userId: string, period: string): Promise<BudgetPeriod[]> {
    const { data, error } = await this.client
      .from('budget_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period);

    if (error) throw error;
    return data || [];
  }
}
