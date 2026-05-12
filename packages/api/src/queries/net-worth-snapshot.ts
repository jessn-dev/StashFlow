import { SupabaseClient } from '@supabase/supabase-js';
import { Database, NetWorthSnapshot } from '@stashflow/core';
import { BaseQuery } from './base';
import { INetWorthSnapshotQuery } from './interfaces';

/**
 * NetWorthSnapshotQuery handles the storage and retrieval of user net worth snapshots.
 * These snapshots capture the total financial state at a specific point in time.
 */
export class NetWorthSnapshotQuery extends BaseQuery implements INetWorthSnapshotQuery {
  /**
   * Initializes the NetWorthSnapshotQuery with a Supabase client.
   * 
   * @param supabase - The Supabase client instance.
   */
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase);
  }

  /**
   * Retrieves all net worth snapshots for a user, ordered by date.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to an array of NetWorthSnapshot objects.
   * @throws Will throw an error if the database query fails.
   */
  async getAll(userId: string): Promise<NetWorthSnapshot[]> {
    // PSEUDOCODE:
    // 1. Query the 'net_worth_snapshots' table.
    // 2. Filter by user_id for data isolation.
    // 3. Order chronologically by snapshot_date.
    const { data, error } = await this.client
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true });

    if (error) throw error;
    return (data as NetWorthSnapshot[]) || [];
  }

  /**
   * Retrieves the most recent net worth snapshot for a user.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to the latest NetWorthSnapshot or null if none exist.
   * @throws Will throw an error if the database query fails (excluding 'no rows' errors).
   */
  async getLatest(userId: string): Promise<NetWorthSnapshot | null> {
    // PSEUDOCODE:
    // 1. Query the 'net_worth_snapshots' table.
    // 2. Filter by user_id.
    // 3. Order by snapshot_date descending to get the newest first.
    // 4. Limit to 1 result.
    const { data, error } = await this.client
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    // PGRST116 is the PostgREST error code for "JSON object requested, but no rows returned".
    // We handle this gracefully because it's a valid state (user has no snapshots yet).
    if (error && error.code !== 'PGRST116') throw error;
    return (data as NetWorthSnapshot) || null;
  }

  /**
   * Creates a new net worth snapshot record.
   * 
   * @param userId - The unique identifier of the user.
   * @param snapshot - The snapshot data (excluding system-generated fields).
   * @returns A promise resolving to the created NetWorthSnapshot.
   * @throws Will throw an error if the insertion fails.
   */
  async create(userId: string, snapshot: Omit<NetWorthSnapshot, 'id' | 'created_at' | 'user_id'>): Promise<NetWorthSnapshot> {
    // PSEUDOCODE:
    // 1. Insert the snapshot data into 'net_worth_snapshots'.
    // 2. Explicitly bind the record to the userId.
    // 3. Return the inserted record.
    const { data, error } = await this.client
      .from('net_worth_snapshots')
      .insert({
        user_id: userId,
        ...snapshot,
      })
      .select()
      .single();

    if (error) throw error;
    return data as NetWorthSnapshot;
  }
}
