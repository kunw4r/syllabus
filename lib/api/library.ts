import { createClient } from '@/lib/supabase/client';

// ─── Types ───

interface LibraryFilters {
  media_type?: string;
  status?: string;
}

interface MediaIdLookup {
  tmdb_id?: number | string;
  openlibrary_key?: string;
}

// ─── Helpers ───

async function getAuthenticatedUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  return { supabase, user };
}

// ─── Library CRUD ───

export async function getLibrary(filters: LibraryFilters = {}) {
  const { supabase, user } = await getAuthenticatedUser();

  let query = supabase
    .from('library')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (filters.media_type) query = query.eq('media_type', filters.media_type);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addToLibrary(item: Record<string, unknown>) {
  const { supabase, user } = await getAuthenticatedUser();

  // Duplicate check
  let dupeQuery = supabase
    .from('library')
    .select('id')
    .eq('user_id', user.id);

  if (item.tmdb_id) {
    dupeQuery = dupeQuery.eq('tmdb_id', item.tmdb_id as number);
  } else if (item.openlibrary_key) {
    dupeQuery = dupeQuery.eq('openlibrary_key', item.openlibrary_key as string);
  }

  const { data: existing } = await dupeQuery;
  if (existing && existing.length > 0) throw new Error('Already in your library');

  const { data, error } = await supabase
    .from('library')
    .insert({
      user_id: user.id,
      status: 'watching',
      ...item,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLibraryItem(
  id: string,
  updates: Record<string, unknown>,
) {
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message || 'Update failed');
  if (!data) throw new Error('Item not found — it may have been removed');
  return data;
}

export async function removeFromLibrary(id: string) {
  const { supabase, user } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('library')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getLibraryItemByMediaId({
  tmdb_id,
  openlibrary_key,
}: MediaIdLookup) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from('library')
    .select('*')
    .eq('user_id', user.id);

  if (tmdb_id) query = query.eq('tmdb_id', tmdb_id);
  else if (openlibrary_key) query = query.eq('openlibrary_key', openlibrary_key);
  else return null;

  const { data } = await query.maybeSingle();
  return data || null;
}
