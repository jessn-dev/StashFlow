import { BaseQuery } from './base';
import { Goal } from '@stashflow/core';
import { IGoalQuery, GoalInput } from './interfaces';

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

  async create(userId: string, input: GoalInput): Promise<Goal> {
    const { data, error } = await this.client
      .from('goals')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(goalId: string, updates: Partial<GoalInput>): Promise<Goal> {
    const { data, error } = await this.client
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(goalId: string): Promise<void> {
    const { error } = await this.client
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  }
}
