import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user) {
      const { user } = session;
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
