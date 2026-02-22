import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  try {
    // Get all distinct users who have library items
    const { data: users, error: usersError } = await supabase
      .from('library')
      .select('user_id')
      .limit(1000);

    if (usersError) throw usersError;

    const uniqueUserIds = [...new Set((users || []).map((u: any) => u.user_id))];
    let processed = 0;

    for (const userId of uniqueUserIds) {
      // Fetch user's library
      const { data: items, error: libError } = await supabase
        .from('library')
        .select('media_type, genres, user_rating, external_rating, status')
        .eq('user_id', userId);

      if (libError || !items || items.length === 0) continue;

      // Compute top genres
      const genreCounts: Record<string, number> = {};
      let totalRating = 0;
      let ratedCount = 0;
      const mediaTypeCounts: Record<string, number> = {};

      for (const item of items) {
        // Count media types
        const mt = item.media_type || 'movie';
        mediaTypeCounts[mt] = (mediaTypeCounts[mt] || 0) + 1;

        // Count genres (stored as comma-separated string)
        if (item.genres) {
          const genreList = typeof item.genres === 'string'
            ? item.genres.split(',').map((g: string) => g.trim())
            : [];
          for (const g of genreList) {
            if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
          }
        }

        // Average rating
        const rating = item.user_rating || item.external_rating;
        if (rating) {
          totalRating += Number(rating);
          ratedCount++;
        }
      }

      // Sort genres by count, take top 5
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

      const avgRating = ratedCount > 0 ? totalRating / ratedCount : 0;

      // Compute taste embedding: average embeddings of top-rated items
      let tasteEmbedding = null;
      const topRated = items
        .filter((i: any) => i.status === 'finished' && (i.user_rating || i.external_rating))
        .sort((a: any, b: any) =>
          (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0)
        )
        .slice(0, 10);

      if (topRated.length > 0) {
        // Get embeddings for these items from content_metadata
        const { data: embeddedItems } = await supabase
          .from('content_metadata')
          .select('embedding')
          .in('title', topRated.map((i: any) => i.title || '').filter(Boolean));

        if (embeddedItems && embeddedItems.length > 0) {
          const validEmbeddings = embeddedItems
            .filter((e: any) => e.embedding)
            .map((e: any) => {
              const emb = typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding;
              return emb as number[];
            });

          if (validEmbeddings.length > 0) {
            const dim = validEmbeddings[0].length;
            const avg = new Array(dim).fill(0);
            for (const emb of validEmbeddings) {
              for (let i = 0; i < dim; i++) avg[i] += emb[i];
            }
            for (let i = 0; i < dim; i++) avg[i] /= validEmbeddings.length;
            tasteEmbedding = JSON.stringify(avg);
          }
        }
      }

      // Upsert preferences
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          top_genres: topGenres,
          avg_rating: Math.round(avgRating * 10) / 10,
          media_type_split: mediaTypeCounts,
          taste_embedding: tasteEmbedding,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (!upsertError) processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      total_users: uniqueUserIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Compute failed' }, { status: 500 });
  }
}
