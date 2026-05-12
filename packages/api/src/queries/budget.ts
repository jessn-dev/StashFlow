import { BaseQuery } from './base';
import { Budget, BudgetPeriod, ExpenseCategory } from '@stashflow/core';
import { IBudgetQuery } from './interfaces';

/**
 * BudgetQuery manages budget-related database operations.
 * It allows retrieving active budgets, budget periods, and performing upsert/delete actions.
 */
export class BudgetQuery extends BaseQuery implements IBudgetQuery {
  /**
   * Retrieves all active budgets for a specific user.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of Budget objects.
   * @throws Will throw an error if the database query fails.
   */
  async getActive(userId: string): Promise<Budget[]> {
    // PSEUDOCODE:
    // 1. Query the 'budgets' table.
    // 2. Filter by user_id to ensure the user only sees their own budgets.
    // 3. Return the resulting records.
    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Retrieves budget periods for a user and a specific period string.
   * 
   * @param userId - The unique identifier of the user.
   * @param period - The period string (e.g., '2023-10').
   * @returns A promise that resolves to an array of BudgetPeriod objects.
   * @throws Will throw an error if the database query fails.
   */
  async getPeriods(userId: string, period: string): Promise<BudgetPeriod[]> {
    // PSEUDOCODE:
    // 1. Query the 'budget_periods' table.
    // 2. Filter by both user_id and the specific period identifier.
    // 3. Return the matched records.
    const { data, error } = await this.client
      .from('budget_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period);

    if (error) throw error;
    return data || [];
  }

  /**
   * Upserts a budget record for a user and category.
   * 
   * @param userId - The unique identifier of the user.
   * @param category - The expense category for the budget.
   * @param amount - The budgeted amount.
   * @param currency - The currency for the budget.
   * @returns A promise that resolves to the upserted Budget object.
   * @throws Will throw an error if the database operation fails.
   */
  async upsert(userId: string, category: ExpenseCategory, amount: number, currency: string): Promise<Budget> {
    // PSEUDOCODE:
    // 1. Perform an upsert operation on the 'budgets' table.
    // 2. Define conflict resolution based on the unique combination of user_id and category.
    // 3. Select and return the resulting record.
    const { data, error } = await this.client
      .from('budgets')
      .upsert(
        { user_id: userId, category, amount, currency },
        { onConflict: 'user_id,category' }, // Ensures one budget per category per user
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deletes a budget record.
   * 
   * @param budgetId - The unique identifier of the budget to delete.
   * @returns A promise that resolves when the deletion is complete.
   * @throws Will throw an error if the database deletion fails.
   */
  async delete(budgetId: string): Promise<void> {
    // PSEUDOCODE:
    // 1. Execute a delete operation on the 'budgets' table.
    // 2. Filter by the specific budgetId.
    const { error } = await this.client
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) throw error;
  }
}
