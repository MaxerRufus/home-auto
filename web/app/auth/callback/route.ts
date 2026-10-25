import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * OAuth Callback Handler
 *
 * Supabase redirects here after Google OAuth completes with ?code=...
 * We exchange the code for a session, set cookies, then redirect to the dashboard.
 *
 * In Supabase Dashboard → Authentication → URL Configuration:
 *   Redirect URLs must include:  http://localhost:3000/auth/callback
 *                           and: https://home-auto-eta.vercel.app/auth/callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully authenticated — redirect to dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
  }

  // Something went wrong — redirect to login with error flag
  return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
}
