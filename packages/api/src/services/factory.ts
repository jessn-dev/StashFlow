import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';
import {
  ProfileQuery,
  TransactionQuery,
  LoanQuery,
  GoalQuery,
  ExchangeRateQuery
} from '../queries';
import { DashboardService } from './dashboard';
import { LoansService } from './loans';

export class DashboardServiceFactory {
  static create(client: SupabaseClient<Database>): DashboardService {
    return new DashboardService(
      new ProfileQuery(client),
      new TransactionQuery(client),
      new LoanQuery(client),
      new GoalQuery(client),
      new ExchangeRateQuery(client)
    );
  }
}

export class LoansServiceFactory {
  static create(client: SupabaseClient<Database>): LoansService {
    return new LoansService(
      new LoanQuery(client),
      new ExchangeRateQuery(client),
      new ProfileQuery(client),
    );
  }
}
