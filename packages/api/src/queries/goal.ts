import { BaseQuery } from './base';
import { Goal } from '@stashflow/core';
import { IGoalQuery } from './interfaces';

export class GoalQuery extends BaseQuery implements IGoalQuery {
  async getAll(userId: string): Promise<Goal[]> {
    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('deadline', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
