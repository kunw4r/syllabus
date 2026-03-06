import { NextRequest, NextResponse } from 'next/server';
import { SCENARIO_SUGGESTIONS } from '@/lib/constants';
import { fuzzyFilter } from '@/lib/utils/fuzzy';

// In-memory scenario phrases for fast matching
const SCENARIO_PHRASES = SCENARIO_SUGGESTIONS.map((s) => ({
  phrase: s.phrase,
  icon: s.icon,
  type: 'scenario' as const,
}));

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: { text: string; type: 'scenario' | 'content'; icon?: string; poster?: string }[] = [];

  // 1. Fuzzy-match scenario phrases
  const matchedScenarios = fuzzyFilter(
    SCENARIO_PHRASES,
    q,
    (s) => s.phrase,
    0.4,
  ).slice(0, 4);

  for (const s of matchedScenarios) {
    suggestions.push({ text: s.phrase, type: 'scenario', icon: s.icon });
  }

  // 2. Search content — always use TMDB multi-search (handles typos/fuzzy), supplement with Supabase
  let contentResults: { text: string; type: 'content'; poster?: string; year?: string; mediaType?: string; tmdbId?: number }[] = [];

  // TMDB multi-search — always run (handles misspellings well)
  try {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (tmdbKey) {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&page=1&include_adult=false`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (res.ok) {
        const json = await res.json();
        const items = (json.results || [])
          .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person')
          .slice(0, 6);

        contentResults = items.map((item: any) => ({
          text: item.title || item.name,
          type: 'content' as const,
          poster: item.poster_path || item.profile_path || undefined,
          year: (item.release_date || item.first_air_date || '').slice(0, 4) || undefined,
          mediaType: item.media_type,
          tmdbId: item.id,
        }));
      }
    }
  } catch {
    // TMDB failed — try Supabase as fallback
    try {
      const { createServiceSupabase } = await import('@/lib/supabase/service');
      const supabase = createServiceSupabase();
      const { data } = await supabase
        .from('content_metadata')
        .select('title, media_type, poster_path')
        .ilike('title', `%${q}%`)
        .order('popularity', { ascending: false })
        .limit(6);

      if (data && data.length > 0) {
        contentResults = data.map((item) => ({
          text: item.title,
          type: 'content' as const,
          poster: item.poster_path || undefined,
          mediaType: item.media_type,
        }));
      }
    } catch {
      // both failed
    }
  }

  for (const c of contentResults) {
    suggestions.push(c);
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 8),
  });
}
