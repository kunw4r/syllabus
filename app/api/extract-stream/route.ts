import { NextRequest, NextResponse } from 'next/server';
import { scrapeVidsrc } from '@definisi/vidsrc-scraper';

export const dynamic = 'force-dynamic';

// ─── Types ───

interface ExtractedStream {
  url: string;
  format: 'hls' | 'mp4';
  provider: string;
  subtitles?: { label: string; file: string; language?: string }[];
  skips?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
  qualities?: Record<string, string>; // e.g. { "1080p": "url", "720p": "url" }
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const XPRIME_BACKEND = 'https://backend.xprime.tv';
const XPRIME_HEADERS = {
  'User-Agent': UA,
  'Origin': 'https://xprime.stream',
  'Referer': 'https://xprime.stream/',
};

// ─── Helper: Parse xprime subtitles ───

function parseSubtitles(data: any): ExtractedStream['subtitles'] {
  if (!data?.subtitles || !Array.isArray(data.subtitles)) return [];
  return data.subtitles.map((s: any) => ({
    label: s.label || s.language || 'English',
    file: s.file || s.url,
    language: s.language || 'en',
  }));
}

// ─── XPrime: Primenet ───
// ?id=<tmdb> → { url: "...m3u8" }

async function extractPrimenet(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    const params = new URLSearchParams({ id: tmdbId });
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/primenet?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.url) {
      return {
        url: data.url,
        format: 'hls',
        provider: 'Primenet',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] primenet failed:', err);
    return null;
  }
}

// ─── XPrime: Primebox ───
// ?name=<title>&year=<year> → { streams: { "1080p": "url", ... }, available_qualities: [...] }

async function extractPrimebox(
  mediaType: string,
  title?: string,
  year?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    if (!title) return null;
    const params = new URLSearchParams({ name: title });
    if (year) {
      params.set('year', year);
      params.set('fallback_year', year);
    }
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/primebox?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const streams = data?.streams;
    const qualities = data?.available_qualities || [];

    if (streams && qualities.length > 0) {
      const bestQuality = qualities[0];
      const bestUrl = streams[bestQuality];
      if (!bestUrl) return null;

      return {
        url: bestUrl,
        format: 'mp4',
        provider: 'Primebox',
        qualities: streams,
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] primebox failed:', err);
    return null;
  }
}

// ─── XPrime: Fox ───
// ?name=<title>&pstream=true → { url: "...m3u8" }

async function extractFox(
  mediaType: string,
  title?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    if (!title) return null;
    const params = new URLSearchParams({ name: title, pstream: 'true' });
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/fox?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.url) {
      return {
        url: data.url,
        format: 'hls',
        provider: 'Fox',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] fox failed:', err);
    return null;
  }
}

// ─── XPrime: Phoenix ───
// ?id=<tmdb>&imdb=<imdb> → { url: "...m3u8" }

async function extractPhoenix(
  tmdbId: string,
  imdbId?: string,
  mediaType?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    const params = new URLSearchParams({ id: tmdbId });
    if (imdbId) params.set('imdb', imdbId);
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/phoenix?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.url) {
      return {
        url: data.url,
        format: 'hls',
        provider: 'Phoenix',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] phoenix failed:', err);
    return null;
  }
}

// ─── XPrime: Harbour ───
// ?name=<title>&year=<year> → { url: "...m3u8" }

async function extractHarbour(
  mediaType: string,
  title?: string,
  year?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    if (!title) return null;
    const params = new URLSearchParams({ name: title });
    if (year) params.set('year', year);
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/harbour?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.url) {
      return {
        url: data.url,
        format: 'hls',
        provider: 'Harbour',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] harbour failed:', err);
    return null;
  }
}

// ─── XPrime: Marant ───
// ?id=<tmdb> → { url: "...m3u8" }

async function extractMarant(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    const params = new URLSearchParams({ id: tmdbId });
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/marant?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.url) {
      return {
        url: data.url,
        format: 'hls',
        provider: 'Marant',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] marant failed:', err);
    return null;
  }
}

// ─── XPrime: Volkswagen ───
// ?name=<title>&year=<year> → { streams: { "1080p": "url", ... } } or { url: "..." }

