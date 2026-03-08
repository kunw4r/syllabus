// ─── qBittorrent WebAPI Client ───
// Manages torrents for streaming/downloading media

const QB_BASE = 'http://localhost:8080/api/v2';

let sessionCookie: string | null = null;

async function qbAuth(): Promise<string> {
  if (sessionCookie) return sessionCookie;
  const res = await fetch(`${QB_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=ZU4C2CcRY',
  });
  const cookie = res.headers.get('set-cookie');
  if (cookie) sessionCookie = cookie.split(';')[0];
  return sessionCookie || '';
}

async function qbFetch(path: string, options?: RequestInit & { params?: Record<string, string> }): Promise<Response> {
  const cookie = await qbAuth();
  let url = `${QB_BASE}${path}`;
  if (options?.params) {
    url += '?' + new URLSearchParams(options.params).toString();
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Cookie: cookie,
    },
  });
}

export interface TorrentInfo {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  state: string;
  save_path: string;
  content_path: string;
  num_seeds: number;
  num_leechs: number;
  added_on: number;
  completion_on: number;
  category: string;
}

export interface TorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
  is_seed: boolean;
}

// Add a torrent by magnet link or URL
export async function addTorrent(opts: {
  urls?: string;
  category?: string;
  savepath?: string;
  sequentialDownload?: boolean;
  firstLastPiecePrio?: boolean;
}): Promise<boolean> {
  const body = new URLSearchParams();
  if (opts.urls) body.set('urls', opts.urls);
  if (opts.category) body.set('category', opts.category);
  if (opts.savepath) body.set('savepath', opts.savepath);
  if (opts.sequentialDownload) body.set('sequentialDownload', 'true');
  if (opts.firstLastPiecePrio) body.set('firstLastPiecePrio', 'true');

  const res = await qbFetch('/torrents/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.ok;
}

// Get info about all torrents or filter by hash
export async function getTorrents(opts?: { hashes?: string; category?: string }): Promise<TorrentInfo[]> {
  const params: Record<string, string> = {};
  if (opts?.hashes) params.hashes = opts.hashes;
  if (opts?.category) params.category = opts.category;
  const res = await qbFetch('/torrents/info', { params });
  return res.json();
}

// Get torrent by hash
export async function getTorrent(hash: string): Promise<TorrentInfo | null> {
  const list = await getTorrents({ hashes: hash });
  return list[0] || null;
}

// Get files in a torrent
export async function getTorrentFiles(hash: string): Promise<TorrentFile[]> {
  const res = await qbFetch('/torrents/files', { params: { hash } });
  return res.json();
}

// Delete a torrent
export async function deleteTorrent(hash: string, deleteFiles = true): Promise<boolean> {
  const res = await qbFetch('/torrents/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      hashes: hash,
      deleteFiles: deleteFiles ? 'true' : 'false',
    }).toString(),
  });
  return res.ok;
}

// Set sequential download (for streaming while downloading)
export async function setSequentialDownload(hash: string): Promise<boolean> {
  const res = await qbFetch('/torrents/toggleSequentialDownload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ hashes: hash }).toString(),
  });
  return res.ok;
}

// Set first/last piece priority (for faster stream start)
export async function setFirstLastPiecePrio(hash: string): Promise<boolean> {
  const res = await qbFetch('/torrents/toggleFirstLastPiecePrio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ hashes: hash }).toString(),
  });
  return res.ok;
}

// Get download progress percentage
export async function getProgress(hash: string): Promise<number> {
  const torrent = await getTorrent(hash);
  return torrent ? torrent.progress * 100 : 0;
}

// Find the main video file in a torrent
export async function findVideoFile(hash: string): Promise<TorrentFile | null> {
  const files = await getTorrentFiles(hash);
  const videoExts = ['.mkv', '.mp4', '.avi', '.m4v', '.webm', '.mov'];
  const videoFiles = files
    .filter(f => videoExts.some(ext => f.name.toLowerCase().endsWith(ext)))
    .sort((a, b) => b.size - a.size);
  return videoFiles[0] || null;
}
