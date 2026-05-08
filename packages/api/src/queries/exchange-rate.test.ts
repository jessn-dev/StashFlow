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
});
