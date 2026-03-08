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
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ─── vidsrc-embed.ru extractor (via @definisi/vidsrc-scraper) ───
// Uses: vidsrc-embed.ru → cloudnestra.com RCP → prorcp → m3u8

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
// Parses data-server attribute (base64-encoded iframe URL) to get streameeeeee.site URL
// Then we can potentially extract m3u8 from the Vidcloud player

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

    // Extract data-server base64 attribute
    const serverMatch = html.match(/data-server="([^"]+)"/);
    if (!serverMatch?.[1]) return null;

    const streamUrl = Buffer.from(serverMatch[1], 'base64').toString();
    if (!streamUrl.includes('http')) return null;

    // The streamUrl points to e.g. streameeeeee.site which is a Vidcloud player
    // Fetch that page and look for the source loading mechanism
    const playerRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': `https://player.autoembed.cc${path}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!playerRes.ok) return null;
    const playerHtml = await playerRes.text();

    // Extract the data-id and try to get sources from the Vidcloud API
    const dataIdMatch = playerHtml.match(/data-id="([^"]+)"/);
    const realIdMatch = playerHtml.match(/data-realid="([^"]+)"/);

    if (dataIdMatch?.[1]) {
      const playerHost = new URL(streamUrl).origin;

      // Try the Vidcloud ajax sources endpoint
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
        // Sources typically return encrypted data or direct URLs
        if (sourcesData?.sources?.[0]?.file) {
          return {
            url: sourcesData.sources[0].file,
            format: sourcesData.sources[0].file.includes('.mp4') ? 'mp4' : 'hls',
            provider: 'Autoembed (Vidcloud)',
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

// ─── embed.su extractor ───

async function extractEmbedSu(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string
): Promise<ExtractedStream | null> {
  try {
    const path = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`;

    const res = await fetch(`https://embed.su${path}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/window\.vConfig\s*=\s*JSON\.parse\(atob\(`(.+?)`\)\)/);
    if (!match?.[1]) return null;

    const config = JSON.parse(Buffer.from(match[1], 'base64').toString());
    if (!config.hash) return null;

    const firstDecode = atob(config.hash).split('.').map((item: string) => item.split('').reverse().join(''));
    const servers = JSON.parse(atob(firstDecode.join('').split('').reverse().join('')));

    if (!servers || servers.length === 0) return null;

    for (const server of servers) {
      try {
        const streamRes = await fetch(`https://embed.su/api/e/${server.hash}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!streamRes.ok) continue;
        const data = await streamRes.json();

        if (data.source) {
          return {
            url: data.source,
            format: data.format === 'mp4' ? 'mp4' : 'hls',
            provider: `embed.su (${server.name || 'default'})`,
            subtitles: data.subtitles || [],
            skips: data.skips || undefined,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (err) {
    console.error('[extract] embed.su failed:', err);
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

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
  }

  // Try extractors in parallel — ordered by reliability
  const extractors = [
    { name: 'vidsrc-embed', fn: () => extractVidsrcEmbed(tmdbId, mediaType, season, episode) },
    { name: 'autoembed', fn: () => extractAutoembed(tmdbId, mediaType, season, episode) },
    { name: 'embed.su', fn: () => extractEmbedSu(tmdbId, mediaType, season, episode) },
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
