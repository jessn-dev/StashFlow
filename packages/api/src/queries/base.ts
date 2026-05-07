import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@stashflow/core';

export abstract class BaseQuery {
  constructor(protected client: SupabaseClient<Database>) {}
}
