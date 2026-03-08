import { NextRequest, NextResponse } from 'next/server';
import { searchSources } from '@/lib/api/torrent-sources';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imdbId = searchParams.get('imdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!imdbId || !mediaType) {
    return NextResponse.json({ error: 'Missing imdbId or mediaType' }, { status: 400 });
  }

  const sources = await searchSources(
    imdbId,
    mediaType,
    season ? parseInt(season) : undefined,
    episode ? parseInt(episode) : undefined
  );

  // Sort by seeders descending, prefer 1080p
  sources.sort((a, b) => {
    const qualityOrder: Record<string, number> = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, 'Unknown': 0 };
    const qDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    if (qDiff !== 0) return qDiff;
    return b.seeders - a.seeders;
  });

  return NextResponse.json({ sources });
}
