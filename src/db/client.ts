'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Singleton Supabase client for use in Client Components / hooks. */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project credentials.',
    );
  }

  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
