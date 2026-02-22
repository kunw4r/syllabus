import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { query, parsedIntent, resultCount, clickedResultId } = await request.json();

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true }); // silently skip for anon users
    }

    await supabase.from('search_queries').insert({
      user_id: user.id,
      raw_query: query,
      parsed_intent: parsedIntent || null,
      result_count: resultCount || 0,
      clicked_result_id: clickedResultId || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // fire-and-forget, always succeed
  }
}
