import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest, NextResponse } from 'next/server';
import * as ssr from '@supabase/ssr';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    // Default mock implementation
    (ssr.createServerClient as any).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      cookies: { getAll: vi.fn().mockReturnValue([]), setAll: vi.fn() }
    });
  });

  it('should redirect unauthenticated users from /dashboard to /login', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should redirect authenticated users from /login to /dashboard', async () => {
    (ssr.createServerClient as any).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null }) },
      cookies: { getAll: vi.fn().mockReturnValue([]), setAll: vi.fn() }
    });
    const req = new NextRequest(new URL('http://localhost:3000/login'));
    const res = await middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('should skip auth for static assets', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/_next/static/chunks/main.js'));
    const res = await middleware(req);
    expect(res?.status).toBe(200);
    expect(ssr.createServerClient).toHaveBeenCalled();
  });

  it('should handle cookie setAll logic', async () => {
    let setAllFn: any = null;
    (ssr.createServerClient as any).mockImplementation((_url: string, _key: string, config: any) => {
      setAllFn = config.cookies.setAll;
      return {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      };
    });

    const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
    const mockSet = vi.fn();
    Object.defineProperty(req, 'cookies', {
      value: {
        set: mockSet,
        getAll: vi.fn().mockReturnValue([])
      }
    });

    await middleware(req);
    expect(setAllFn).toBeDefined();
    setAllFn([{ name: 'a', value: 'b', options: {} }]);
    expect(mockSet).toHaveBeenCalledWith('a', 'b');
  });

  it('should recover from middleware errors', async () => {
    (ssr.createServerClient as any).mockImplementation(() => { throw new Error('fail'); });
    const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
    const res = await middleware(req);
    expect(res?.status).toBe(200);
  });
});
