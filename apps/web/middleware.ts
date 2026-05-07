import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must be called to keep JWT alive
  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard — redirect to login if unauthenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from login/landing to dashboard
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

// Scoped to protected routes only — not static assets, not all public pages
// Prior proxy.ts used a broad matcher (everything except _next/static) — caused auth refresh
// on every request including fonts, images, and API routes (amplification)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/',
    '/auth/callback',
    '/auth/signout',
    '/auth/update-password',
  ],
};