async function extractVolkswagen(
  mediaType: string,
  title?: string,
  year?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    if (!title) return null;
    const params = new URLSearchParams({ name: title });
    if (year) params.set('year', year);
    if (mediaType === 'tv') {
      params.set('season', season || '1');
      params.set('episode', episode || '1');
    }

    const res = await fetch(`${XPRIME_BACKEND}/volkswagen?${params}`, {
      headers: XPRIME_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const streams = data?.streams;
    const qualities = data?.available_qualities || [];

    if (streams && qualities.length > 0) {
      const bestQuality = qualities[0];
      const bestUrl = streams[bestQuality];
      if (!bestUrl) return null;

      return {
        url: bestUrl,
        format: 'mp4',
        provider: 'Volkswagen',
        qualities: streams,
        subtitles: parseSubtitles(data),
      };
    }
    if (data?.url) {
      return {
        url: data.url,
        format: data.url.includes('.mp4') ? 'mp4' : 'hls',
        provider: 'Volkswagen',
        subtitles: parseSubtitles(data),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] volkswagen failed:', err);
    return null;
  }
}

// ─── vidsrc-embed.ru extractor (via @definisi/vidsrc-scraper) ───

async function extractVidsrcEmbed(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string
): Promise<ExtractedStream | null> {
  try {
    const result = await scrapeVidsrc(
      tmdbId,
      mediaType === 'movie' ? 'movie' : 'tv',
      mediaType === 'tv' ? (season || '1') : null,
      mediaType === 'tv' ? (episode || '1') : null,
      { timeout: 15000 }
    );

    if (result.success && result.hlsUrl) {
      return {
        url: result.hlsUrl,
        format: 'hls',
        provider: 'VidSrc',
        subtitles: (result.subtitles || []).map((url: string, i: number) => ({
          label: `Subtitle ${i + 1}`,
          file: url,
          language: 'en',
        })),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] vidsrc-embed failed:', err);
    return null;
  }
}

// ─── autoembed.cc extractor ───

async function extractAutoembed(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string
): Promise<ExtractedStream | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`;

    const res = await fetch(`https://player.autoembed.cc${path}`, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const serverMatch = html.match(/data-server="([^"]+)"/);
    if (!serverMatch?.[1]) return null;

    const streamUrl = Buffer.from(serverMatch[1], 'base64').toString();
    if (!streamUrl.includes('http')) return null;

    const playerRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': `https://player.autoembed.cc${path}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!playerRes.ok) return null;
    const playerHtml = await playerRes.text();

    const dataIdMatch = playerHtml.match(/data-id="([^"]+)"/);

    if (dataIdMatch?.[1]) {
      const playerHost = new URL(streamUrl).origin;
      const sourcesUrl = `${playerHost}/ajax/embed/episode/${dataIdMatch[1]}/sources`;
      const sourcesRes = await fetch(sourcesUrl, {
        headers: {
          'User-Agent': UA,
          'Referer': streamUrl,
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        if (sourcesData?.sources?.[0]?.file) {
          return {
            url: sourcesData.sources[0].file,
            format: sourcesData.sources[0].file.includes('.mp4') ? 'mp4' : 'hls',
            provider: 'Autoembed',
            subtitles: (sourcesData.tracks || [])
              .filter((t: any) => t.kind === 'captions')
              .map((t: any) => ({
                label: t.label || 'Unknown',
                file: t.file,
                language: t.label?.toLowerCase()?.slice(0, 2) || 'en',
              })),
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('[extract] autoembed failed:', err);
    return null;
  }
}

// ─── Main handler ───

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tmdbId = searchParams.get('tmdbId');
  const mediaType = searchParams.get('mediaType') || 'movie';
  const season = searchParams.get('season') || undefined;
  const episode = searchParams.get('episode') || undefined;
  const title = searchParams.get('title') || undefined;
  const year = searchParams.get('year') || undefined;
  const imdbId = searchParams.get('imdbId') || undefined;

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
  }

  // All extractors in parallel — xprime sources first
  const extractors = [
    { name: 'primenet', fn: () => extractPrimenet(tmdbId, mediaType, season, episode) },
    { name: 'primebox', fn: () => extractPrimebox(mediaType, title, year, season, episode) },
    { name: 'fox', fn: () => extractFox(mediaType, title, season, episode) },
    { name: 'phoenix', fn: () => extractPhoenix(tmdbId, imdbId, mediaType, season, episode) },
    { name: 'harbour', fn: () => extractHarbour(mediaType, title, year, season, episode) },
    { name: 'marant', fn: () => extractMarant(tmdbId, mediaType, season, episode) },
    { name: 'volkswagen', fn: () => extractVolkswagen(mediaType, title, year, season, episode) },
    { name: 'vidsrc', fn: () => extractVidsrcEmbed(tmdbId, mediaType, season, episode) },
    { name: 'autoembed', fn: () => extractAutoembed(tmdbId, mediaType, season, episode) },
  ];

  const results = await Promise.allSettled(
    extractors.map(async (ext) => {
      const result = await ext.fn();
      return result ? { ...result, extractor: ext.name } : null;
    })
  );

  const streams: ExtractedStream[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      streams.push(result.value);
    }
  }

  console.log(`[extract-stream] ${tmdbId} (${mediaType}): ${streams.length} sources found — ${streams.map(s => s.provider).join(', ')}`);

  if (streams.length > 0) {
    return NextResponse.json({
      stream: streams[0],
      allStreams: streams,
      extracted: true,
    });
  }

  return NextResponse.json({
    stream: null,
    allStreams: [],
    extracted: false,
  });
}
