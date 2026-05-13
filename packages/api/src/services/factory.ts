import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';
import {
  ProfileQuery,
  TransactionQuery,
  LoanQuery,
  ExchangeRateQuery,
  AssetQuery,
  NetWorthSnapshotQuery,
  GoalQuery,
  BudgetQuery,
} from '../queries';
import { LoansService } from './loans';
import { DashboardService } from './dashboard';

/**
 * Unified factory for all StashFlow API queries and services.
 * 
 * This ensures consistent instantiation across the application and allows for
 * future dependency injection or mocking in tests. It acts as a single point of
 * entry for accessing database queries and business logic services.
 */
export class ApiServiceFactory {
  /**
   * Creates an instance of ApiServiceFactory.
   * 
   * @param client - The Supabase client instance used for database operations.
   */
  constructor(private client: SupabaseClient<Database>) {}

  // --- Queries ---
  // These provide direct access to specific database tables and views.

  /** Returns a query handler for user profiles. */
  get profiles() { return new ProfileQuery(this.client); }
  
  /** Returns a query handler for income and expense transactions. */
  get transactions() { return new TransactionQuery(this.client); }
  
  /** Returns a query handler for loan records and summaries. */
  get loans() { return new LoanQuery(this.client); }
  
  /** Returns a query handler for currency exchange rates. */
  get exchangeRates() { return new ExchangeRateQuery(this.client); }
  
  /** Returns a query handler for user assets. */
  get assets() { return new AssetQuery(this.client); }
  
  /** Returns a query handler for net worth history. */
  get netWorthSnapshots() { return new NetWorthSnapshotQuery(this.client); }
  
  /** Returns a query handler for financial goals. */
  get goals() { return new GoalQuery(this.client); }
  
  /** Returns a query handler for budgeting information. */
  get budgets() { return new BudgetQuery(this.client); }

  // --- Services ---
  // These encapsulate complex business logic and often orchestrate multiple queries.

  /**
   * Returns an initialized LoansService.
   * Orchestrates loan queries, exchange rates, and transaction data for loan analysis.
   */
  get loansService() {
    return new LoansService(
      this.loans,
      this.exchangeRates,
      this.profiles,
      this.transactions,
    );
  }

  /**
   * Returns an initialized DashboardService.
   * Handles generation of intelligence items and insights.
   */
  get dashboardService() {
    return new DashboardService();
  }
}


