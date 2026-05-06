import { BaseQuery } from './base';
import { Profile } from '@stashflow/core';
import { IProfileQuery } from './interfaces';

export class ProfileQuery extends BaseQuery implements IProfileQuery {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async update(userId: string, updates: Partial<Profile>): Promise<Profile> {
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
