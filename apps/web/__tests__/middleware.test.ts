import { describe, it, expect, vi } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    cookies: {
      getAll: vi.fn().mockReturnValue([]),
      setAll: vi.fn(),
    },
  })),
}));

describe('Middleware', () => {
  const supabaseUrl = 'https://xyz.supabase.co';
  const supabaseKey = 'anon-key';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseKey;
    vi.clearAllMocks();
  });

  it('should redirect unauthenticated users from /dashboard to /login', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
    const res = await middleware(req);
    
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('should allow public routes', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/terms'));
    const res = await middleware(req);
    
    expect(res?.status).toBe(200);
    expect(res?.headers.get('location')).toBeNull();
  });

  it('should skip auth for static assets', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/_next/static/chunks/main.js'));
    const res = await middleware(req);
    
    expect(res?.status).toBe(200);
  });
});
