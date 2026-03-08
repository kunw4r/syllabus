// ─── Torrent Source Search ───
// Searches YTS (movies) and EZTV (TV shows) for available torrents

export interface TorrentSource {
  title: string;
  quality: string;
  size: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  magnetUrl: string;
  source: 'yts' | 'eztv' | '1337x';
  type: string; // e.g. 'bluray', 'web', 'webrip'
  codec?: string;
}

// ─── YTS API (Movies) ───

interface YTSTorrent {
  url: string;
  hash: string;
  quality: string;
  type: string;
  size: string;
  size_bytes: number;
  seeds: number;
  peers: number;
}

export async function searchYTS(imdbId: string): Promise<TorrentSource[]> {
  try {
    const res = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}&limit=1`
    );
    const data = await res.json();
    const movie = data?.data?.movies?.[0];
    if (!movie?.torrents) return [];

    return movie.torrents.map((t: YTSTorrent): TorrentSource => ({
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
  } catch (err) {
    console.error('YTS search failed:', err);
    return [];
  }
}

// ─── EZTV API (TV Shows) ───

interface EZTVTorrent {
  title: string;
  hash: string;
  quality?: string;
  size_bytes: string;
  seeds: number;
  peers: number;
  season: string;
  episode: string;
  magnet_url: string;
}

export async function searchEZTV(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<TorrentSource[]> {
  try {
    // EZTV uses IMDB ID without the 'tt' prefix
    const numericId = imdbId.replace(/^tt/, '');
    let url = `https://eztvx.to/api/get-torrents?imdb_id=${numericId}&limit=100`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data?.torrents) return [];

    let torrents: EZTVTorrent[] = data.torrents;

    // Filter by season/episode if specified
    if (season !== undefined) {
      torrents = torrents.filter(t => parseInt(t.season) === season);
    }
    if (episode !== undefined) {
      torrents = torrents.filter(t => parseInt(t.episode) === episode);
    }

    return torrents.map((t): TorrentSource => {
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
  } catch (err) {
    console.error('EZTV search failed:', err);
    return [];
  }
}

// ─── Search for sources (unified) ───

export async function searchSources(
  imdbId: string,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<TorrentSource[]> {
  if (mediaType === 'movie') {
    return searchYTS(imdbId);
  } else {
    return searchEZTV(imdbId, season, episode);
  }
}

// ─── Helpers ───

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
