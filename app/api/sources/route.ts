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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imdbId = searchParams.get('imdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!imdbId || !mediaType) {
    return NextResponse.json({ error: 'Missing imdbId or mediaType' }, { status: 400 });
  }

  try {
    let sources: TorrentSource[];
    if (mediaType === 'movie') {
      sources = await searchYTS(imdbId);
    } else {
      sources = await searchEZTV(imdbId, season ? parseInt(season) : undefined, episode ? parseInt(episode) : undefined);
    }

    // Sort by quality then seeders
    sources.sort((a, b) => {
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
