import { BaseQuery } from './base';
import { Loan, LoanPayment, LoanFee } from '@stashflow/core';
import { ILoanQuery } from './interfaces';

export class LoanQuery extends BaseQuery implements ILoanQuery {
  async getAll(userId: string): Promise<Loan[]> {
    const { data, error } = await this.client
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
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
}
