import { BaseQuery } from './base';
import { Profile } from '@stashflow/core';
import { IProfileQuery } from './interfaces';

/**
 * ProfileQuery manages user profile information.
 * It provides methods to fetch and update user-specific settings and personal data.
 */
export class ProfileQuery extends BaseQuery implements IProfileQuery {
  /**
   * Fetches a user profile by its ID.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A promise resolving to the Profile or null if not found.
   * @throws Will throw an error if the database query fails.
   */
  async get(userId: string): Promise<Profile | null> {
    // PSEUDOCODE:
    // 1. Query the 'profiles' table.
    // 2. Filter by the record's ID (which corresponds to the user's ID).
    // 3. Use maybeSingle to return null instead of throwing if the profile doesn't exist yet.
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Updates an existing user profile.
   * 
   * @param userId - The unique identifier of the user.
   * @param updates - Partial profile data to update.
   * @returns A promise resolving to the updated Profile object.
   * @throws Will throw an error if the update fails.
   */
  async update(userId: string, updates: Partial<Profile>): Promise<Profile> {
    // PSEUDOCODE:
    // 1. Target the 'profiles' table for an update.
    // 2. Filter by the user's ID.
    // 3. Return the newly updated profile record.
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
