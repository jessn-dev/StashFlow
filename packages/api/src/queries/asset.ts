import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Asset, AssetInput } from '@stashflow/core';
import { BaseQuery } from './base';
import { IAssetQuery } from './interfaces';

/**
 * AssetQuery provides methods to manage user assets in the database.
 * It handles fetching, creating, updating, and deleting asset records.
 */
export class AssetQuery extends BaseQuery implements IAssetQuery {
  /**
   * Initializes the AssetQuery with a Supabase client.
   * 
   * @param supabase - The Supabase client instance.
   */
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase);
  }

  /**
   * Retrieves all assets for a specific user.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise that resolves to an array of Asset objects.
   * @throws Will throw an error if the database query fails.
   */
  async getAll(userId: string): Promise<Asset[]> {
    // PSEUDOCODE:
    // 1. Query the 'assets' table.
    // 2. Filter records by the provided user_id to ensure data isolation.
    // 3. Order the results alphabetically by asset name.
    // 4. Return the data array or an empty array if no records found.
    const { data, error } = await this.client
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Asset[]) || [];
  }

  /**
   * Creates a new asset for a user.
   * 
   * @param userId - The unique identifier of the user.
   * @param input - The asset data to be inserted.
   * @returns A promise that resolves to the newly created Asset object.
   * @throws Will throw an error if the database insertion fails.
   */
  async create(userId: string, input: AssetInput): Promise<Asset> {
    // PSEUDOCODE:
    // 1. Insert a new record into the 'assets' table.
    // 2. Explicitly bind the asset to the current user_id for security.
    // 3. Select and return the inserted record.
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

  /**
   * Updates an existing asset.
   * 
   * @param assetId - The unique identifier of the asset to update.
   * @param userId - The unique identifier of the user (for authorization).
   * @param updates - The partial asset data to update.
   * @returns A promise that resolves to the updated Asset object.
   * @throws Will throw an error if the update fails or if the asset is not found.
   */
  async update(assetId: string, userId: string, updates: Partial<AssetInput>): Promise<Asset> {
    // PSEUDOCODE:
    // 1. Target the 'assets' table for an update operation.
    // 2. Apply filters for both assetId and userId to prevent unauthorized modifications.
    // 3. Return the updated record.
    const { data, error } = await this.client
      .from('assets')
      .update(updates)
      .eq('id', assetId)
      .eq('user_id', userId) // Security: Ensure user owns the asset
      .select()
      .single();

    if (error) throw error;
    return data as Asset;
  }

  /**
   * Deletes an asset.
   * 
   * @param assetId - The unique identifier of the asset to delete.
   * @param userId - The unique identifier of the user (for authorization).
   * @returns A promise that resolves when the deletion is complete.
   * @throws Will throw an error if the deletion fails.
   */
  async delete(assetId: string, userId: string): Promise<void> {
    // PSEUDOCODE:
    // 1. Perform a delete operation on the 'assets' table.
    // 2. Use composite filtering on id and user_id for strict ownership verification.
    const { error } = await this.client
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', userId); // Security: Ensure user owns the asset

    if (error) throw error;
  }
}
