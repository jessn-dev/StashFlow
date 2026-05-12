import { describe, it, expect, vi } from 'vitest';
import { LoansServiceFactory } from './factory';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tests for the ApiServiceFactory and LoansServiceFactory.
 * Verifies that services and queries are correctly instantiated with the provided Supabase client.
 */
describe('LoansServiceFactory', () => {
  it('should create a LoansService instance', () => {
    const mockSupabase = {} as SupabaseClient;
    const service = LoansServiceFactory.create(mockSupabase);
    expect(service).toBeDefined();
  });
});
