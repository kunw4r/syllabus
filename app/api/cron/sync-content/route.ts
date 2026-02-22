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

function extractGenreNames(genres: { id: number; name: string }[]): string[] {
  return (genres || []).map((g) => g.name);
}

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
  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: item.title || item.name || 'Unknown',
    overview: item.overview || null,
    genres: extractGenreNames(item.genres || []),
    vote_average: item.vote_average || 0,
    popularity: item.popularity || 0,
    release_year: year ? parseInt(year) : null,
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    updated_at: new Date().toISOString(),
  };
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

function genreIdsToNames(ids: number[]): string[] {
  return (ids || []).map((id) => GENRE_MAP[id] || `Genre ${id}`);
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

  const step = parseInt(request.nextUrl.searchParams.get('step') || '1');

  try {
    let upserted = 0;

    if (step >= 1 && step <= 4) {
      // Steps 1-4: Fetch and upsert content
      const endpoints: [string, 'movie' | 'tv'][] = [
        ['/trending/movie/week', 'movie'],
        ['/trending/tv/week', 'tv'],
        ['/movie/popular', 'movie'],
        ['/tv/popular', 'tv'],
      ];

      const [endpoint, mediaType] = endpoints[step - 1];
      const data = await tmdbFetch(endpoint);
      const items: TMDBItem[] = data.results || [];

      const rows = items.map((item) => {
        const row = toContentRow(item, mediaType);
        // If we only have genre_ids (not full genres objects), convert them
        if ((!item.genres || item.genres.length === 0) && item.genre_ids?.length) {
          row.genres = genreIdsToNames(item.genre_ids);
        }
        return row;
      });

      if (rows.length > 0) {
        const { error } = await supabase
          .from('content_metadata')
          .upsert(rows, { onConflict: 'tmdb_id,media_type' });

        if (error) throw error;
        upserted = rows.length;
      }
    } else if (step === 5) {
      // Step 5: Generate embeddings for unembedded items
      const { data: items, error } = await supabase
        .from('content_metadata')
        .select('tmdb_id, media_type, title, overview, genres, director, cast_names')
        .is('embedding', null)
        .limit(20);

      if (error) throw error;

      if (items && items.length > 0) {
        const texts = items.map((item: any) => buildContentText(item));
        const embeddings = await generateEmbeddings(texts);

        for (let i = 0; i < items.length; i++) {
          if (embeddings[i]) {
            await supabase
              .from('content_metadata')
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq('tmdb_id', items[i].tmdb_id)
              .eq('media_type', items[i].media_type);
            upserted++;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      step,
      upserted,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
