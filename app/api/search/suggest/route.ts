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

  // 2. Search content — try Supabase first, fall back to TMDB
  let contentResults: { text: string; type: 'content'; poster?: string }[] = [];

  try {
    const { createServiceSupabase } = await import('@/lib/supabase/service');
    const supabase = createServiceSupabase();

    // Try exact ilike first
    const { data } = await supabase
      .from('content_metadata')
      .select('title, media_type, poster_path')
      .ilike('title', `%${q}%`)
      .order('popularity', { ascending: false })
      .limit(4);

    if (data && data.length > 0) {
      contentResults = data.map((item) => ({
        text: item.title,
        type: 'content' as const,
        poster: item.poster_path || undefined,
      }));
    }
  } catch {
    // Service role not available
  }

  // If Supabase returned nothing (likely a typo), ask TMDB which handles fuzzy queries
  if (contentResults.length === 0) {
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
            .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, 4);

          contentResults = items.map((item: any) => ({
            text: item.title || item.name,
            type: 'content' as const,
            poster: item.poster_path || undefined,
          }));
        }
      }
    } catch {
      // TMDB fallback failed — continue without content suggestions
    }
  }

  for (const c of contentResults) {
    suggestions.push(c);
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 8),
  });
}
