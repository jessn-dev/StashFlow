import { SupabaseClient } from '@supabase/supabase-js';
import { Database, NetWorthSnapshot } from '@stashflow/core';
import { BaseQuery } from './base';
import { INetWorthSnapshotQuery } from './interfaces';

export class NetWorthSnapshotQuery extends BaseQuery implements INetWorthSnapshotQuery {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase);
  }

  async getAll(userId: string): Promise<NetWorthSnapshot[]> {
    const { data, error } = await this.client
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true });

    if (error) throw error;
    return (data as NetWorthSnapshot[]) || [];
  }

  async getLatest(userId: string): Promise<NetWorthSnapshot | null> {
    const { data, error } = await this.client
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as NetWorthSnapshot) || null;
  }

  async create(userId: string, snapshot: Omit<NetWorthSnapshot, 'id' | 'created_at' | 'user_id'>): Promise<NetWorthSnapshot> {
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
