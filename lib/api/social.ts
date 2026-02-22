import { createClient } from '@/lib/supabase/client';
import { getMoviesByGenre } from '@/lib/api/tmdb';
import { getLibrary } from '@/lib/api/library';

// ─── Avatar Presets ───

export const AVATAR_PRESETS: Record<string, string[]> = {
  'Adventurer': [
    'Neo', 'Trinity', 'Ripley', 'Goku', 'Totoro', 'Yoda',
    'Athena', 'Zephyr', 'Cosmo', 'Pixel', 'Blaze', 'Orbit',
  ].map(s => `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}`),
  'Portraits': [
    'Sora', 'Luna', 'Kai', 'Ember', 'Storm', 'Phoenix',
    'Aurora', 'Vesper', 'Cleo', 'Nyx', 'Zenith', 'Opal',
  ].map(s => `https://api.dicebear.com/9.x/lorelei/svg?seed=${s}`),
  'Personas': [
    'Hero', 'Villain', 'Sage', 'Rebel', 'Ghost', 'Ninja',
    'Druid', 'Rogue', 'Titan', 'Oracle', 'Drift', 'Hex',
  ].map(s => `https://api.dicebear.com/9.x/personas/svg?seed=${s}`),
  'Minimal': [
    'Ace', 'Maverick', 'Raven', 'Atlas', 'Echo', 'Cipher',
    'Nova', 'Flux', 'Prism', 'Quasar', 'Onyx', 'Aero',
  ].map(s => `https://api.dicebear.com/9.x/notionists/svg?seed=${s}`),
  'Pixel Art': [
    'Mario', 'Zelda', 'Link', 'Samus', 'Kirby', 'Fox',
    'Pikachu', 'Cloud', 'Sonic', 'Megaman', 'Pac', 'Snake',
  ].map(s => `https://api.dicebear.com/9.x/pixel-art/svg?seed=${s}`),
  'Big Smile': [
    'Joy', 'Sunny', 'Breeze', 'Coral', 'Daisy', 'Mint',
    'Fern', 'Copper', 'Sienna', 'Jade', 'Willow', 'Ivy',
  ].map(s => `https://api.dicebear.com/9.x/big-smile/svg?seed=${s}`),
  'Fun Emoji': [
    'Happy', 'Cool', 'Chill', 'Zen', 'Fire', 'Sparkle',
    'Wave', 'Star', 'Moon', 'Rain', 'Snow', 'Thunder',
  ].map(s => `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${s}`),
  'Thumbs': [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot',
    'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima',
  ].map(s => `https://api.dicebear.com/9.x/thumbs/svg?seed=${s}`),
  'Bottts': [
    'Robo1', 'Mech', 'Droid', 'Bolt', 'Gear', 'Chip',
    'Wire', 'Core', 'Node', 'Byte', 'Data', 'Grid',
  ].map(s => `https://api.dicebear.com/9.x/bottts/svg?seed=${s}`),
  'Shapes': [
    'Ruby', 'Emerald', 'Sapphire', 'Diamond', 'Topaz', 'Amethyst',
    'Pearl', 'Garnet', 'Citrine', 'Peridot', 'Tanzanite', 'Aqua',
  ].map(s => `https://api.dicebear.com/9.x/shapes/svg?seed=${s}`),
};

// ─── Profiles ───

export async function getProfile(userId: string): Promise<Record<string, any> | null> {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

export async function getMyProfile(): Promise<Record<string, any> | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return data;

  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Auto-create profile failed:', error);
    return null;
  }
  return created;
}

export async function updateProfile(updates: Record<string, any>): Promise<Record<string, any>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Search ───

export async function searchUsers(query: string): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);

  return (data || []).filter((p: any) => p.id !== user?.id);
}

// ─── Follows ───

export async function followUser(followingId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: followingId });
  if (error) throw error;

  const target = await getProfile(followingId);
  await logActivity({
    action: 'followed',
    title: target?.username || 'someone',
  });
}

export async function unfollowUser(followingId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getFollowing(userId: string): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);

  return (data || []).map((d: any) => d.profiles).filter(Boolean);
}

export async function getFollowers(userId: string): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);

  return (data || []).map((d: any) => d.profiles).filter(Boolean);
}

export async function isFollowing(followingId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle();

  return !!data;
}

// ─── Activity ───

export async function logActivity(entry: Record<string, any>): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity').insert({ user_id: user.id, ...entry }).select();
}

