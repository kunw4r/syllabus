import { NextRequest, NextResponse } from 'next/server';
import { SCENARIO_SUGGESTIONS } from '@/lib/constants';

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

  // 1. Match scenario phrases
  const matchedScenarios = SCENARIO_PHRASES
    .filter((s) => s.phrase.includes(q) || q.split(' ').some((w) => s.phrase.includes(w)))
    .slice(0, 4);

  for (const s of matchedScenarios) {
    suggestions.push({ text: s.phrase, type: 'scenario', icon: s.icon });
  }

  // 2. Search content_metadata titles (if service role is available)
  try {
    const { createServiceSupabase } = await import('@/lib/supabase/service');
    const supabase = createServiceSupabase();

    const { data } = await supabase
      .from('content_metadata')
      .select('title, media_type, poster_path')
      .ilike('title', `%${q}%`)
      .order('popularity', { ascending: false })
      .limit(4);

    if (data) {
      for (const item of data) {
        suggestions.push({
          text: item.title,
          type: 'content',
          poster: item.poster_path || undefined,
        });
      }
    }
  } catch {
    // Service role not available — just use scenario suggestions
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 8),
  });
}
