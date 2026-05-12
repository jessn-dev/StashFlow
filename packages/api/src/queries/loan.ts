import { BaseQuery } from './base';
import { Loan, LoanPayment } from '@stashflow/core';
import { ILoanQuery, PaymentSummary } from './interfaces';

/**
 * LoanQuery provides methods to interact with loan and loan payment data.
 * It handles retrieving loan details, payment schedules, and summary statistics.
 */
export class LoanQuery extends BaseQuery implements ILoanQuery {
  /**
   * Retrieves all loans for a specific user.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to an array of Loan objects.
   * @throws Will throw an error if the database query fails.
   */
  async getAll(userId: string): Promise<Loan[]> {
    // PSEUDOCODE:
    // 1. Query the 'loans' table.
    // 2. Filter by user_id to ensure data isolation.
    // 3. Return all matched loan records.
    const { data, error } = await this.client
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Retrieves a specific loan by its ID, ensuring it belongs to the user.
   * 
   * @param loanId - The unique identifier of the loan.
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to the Loan object or null if not found.
   * @throws Will throw an error if the database query fails.
   */
  async getById(loanId: string, userId: string): Promise<Loan | null> {
    // PSEUDOCODE:
    // 1. Query the 'loans' table.
    // 2. Filter by both loan id and user_id for authorization.
    // 3. Use maybeSingle to return null if no record is found without throwing.
    const { data, error } = await this.client
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId) // Security: Ensure user owns the loan
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Retrieves all payments associated with a specific loan.
   * 
   * @param loanId - The unique identifier of the loan.
   * @returns A promise resolving to an array of LoanPayment objects.
   * @throws Will throw an error if the database query fails.
   */
  async getPayments(loanId: string): Promise<LoanPayment[]> {
    // PSEUDOCODE:
    // 1. Query the 'loan_payments' table.
    // 2. Filter by the associated loan_id.
    // 3. Order payments by their due date chronologically.
    const { data, error } = await this.client
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Generates payment summaries for all loans belonging to a user.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to an array of PaymentSummary objects.
   * @throws Will throw an error if the database query fails.
   */
  async getPaymentSummaries(userId: string): Promise<PaymentSummary[]> {
    // PSEUDOCODE:
    // 1. Fetch relevant columns (loan_id, status, due_date) from 'loan_payments' for the user.
    // 2. Initialize a map to aggregate payment data per loan.
    // 3. Iterate through payments to count 'paid' status and find the earliest 'pending' due_date.
    // 4. Transform the map into the final PaymentSummary array format.
    const { data, error } = await this.client
      .from('loan_payments')
      .select('loan_id, status, due_date')
      .eq('user_id', userId);

    if (error) throw error;

    const map = new Map<string, { paidCount: number; nextDueDate: string | null }>();

    for (const payment of data ?? []) {
      const entry = map.get(payment.loan_id) ?? { paidCount: 0, nextDueDate: null };
      
      // Calculate payment statistics
      if (payment.status === 'paid') {
        entry.paidCount++;
      }
      
      // Identify the next upcoming payment
      if (payment.status === 'pending') {
        if (!entry.nextDueDate || payment.due_date < entry.nextDueDate) {
          entry.nextDueDate = payment.due_date;
        }
      }
      map.set(payment.loan_id, entry);
    }

    return Array.from(map.entries()).map(([loanId, s]) => ({
      loanId,
      paidCount: s.paidCount,
      nextDueDate: s.nextDueDate,
    }));
  }
}
