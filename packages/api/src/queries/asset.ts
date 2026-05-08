import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Asset, AssetInput } from '@stashflow/core';
import { BaseQuery } from './base';
import { IAssetQuery } from './interfaces';

export class AssetQuery extends BaseQuery implements IAssetQuery {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase);
  }

  async getAll(userId: string): Promise<Asset[]> {
    const { data, error } = await this.client
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Asset[]) || [];
  }

  async create(userId: string, input: AssetInput): Promise<Asset> {
    const { data, error } = await this.client
      .from('assets')
      .insert({
        user_id: userId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Asset;
  }

  async update(assetId: string, userId: string, updates: Partial<AssetInput>): Promise<Asset> {
    const { data, error } = await this.client
      .from('assets')
      .update(updates)
      .eq('id', assetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Asset;
  }

  async delete(assetId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
