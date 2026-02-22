import { createBrowserClient } from '@supabase/ssr';

// Clear old/corrupted Supabase cookies before client creation.
// The upgrade from @supabase/ssr v0.5.2 → v0.8.0 changed the cookie
// chunking format. Old chunks produce invalid Authorization headers
// that cause "Failed to execute 'fetch' on 'Window': Invalid value".
function migrateCookies() {
  if (typeof document === 'undefined') return;

  const migrated = localStorage.getItem('__sb_cookie_migrated');
  if (migrated === '2') return; // Already migrated for v0.8.0

  // Delete all Supabase auth cookies (both base + chunks like .0, .1, etc.)
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });

  localStorage.setItem('__sb_cookie_migrated', '2');
}

export function createClient() {
  migrateCookies();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client components
let _client: ReturnType<typeof createBrowserClient> | null = null;
export function getClient() {
  if (!_client) _client = createClient();
  return _client;
}
