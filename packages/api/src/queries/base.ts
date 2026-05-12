import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';

/**
 * BaseQuery serves as the abstract foundation for all database query classes.
 * It provides a shared Supabase client instance to its subclasses.
 */
export abstract class BaseQuery {
  /**
   * Initializes the BaseQuery with a Supabase client.
   * 
   * @param client - The Supabase client instance used for database operations.
   */
  constructor(protected client: SupabaseClient<Database>) {}
}
