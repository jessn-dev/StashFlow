import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Polyfill for __dirname in Edge Runtime
if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = '/';
}

export async function proxy(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

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
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Skip auth logic for static assets and public routes
    const isStatic = 
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.includes('/public/') ||
      request.nextUrl.pathname.includes('/fonts/') ||
      request.nextUrl.pathname.includes('/favicon.ico') ||
      request.nextUrl.pathname.includes('.svg') ||
      request.nextUrl.pathname.includes('.png');

    if (isStatic) {
      return supabaseResponse;
    }

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
  } catch (e) {
    console.error('Middleware execution failed:', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
