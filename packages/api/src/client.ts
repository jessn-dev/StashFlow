import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';

export interface ClientConfig {
  url: string;
  anonKey: string;
}

/**
 * Factory to create a Supabase client.
 * Injected config allows for different envs (browser, server, tests).
 */
export function createStashFlowClient(config: ClientConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey);
}
