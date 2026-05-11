import { describe, it, expect, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@stashflow/db/server';
import { cookies } from 'next/headers';

vi.mock('@stashflow/db/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

describe('Supabase Server Client', () => {
  it('should create a server client', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    await createClient();
    expect(createServerClient).toHaveBeenCalled();
  });
});
