import { describe, it, expect, vi } from 'vitest';
import { ExchangeRateQuery } from './exchange-rate';
import { SupabaseClient } from '@supabase/supabase-js';

describe('ExchangeRateQuery', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ target: 'PHP', rate: 50 }], error: null }),
    }),
  } as unknown as SupabaseClient;

  it('should get latest rates', async () => {
    const query = new ExchangeRateQuery(mockSupabase);
    const result = await query.getLatest();
    expect(result['PHP']).toBe(50);
  });

  it('should return default USD:1 if no rates found', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient;
    const query = new ExchangeRateQuery(mockSupabase);
    const result = await query.getLatest();
    expect(result).toEqual({ USD: 1 });
  });

  it('should throw error if db fails', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'FX Error' } }),
      }),
    } as unknown as SupabaseClient;
    const query = new ExchangeRateQuery(mockSupabase);
    await expect(query.getLatest()).rejects.toThrow('FX Error');
  });
});