export async function getFriendActivity(limit = 50): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (follows || []).map((f: any) => f.following_id);
  if (followingIds.length === 0) return [];

  const { data } = await supabase
    .from('activity')
    .select('*, profiles!activity_user_id_fkey(username, avatar_url)')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getMyActivity(limit = 20): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('activity')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

// ─── Blend ───

interface BlendResult {
  shared: Record<string, any>[];
  sharedGenres: { genre: string; overlap: number }[];
  compatibility: number;
  blendRecs: Record<string, any>[];
  myCount: number;
  friendCount: number;
}

export async function getBlend(friendId: string): Promise<BlendResult | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [myLib, friendLib] = await Promise.all([
    supabase.from('library').select('*').eq('user_id', user.id).then(r => r.data || []),
    supabase.from('library').select('*').eq('user_id', friendId).then(r => r.data || []),
  ]);

  const myIds = new Set(
    myLib.map((i: any) => i.tmdb_id || i.openlibrary_key).filter(Boolean),
  );
  const shared = friendLib.filter((i: any) => myIds.has(i.tmdb_id || i.openlibrary_key));

  const myGenres: Record<string, number> = {};
  myLib.forEach((i: any) =>
    (i.genres || '').split(',').forEach((g: string) => {
      const t = g.trim();
      if (t) myGenres[t] = (myGenres[t] || 0) + 1;
    }),
  );

  const friendGenres: Record<string, number> = {};
  friendLib.forEach((i: any) =>
    (i.genres || '').split(',').forEach((g: string) => {
      const t = g.trim();
      if (t) friendGenres[t] = (friendGenres[t] || 0) + 1;
    }),
  );

  const sharedGenres = Object.keys(myGenres)
    .filter(g => friendGenres[g])
    .map(g => ({ genre: g, overlap: Math.min(myGenres[g], friendGenres[g]) }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5);

  const totalPossible = Math.max(myLib.length, friendLib.length, 1);
  const compatibility = Math.min(
    100,
    Math.round((shared.length / totalPossible) * 100 + sharedGenres.length * 5),
  );

  let blendRecs: Record<string, any>[] = [];
  if (sharedGenres.length > 0) {
    const topGenre = sharedGenres[0].genre;
    const genreMap: Record<string, number> = {
      'Action': 28,
      'Comedy': 35,
      'Drama': 18,
      'Horror': 27,
      'Romance': 10749,
      'Thriller': 53,
      'Sci-Fi': 878,
      'Animation': 16,
      'Crime': 80,
      'Documentary': 99,
      'Adventure': 12,
      'Fantasy': 14,
      'Mystery': 9648,
      'Science Fiction': 878,
    };
    const genreId = genreMap[topGenre];
    if (genreId) {
      const recs = await getMoviesByGenre(genreId);
      const bothIds = new Set(
        [...myLib, ...friendLib].map((i: any) => i.tmdb_id).filter(Boolean),
      );
      blendRecs = recs.filter((r: any) => !bothIds.has(r.id)).slice(0, 10);
    }
  }

  return {
    shared,
    sharedGenres,
    compatibility,
    blendRecs,
    myCount: myLib.length,
    friendCount: friendLib.length,
  };
}

// ─── Discover Weekly ───

export async function getDiscoverWeekly(): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const library = await getLibrary();
  if (library.length < 3) return [];

  const seeds = [...library]
    .sort(
      (a: any, b: any) =>
        (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0),
    )
    .slice(0, 5)
    .filter((i: any) => i.tmdb_id);

  if (seeds.length === 0) return [];

  const allRecs = await Promise.all(
    seeds.map(async (seed: any) => {
      try {
        const mt = seed.media_type === 'tv' ? 'tv' : 'movie';
        const res = await fetch(`/api/tmdb/${mt}/${seed.tmdb_id}/recommendations`);
        const data = await res.json();
        return (data.results || []).map((r: any) => ({ ...r, media_type: mt }));
      } catch {
        return [];
      }
    }),
  );

  const libIds = new Set(library.map((i: any) => String(i.tmdb_id)));
  const seen = new Set<string>();
  const unique = allRecs.flat().filter((r: any) => {
    const key = `${r.media_type}-${r.id}`;
    if (seen.has(key) || libIds.has(String(r.id))) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
  return unique.slice(0, 20);
}

// ─── Friend Library ───

export async function getFriendLibrary(userId: string): Promise<Record<string, any>[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('library')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  return data || [];
}
