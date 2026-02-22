import { createBrowserClient } from '@supabase/ssr';

// Trim env vars — Vercel dashboard can introduce newlines/spaces in
// pasted values, which produce invalid HTTP headers and cause
// "Failed to execute 'fetch' on 'Window': Invalid value".
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\s+/g, '');
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/\s+/g, '');

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Singleton for client components
let _client: ReturnType<typeof createBrowserClient> | null = null;
export function getClient() {
  if (!_client) _client = createClient();
  return _client;
}
