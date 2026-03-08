import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Provider {
  name: string;
  id: string;
  buildUrl: (opts: { tmdbId: string; mediaType: string; season?: string; episode?: string }) => string;
}

const PROVIDERS: Provider[] = [
  {
    name: 'Server 1',
    id: 'vidsrc-pro',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`,
  },
  {
    name: 'Server 2',
    id: 'embed-su',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`,
  },
  {
    name: 'Server 3',
    id: 'vidsrc-icu',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.icu/embed/movie/${tmdbId}`
        : `https://vidsrc.icu/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`,
  },
  {
    name: 'Server 4',
    id: 'vidsrc-cc',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`,
  },
  {
    name: 'Server 5',
    id: 'superembed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || '1'}&e=${episode || '1'}`,
  },
  {
    name: 'Server 6',
    id: 'autoembed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`,
  },
];

// Check if a provider URL is reachable and returns a valid page
async function checkProvider(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': url,
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) return false;

    // Read a bit of the body to check it's not an error page
    const text = await res.text();

    // Check if it contains video-related content (player scripts, video tags, etc.)
    // and not just a generic error/blank page
    const hasVideoContent = text.includes('<video') ||
      text.includes('player') ||
      text.includes('iframe') ||
      text.includes('source') ||
      text.includes('hls') ||
      text.includes('m3u8') ||
      text.includes('mp4') ||
      text.length > 1000; // Real embed pages are usually substantial

    // Check for common error indicators
    const hasError = text.includes('not found') && text.length < 500 ||
      text.includes('404') && text.length < 500 ||
      text.includes('error') && text.length < 300;

    return hasVideoContent && !hasError;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tmdbId = searchParams.get('tmdbId');
  const mediaType = searchParams.get('mediaType') || 'movie';
  const season = searchParams.get('season') || undefined;
  const episode = searchParams.get('episode') || undefined;

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
  }

  const results: { id: string; name: string; url: string; working: boolean }[] = [];

  // Check all providers in parallel for speed
  const checks = PROVIDERS.map(async (provider) => {
    const url = provider.buildUrl({ tmdbId, mediaType, season, episode });
    const working = await checkProvider(url);
    return { id: provider.id, name: provider.name, url, working };
  });

  const allResults = await Promise.all(checks);

  // Find the first working provider
  const working = allResults.filter(r => r.working);
  const best = working[0] || allResults[0]; // Fallback to first if none confirmed working

  return NextResponse.json({
    provider: best,
    allProviders: allResults,
    checkedAt: Date.now(),
  });
}
