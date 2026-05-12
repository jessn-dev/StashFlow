import { BaseQuery } from './base';
import { Goal } from '@stashflow/core';
import { IGoalQuery, GoalInput } from './interfaces';

/**
 * GoalQuery manages financial goals within the database.
 * It provides functionality to list, create, update, and delete user-defined goals.
 */
export class GoalQuery extends BaseQuery implements IGoalQuery {
  /**
   * Retrieves all goals for a specific user, ordered by their deadline.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of Goal objects.
   * @throws Will throw an error if the database query fails.
   */
  async getAll(userId: string): Promise<Goal[]> {
    // PSEUDOCODE:
    // 1. Query the 'goals' table.
    // 2. Filter by user_id to ensure data privacy.
    // 3. Sort by deadline in ascending order.
    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('deadline', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Creates a new financial goal for a user.
   * 
   * @param userId - The unique identifier of the user.
   * @param input - The goal details to be saved.
   * @returns A promise that resolves to the newly created Goal object.
   * @throws Will throw an error if the database insertion fails.
   */
  async create(userId: string, input: GoalInput): Promise<Goal> {
    // PSEUDOCODE:
    // 1. Insert the goal data into the 'goals' table.
    // 2. Assign the user_id to the record for ownership.
    // 3. Return the inserted record.
    const { data, error } = await this.client
      .from('goals')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Updates an existing financial goal.
   * 
   * @param goalId - The unique identifier of the goal.
   * @param updates - Partial goal details to update.
   * @returns A promise that resolves to the updated Goal object.
   * @throws Will throw an error if the update operation fails.
   */
  async update(goalId: string, updates: Partial<GoalInput>): Promise<Goal> {
    // PSEUDOCODE:
    // 1. Update the specified record in the 'goals' table.
    // 2. Filter by the goal's unique identifier.
    // 3. Return the updated record.
    const { data, error } = await this.client
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deletes a financial goal.
   * 
   * @param goalId - The unique identifier of the goal to delete.
   * @returns A promise that resolves when the deletion is complete.
   * @throws Will throw an error if the database deletion fails.
   */
  async delete(goalId: string): Promise<void> {
    // PSEUDOCODE:
    // 1. Perform a delete operation on the 'goals' table.
    // 2. Filter by the specific goal identifier.
    const { error } = await this.client
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  }
}
