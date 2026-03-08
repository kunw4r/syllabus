import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { join, basename } from 'path';
import { Readable } from 'stream';
import { homedir } from 'os';

export const dynamic = 'force-dynamic';

// qBittorrent Docker volume: /downloads → ~/media-server/downloads on Mac host
const DOWNLOADS_DIR = join(homedir(), 'media-server', 'downloads');

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

async function qbFetch(path: string, params?: Record<string, string>): Promise<Response> {
  const cookie = await qbAuth();
  let url = `${QB_BASE}${path}`;
  if (params) url += '?' + new URLSearchParams(params).toString();
  return fetch(url, { headers: { Cookie: cookie } });
}

// GET /api/torrent/file?hash=xxx — Stream the completed video file to the browser
export async function GET(req: NextRequest) {
  try {
    const hash = req.nextUrl.searchParams.get('hash');
    if (!hash) {
      return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
    }

    // Get torrent info from qBittorrent
    const infoRes = await qbFetch('/torrents/info', { hashes: hash });
    const list = await infoRes.json();
    const torrent = list[0];
    if (!torrent) {
      return NextResponse.json({ error: 'Torrent not found' }, { status: 404 });
    }

    if (torrent.progress < 1) {
      return NextResponse.json({ error: 'Download not complete yet' }, { status: 400 });
    }

    // Find the video file
    const filesRes = await qbFetch('/torrents/files', { hash });
    const files = await filesRes.json();
    const videoExts = ['.mkv', '.mp4', '.avi', '.m4v', '.webm', '.mov'];
    const videoFiles = files
      .filter((f: any) => videoExts.some(ext => f.name.toLowerCase().endsWith(ext)))
      .sort((a: any, b: any) => b.size - a.size);
    const videoFile = videoFiles[0];

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file found' }, { status: 404 });
    }

    // Build the file path on the host machine
    const filePath = join(DOWNLOADS_DIR, videoFile.name);

    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      return NextResponse.json({ error: 'File not accessible on server' }, { status: 404 });
    }

    const fileName = basename(filePath);
    const fileSize = stat.size;

    // Support range requests for large files
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(stream) as ReadableStream;

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
