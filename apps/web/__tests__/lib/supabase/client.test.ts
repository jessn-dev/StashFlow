import { describe, it, expect, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { createBrowserClient } from '@stashflow/db/browser';

vi.mock('@stashflow/db/browser', () => ({
  createBrowserClient: vi.fn(),
}));

describe('Supabase Client', () => {
  it('should create a browser client with env vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    createClient();
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key'
    );
  });
});
