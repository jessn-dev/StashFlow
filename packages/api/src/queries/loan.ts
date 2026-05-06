import { BaseQuery } from './base';
import { Loan, LoanPayment } from '@stashflow/core';
import { ILoanQuery, PaymentSummary } from './interfaces';

export class LoanQuery extends BaseQuery implements ILoanQuery {
  async getAll(userId: string): Promise<Loan[]> {
    const { data, error } = await this.client
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  async getById(loanId: string, userId: string): Promise<Loan | null> {
    const { data, error } = await this.client
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getPayments(loanId: string): Promise<LoanPayment[]> {
    const { data, error } = await this.client
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPaymentSummaries(userId: string): Promise<PaymentSummary[]> {
    const { data, error } = await this.client
      .from('loan_payments')
      .select('loan_id, status, due_date')
      .eq('user_id', userId);

    if (error) throw error;

    const map = new Map<string, { paidCount: number; nextDueDate: string | null }>();

    for (const payment of data ?? []) {
      const entry = map.get(payment.loan_id) ?? { paidCount: 0, nextDueDate: null };
      if (payment.status === 'paid') entry.paidCount++;
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
