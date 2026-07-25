import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Server client bound to the incoming request's cookies. Respects RLS and
 * `auth.uid()` for the anonymous session tied to this browser. Use this for
 * anything that should be scoped to "the current player" (e.g. calling the
 * `get_my_game_state` RPC).
 */
export function getSupabaseServerClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const cookieStore = cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll: ((cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render where cookie mutation is
          // not allowed; middleware / route handlers handle the actual set.
        }
      }) satisfies SetAllCookies,
    },
  });
}

/**
 * Service-role client that bypasses Row Level Security entirely. Only ever
 * instantiate this inside server-only code (API route handlers) — never
 * import it from a Client Component, and never leak the key to the browser.
 */
export function getSupabaseServiceRoleClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
