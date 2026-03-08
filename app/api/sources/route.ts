import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TorrentSource {
  title: string;
  quality: string;
  size: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  magnetUrl: string;
  source: string;
  type: string;
  codec?: string;
  audio?: string;
}

const YTS_TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.leechers-paradise.org:6969',
];

function buildMagnet(hash: string, name: string): string {
  const encoded = encodeURIComponent(name);
  const trackers = YTS_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${hash}&dn=${encoded}${trackers}`;
}

function extractQuality(title: string): string {
  const upper = title.toUpperCase();
  if (upper.includes('2160P') || upper.includes('4K')) return '2160p';
  if (upper.includes('1080P')) return '1080p';
  if (upper.includes('720P')) return '720p';
  if (upper.includes('480P')) return '480p';
  return 'Unknown';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function searchYTS(imdbId: string): Promise<TorrentSource[]> {
  const res = await fetch(
    `https://yts.torrentbay.st/api/v2/list_movies.json?query_term=${imdbId}&limit=1`
  );
  const data = await res.json();
  const movie = data?.data?.movies?.[0];
  if (!movie?.torrents) return [];

  return movie.torrents.map((t: any): TorrentSource => ({
    title: `${movie.title} (${movie.year})`,
    quality: t.quality,
    size: t.size,
    sizeBytes: t.size_bytes,
    seeders: t.seeds,
    leechers: t.peers,
    magnetUrl: buildMagnet(t.hash, `${movie.title} (${movie.year}) [${t.quality}]`),
    source: 'yts',
    type: t.type,
    codec: t.quality.includes('2160p') ? 'HEVC' : 'x264',
  }));
}

async function searchEZTV(imdbId: string, season?: number, episode?: number): Promise<TorrentSource[]> {
  const numericId = imdbId.replace(/^tt/, '');
  const res = await fetch(`https://eztvx.to/api/get-torrents?imdb_id=${numericId}&limit=100`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data?.torrents) return [];

  let torrents = data.torrents;
  if (season !== undefined) torrents = torrents.filter((t: any) => parseInt(t.season) === season);
  if (episode !== undefined) torrents = torrents.filter((t: any) => parseInt(t.episode) === episode);

  return torrents.map((t: any): TorrentSource => {
    const quality = extractQuality(t.title);
    return {
      title: t.title,
      quality,
      size: formatBytes(parseInt(t.size_bytes) || 0),
      sizeBytes: parseInt(t.size_bytes) || 0,
      seeders: t.seeds,
      leechers: t.peers,
      magnetUrl: t.magnet_url || buildMagnet(t.hash, t.title),
      source: 'eztv',
      type: quality.includes('WEB') ? 'web' : 'hdtv',
    };
  });
}

// ─── TPB API — General + Anime torrents ───
function detectAudio(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes('dual audio') || lower.includes('dual-audio') || lower.includes(' dual ')) return 'Dual Audio';
  if (lower.includes('multi audio') || lower.includes('multi-audio')) return 'Multi Audio';
  if (lower.includes('eng dub') || lower.includes('english dub')) return 'English Dub';
  if (lower.includes('eng sub') || lower.includes('english sub') || lower.includes('engsub')) return 'Japanese + Subs';
  return undefined;
}

async function searchTPB(query: string): Promise<TorrentSource[]> {
  try {
    const res = await fetch(
      `https://apibay.org/q.php?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();

    // TPB returns [{ name: "No results returned", info_hash: "000..." }] when empty
    if (!Array.isArray(data)) return [];

    return data
      .filter((t: any) => t.info_hash && !t.info_hash.match(/^0+$/))
      .slice(0, 30)
      .map((t: any): TorrentSource => {
        const quality = extractQuality(t.name);
        const audio = detectAudio(t.name);
        const sizeBytes = parseInt(t.size) || 0;
        const codec = t.name.includes('HEVC') || t.name.includes('x265') || t.name.includes('H.265')
          ? 'HEVC'
          : t.name.includes('AV1') ? 'AV1' : undefined;

        return {
          title: t.name,
          quality,
          size: formatBytes(sizeBytes),
          sizeBytes,
          seeders: parseInt(t.seeders) || 0,
          leechers: parseInt(t.leechers) || 0,
          magnetUrl: buildMagnet(t.info_hash, t.name),
          source: 'tpb',
          type: codec ? 'bluray' : 'web',
          codec,
          audio,
        };
      });
  } catch {
    return [];
  }
}

async function searchAnime(title: string, season?: number, episode?: number): Promise<TorrentSource[]> {
  // Build targeted search queries for anime
  const queries: string[] = [];

  if (season !== undefined && episode !== undefined) {
    const epStr = String(episode).padStart(2, '0');
    const sStr = String(season).padStart(2, '0');
    queries.push(`${title} S${sStr}E${epStr} 1080p`);
    queries.push(`${title} S${sStr}E${epStr}`);
  } else if (season !== undefined) {
    queries.push(`${title} Season ${season} 1080p`);
    queries.push(`${title} S${String(season).padStart(2, '0')} complete`);
  } else {
    queries.push(`${title} 1080p dual audio`);
    queries.push(`${title} 1080p`);
    queries.push(title);
  }

  const allSources: TorrentSource[] = [];
  const seenHashes = new Set<string>();

  for (const q of queries) {
    const results = await searchTPB(q);
    for (const r of results) {
      const hash = r.magnetUrl.match(/btih:([a-fA-F0-9]+)/i)?.[1]?.toLowerCase();
      if (hash && !seenHashes.has(hash)) {
        seenHashes.add(hash);
        allSources.push(r);
      }
    }
    // If we have enough good results, stop searching
    if (allSources.filter(s => s.seeders > 5).length >= 10) break;
  }

  return allSources;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imdbId = searchParams.get('imdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const title = searchParams.get('title') || '';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const isAnime = searchParams.get('isAnime') === '1';

  if (!imdbId || !mediaType) {
    return NextResponse.json({ error: 'Missing imdbId or mediaType' }, { status: 400 });
  }

  try {
    let sources: TorrentSource[] = [];

    if (isAnime && title) {
      // For anime, search TPB by title + also try YTS/EZTV as fallback
      const [animeSources, fallbackSources] = await Promise.all([
        searchAnime(title, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined),
        mediaType === 'movie'
          ? searchYTS(imdbId)
          : searchEZTV(imdbId, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined),
      ]);
      sources = [...animeSources, ...fallbackSources];
    } else if (mediaType === 'movie') {
      sources = await searchYTS(imdbId);
    } else {
      sources = await searchEZTV(imdbId, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined);
    }

    // Sort: dual audio first, then by quality, then seeders
    sources.sort((a, b) => {
      // Prefer dual audio for anime
      if (isAnime) {
        const aDA = a.audio?.includes('Dual') ? 1 : 0;
        const bDA = b.audio?.includes('Dual') ? 1 : 0;
        if (bDA !== aDA) return bDA - aDA;
      }
      const qualityOrder: Record<string, number> = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, 'Unknown': 0 };
      const qDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
      if (qDiff !== 0) return qDiff;
      return b.seeders - a.seeders;
    });

    return NextResponse.json({ sources });
  } catch (err: any) {
    console.error('Source search error:', err);
    return NextResponse.json({ error: err.message, sources: [] }, { status: 500 });
  }
}
