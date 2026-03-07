import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/service';
import { buildContentText, generateEmbeddings } from '@/lib/services/embeddings';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY || '';

async function tmdbFetch(endpoint: string, params = '') {
  const url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}&${params}`;
  const res = await fetch(url);
  return res.json();
}

// Genre ID → Name mapping for items that only have genre_ids
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10768: 'War & Politics',
};

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average?: number;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
}

function toContentRow(item: TMDBItem, mediaType: 'movie' | 'tv') {
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const genres = item.genres?.length
    ? item.genres.map((g) => g.name)
    : (item.genre_ids || []).map((id) => GENRE_MAP[id] || `Genre ${id}`);

  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: item.title || item.name || 'Unknown',
    overview: item.overview || null,
    genres,
    vote_average: item.vote_average || 0,
    popularity: item.popularity || 0,
    release_year: year ? parseInt(year) : null,
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TMDB_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  try {
    // ── Step 1: Fetch all endpoints and collect unique items ──
    const endpoints: [string, 'movie' | 'tv'][] = [
      ['/trending/movie/week', 'movie'],
      ['/trending/tv/week', 'tv'],
      ['/movie/popular', 'movie'],
      ['/tv/popular', 'tv'],
    ];

    const allRows: Map<string, ReturnType<typeof toContentRow>> = new Map();

    for (const [endpoint, mediaType] of endpoints) {
      const data = await tmdbFetch(endpoint);
      const items: TMDBItem[] = data.results || [];
      for (const item of items) {
        const key = `${mediaType}:${item.id}`;
        if (!allRows.has(key)) {
          allRows.set(key, toContentRow(item, mediaType));
        }
      }
    }

    // ── Step 2: Filter out items already synced in the last 24h ──
    const tmdbIds = [...allRows.values()].map((r) => r.tmdb_id);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('content_metadata')
      .select('tmdb_id, media_type')
      .in('tmdb_id', tmdbIds)
      .gte('updated_at', oneDayAgo);

    const recentKeys = new Set(
      (existing || []).map((e: any) => `${e.media_type}:${e.tmdb_id}`)
    );

    const newRows = [...allRows.entries()]
      .filter(([key]) => !recentKeys.has(key))
      .map(([, row]) => row);

    // ── Step 3: Upsert only new/stale items ──
    let upserted = 0;
    if (newRows.length > 0) {
      const { error } = await supabase
        .from('content_metadata')
        .upsert(newRows, { onConflict: 'tmdb_id,media_type' });

      if (error) throw error;
      upserted = newRows.length;
    }

    // ── Step 4: Generate embeddings for unembedded items ──
    let embedded = 0;
    const { data: unembedded, error: embError } = await supabase
      .from('content_metadata')
      .select('tmdb_id, media_type, title, overview, genres, director, cast_names')
      .is('embedding', null)
      .limit(20);

    if (embError) throw embError;

    if (unembedded && unembedded.length > 0) {
      try {
        const texts = unembedded.map((item: any) => buildContentText(item));
        const embeddings = await generateEmbeddings(texts);

        for (let i = 0; i < unembedded.length; i++) {
          if (embeddings[i]) {
            await supabase
              .from('content_metadata')
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq('tmdb_id', unembedded[i].tmdb_id)
              .eq('media_type', unembedded[i].media_type);
            embedded++;
          }
        }
      } catch {
        // Embedding generation is best-effort (may fail if no OpenAI key)
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: allRows.size,
      skipped: allRows.size - upserted,
      upserted,
      embedded,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
