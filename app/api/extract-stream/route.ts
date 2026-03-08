import { NextRequest, NextResponse } from 'next/server';
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// ─── Types ───

interface ExtractedStream {
  url: string;
  format: 'hls' | 'mp4';
  provider: string;
  subtitles?: { label: string; file: string; language?: string }[];
  skips?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract base64 config from window.vConfig = JSON.parse(atob(`...`))
    const match = html.match(/window\.vConfig\s*=\s*JSON\.parse\(atob\(`(.+?)`\)\)/);
    if (!match?.[1]) return null;

    const config = JSON.parse(Buffer.from(match[1], 'base64').toString());
    if (!config.hash) return null;

    // Decode the hash to get server list
    // Step 1: atob, split by '.', reverse each part
    const firstDecode = atob(config.hash).split('.').map((item: string) => item.split('').reverse().join(''));
    // Step 2: join, reverse all, atob again, parse JSON
    const servers = JSON.parse(atob(firstDecode.join('').split('').reverse().join('')));

    if (!servers || servers.length === 0) return null;

    // Try each server to get stream URL
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

// ─── vidlink.pro extractor ───

const VIDLINK_KEY_HEX = '2de6e6ea13a9df9503b11a6117fd7e51941e04a0c223dfeacfe8a1dbb6c52783';

function vidlinkEncrypt(data: string): string {
  const iv = randomBytes(16);
  const key = Buffer.from(VIDLINK_KEY_HEX, 'hex').slice(0, 32);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function vidlinkDecrypt(data: string): string {
  const [ivHex, encryptedHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = Buffer.from(VIDLINK_KEY_HEX, 'hex').slice(0, 32);
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function extractVidlink(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string
): Promise<ExtractedStream | null> {
  try {
    const encodedId = Buffer.from(vidlinkEncrypt(tmdbId)).toString('base64');
    const url = mediaType === 'movie'
      ? `https://vidlink.pro/api/b/movie/${encodedId}`
      : `https://vidlink.pro/api/b/tv/${encodedId}/${season || '1'}/${episode || '1'}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const encrypted = await res.text();
    if (!encrypted.includes(':')) return null;

    const decrypted = vidlinkDecrypt(encrypted);
    const data = JSON.parse(decrypted);

    if (data?.stream?.playlist) {
      return {
        url: data.stream.playlist,
        format: 'hls',
        provider: 'vidlink.pro',
        subtitles: (data.stream.captions || []).map((c: any) => ({
          label: c.language || c.id,
          file: c.url,
          language: c.language,
        })),
      };
    }
    return null;
  } catch (err) {
    console.error('[extract] vidlink.pro failed:', err);
    return null;
  }
}

// ─── vidsrc.rip extractor ───

async function extractVidsrcRip(
  tmdbId: string,
  mediaType: string,
  season?: string,
  episode?: string
): Promise<ExtractedStream | null> {
  try {
    const BASE = 'https://vidsrc.rip';

    // Step 1: Fetch embed page to get config (servers list)
    const embedPath = mediaType === 'movie'
      ? `/embed/movie/${tmdbId}`
      : `/embed/tv/${tmdbId}/${season || '1'}/${episode || '1'}`;

    const embedRes = await fetch(`${BASE}${embedPath}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!embedRes.ok) return null;
    const html = await embedRes.text();

    const configMatch = html.match(/window\.config\s*=\s*(\{[\s\S]*?\});/);
    if (!configMatch?.[1]) return null;

    // Parse config
    const config = parseVidsrcConfig(configMatch[1]);
    if (!config.servers?.length) return null;

    // Step 2: Get encryption key from skip-button.png
    const keyRes = await fetch(`${BASE}/images/skip-button.png`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!keyRes.ok) return null;
    const encKey = await keyRes.text();

    // Step 3: Try each server
    for (const server of config.servers) {
      try {
        const apiPath = `/api/source/${server}/${tmdbId}`;
        const vrf = generateVRF(encKey, apiPath);
        let apiUrl = `${BASE}${apiPath}?vrf=${vrf}`;
        if (mediaType === 'tv') {
          apiUrl += `&s=${season || '1'}&e=${episode || '1'}`;
        }

        const streamRes = await fetch(apiUrl, {
          signal: AbortSignal.timeout(5000),
        });
        if (!streamRes.ok) continue;
        const data = await streamRes.json();

        if (data?.sources?.[0]?.file) {
          return {
            url: data.sources[0].file,
            format: data.sources[0].file.includes('.mp4') ? 'mp4' : 'hls',
            provider: `vidsrc.rip (${server})`,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (err) {
    console.error('[extract] vidsrc.rip failed:', err);
    return null;
  }
}

function parseVidsrcConfig(configString: string): { servers: string[]; tmdbId?: string; season?: string; episode?: string } {
  const config: any = {};
  const regex = /(\w+):\s*(?:'([^']*)'|"([^"]*)"|(\[[^\]]*\])|([^,}]+))/g;
  let match;
  while ((match = regex.exec(configString)) !== null) {
    const [, key, sq, dq, arrVal, unq] = match;
    let value: any = sq || dq || unq;
    if (arrVal) value = JSON.parse(arrVal);
    if (key === 'servers' && typeof value === 'string') value = [value];
    config[key] = value;
  }
  return config;
}

function generateVRF(key: string, message: string): string {
  const decoded = decodeURIComponent(message);
  const keyCodes = Array.from(key, c => c.charCodeAt(0));
  const msgCodes = Array.from(decoded, c => c.charCodeAt(0));
  const xored = msgCodes.map((code, i) => code ^ keyCodes[i % keyCodes.length]);
  return encodeURIComponent(Buffer.from(String.fromCharCode(...xored)).toString('base64'));
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

  // Try extractors in order of reliability
  const extractors = [
    { name: 'embed.su', fn: () => extractEmbedSu(tmdbId, mediaType, season, episode) },
    { name: 'vidlink.pro', fn: () => extractVidlink(tmdbId, mediaType, season, episode) },
    { name: 'vidsrc.rip', fn: () => extractVidsrcRip(tmdbId, mediaType, season, episode) },
  ];

  // Run all extractors in parallel for speed
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
      stream: streams[0], // Best/first working
      allStreams: streams,
      extracted: true,
    });
  }

  // No direct extraction available — return null so client falls back to iframe
  return NextResponse.json({
    stream: null,
    allStreams: [],
    extracted: false,
  });
}
