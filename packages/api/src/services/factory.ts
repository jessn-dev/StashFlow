import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';
import {
  ProfileQuery,
  TransactionQuery,
  LoanQuery,
  ExchangeRateQuery
} from '../queries';
import { LoansService } from './loans';

export class LoansServiceFactory {
  static create(client: SupabaseClient<Database>): LoansService {
    return new LoansService(
      new LoanQuery(client),
      new ExchangeRateQuery(client),
      new ProfileQuery(client),
      new TransactionQuery(client),
    );
  }
}
