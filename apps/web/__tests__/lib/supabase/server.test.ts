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

  it('should provide set and remove handlers to createServerClient', async () => {
    let handlers: any = null;
    (createServerClient as any).mockImplementation((_u: string, _k: string, config: any) => {
      handlers = config;
      return {};
    });

    const mockCookieStore = {
       get: vi.fn().mockReturnValue({ value: 'val' }),
       set: vi.fn(),
    };
    (cookies as any).mockResolvedValue(mockCookieStore);

    await createClient();
    expect(handlers.get).toBeDefined();
    expect(handlers.set).toBeDefined();
    expect(handlers.remove).toBeDefined();

    // Call them to cover the lines
    handlers.get('test');
    handlers.set('name', 'val', {});
    handlers.remove('name', {});

    expect(mockCookieStore.get).toHaveBeenCalledWith('test');
    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
  });
});
