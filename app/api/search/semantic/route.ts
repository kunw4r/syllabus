import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/service';
import { generateEmbedding } from '@/lib/services/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { query, mediaType, limit = 20 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    // Generate embedding for query
    const embedding = await generateEmbedding(query);
    if (!embedding) {
      return NextResponse.json({ results: [], message: 'Embedding generation unavailable' });
    }

    let supabase;
    try {
      supabase = createServiceSupabase();
    } catch {
      return NextResponse.json({ results: [], message: 'Service role not configured' });
    }

    // Call the match function
    const { data, error } = await supabase.rpc('match_content_by_embedding', {
      query_embedding: JSON.stringify(embedding),
      match_count: Math.min(limit, 50),
      filter_type: mediaType || null,
    });

    if (error) {
      return NextResponse.json({ results: [], error: error.message });
    }

    return NextResponse.json({ results: data || [] });
  } catch (err: any) {
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}
