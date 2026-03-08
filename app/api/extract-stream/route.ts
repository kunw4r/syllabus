import { NextRequest, NextResponse } from 'next/server';
import {
  makeProviders,
  makeStandardFetcher,
  targets,
} from '@movie-web/providers';
import { scrapeVidsrc } from '@definisi/vidsrc-scraper';

export const dynamic = 'force-dynamic';

// ─── Types ───

interface ExtractedStream {
  url: string;
  format: 'hls' | 'mp4';
  provider: string;
  subtitles?: { label: string; file: string; language?: string }[];
  qualities?: Record<string, string>;
  headers?: Record<string, string>;
}

// ─── Custom fetcher for Next.js compatibility ───

function makeCompatFetcher(f: typeof globalThis.fetch) {
  const compatFetch = (input: any, init?: any) => {
    if (init?.signal) {
      const { signal, ...rest } = init;
      return f(input, rest);
    }
    return f(input, init);
  };
  return makeStandardFetcher(compatFetch as typeof globalThis.fetch);
}

const movieWebProviders = makeProviders({
  fetcher: makeCompatFetcher(fetch),
  target: targets.NATIVE,
});

// ─── VidSrc extractor (proven working) ───

async function extractVidsrc(
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
    console.error('[extract] vidsrc failed:', err);
    return null;
  }
}

// ─── movie-web/providers extractor ───

async function extractMovieWeb(
  tmdbId: string,
  mediaType: string,
  title?: string,
  year?: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream[]> {
  const results: ExtractedStream[] = [];
  try {
    const media = mediaType === 'movie'
      ? {
          type: 'movie' as const,
          title: title || 'Unknown',
          releaseYear: year ? parseInt(year) : 2000,
          tmdbId,
        }
      : {
          type: 'show' as const,
          title: title || 'Unknown',
          releaseYear: year ? parseInt(year) : 2000,
          tmdbId,
          season: { number: parseInt(season || '1'), tmdbId: `${tmdbId}-s${season || '1'}` },
          episode: { number: parseInt(episode || '1'), tmdbId: `${tmdbId}-s${season || '1'}e${episode || '1'}` },
        };

    const output = await movieWebProviders.runAll({ media });

    if (output) {
      const stream = output.stream;
      const providerName = output.sourceId + (output.embedId ? ` (${output.embedId})` : '');

      if (stream.type === 'hls') {
        results.push({
          url: stream.playlist,
          format: 'hls',
          provider: providerName,
          subtitles: (stream.captions || []).map(cap => ({
            label: cap.language,
            file: cap.url,
            language: cap.language,
          })),
          headers: stream.headers,
        });
      } else if (stream.type === 'file') {
        const qualities: Record<string, string> = {};
        const qualityOrder = ['4k', '1080', '720', '480', '360', 'unknown'] as const;
        let bestUrl = '';
        for (const q of qualityOrder) {
          const qData = stream.qualities[q];
          if (qData?.url) {
            qualities[q] = qData.url;
            if (!bestUrl) bestUrl = qData.url;
          }
        }
        if (bestUrl) {
          results.push({
            url: bestUrl,
            format: 'mp4',
            provider: providerName,
            qualities,
            subtitles: (stream.captions || []).map(cap => ({
              label: cap.language,
              file: cap.url,
              language: cap.language,
            })),
            headers: stream.headers,
          });
        }
      }
    }
  } catch (err) {
    console.error('[extract] movie-web/providers error:', err);
  }
  return results;
}

// ─── Autoembed extractor (scrapes autoembed.cc API for direct streams) ───

async function extractAutoembed(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    const url = mediaType === 'movie'
      ? `https://player.autoembed.cc/api/getVideoSource?type=movie&id=${tmdbId}`
      : `https://player.autoembed.cc/api/getVideoSource?type=tv&id=${tmdbId}/${season || '1'}/${episode || '1'}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://player.autoembed.cc/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // AutoEmbed returns { videoSource: "url", subtitles: [...] }
    if (data?.videoSource) {
      const isHls = data.videoSource.includes('.m3u8');
      return {
        url: data.videoSource,
        format: isHls ? 'hls' : 'mp4',
        provider: 'AutoEmbed',
        subtitles: (data.subtitles || []).map((sub: any, i: number) => ({
          label: sub.label || sub.lang || `Subtitle ${i + 1}`,
          file: sub.url || sub.file,
          language: sub.lang || 'en',
        })),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] AutoEmbed failed:', err);
    return null;
  }
}

// ─── Multiembed extractor ───

async function extractMultiembed(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string,
): Promise<ExtractedStream | null> {
  try {
    const url = mediaType === 'movie'
      ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
      : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season || '1'}&e=${episode || '1'}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Look for m3u8 or mp4 URLs in the response
    const m3u8Match = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*?)["']/);
    if (m3u8Match) {
      return {
        url: m3u8Match[1],
        format: 'hls',
        provider: 'SuperEmbed',
      };
    }

    const mp4Match = html.match(/["'](https?:\/\/[^"']+\.mp4[^"']*?)["']/);
    if (mp4Match) {
      return {
        url: mp4Match[1],
        format: 'mp4',
        provider: 'SuperEmbed',
      };
    }

    return null;
  } catch (err) {
    console.error('[extract] MultiEmbed failed:', err);
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

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 });
  }

  // Run all extractors in parallel
  const [vidsrcResult, movieWebResults, autoembedResult, multiembedResult] = await Promise.allSettled([
    extractVidsrc(tmdbId, mediaType, season, episode),
    extractMovieWeb(tmdbId, mediaType, title, year, season, episode),
    extractAutoembed(tmdbId, mediaType, season, episode),
    extractMultiembed(tmdbId, mediaType, season, episode),
  ]);

  const streams: ExtractedStream[] = [];

  // VidSrc first (most reliable)
  if (vidsrcResult.status === 'fulfilled' && vidsrcResult.value) {
    streams.push(vidsrcResult.value);
  }

  // Then any movie-web results
  if (movieWebResults.status === 'fulfilled') {
    streams.push(...movieWebResults.value);
  }

  // AutoEmbed
  if (autoembedResult.status === 'fulfilled' && autoembedResult.value) {
    streams.push(autoembedResult.value);
  }

  // MultiEmbed / SuperEmbed
  if (multiembedResult.status === 'fulfilled' && multiembedResult.value) {
    streams.push(multiembedResult.value);
  }

  console.log(`[extract-stream] ${tmdbId} (${mediaType}): ${streams.length} streams — ${streams.map(s => s.provider).join(', ') || 'none'}`);

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
