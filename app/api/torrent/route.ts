import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const QB_BASE = 'http://localhost:8080/api/v2';
// /host-downloads is Docker volume mapped to ~/Downloads on the Mac
const DOWNLOAD_PATH = '/host-downloads';
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
    headers: { ...options?.headers, Cookie: cookie },
  });
}

// POST — Add a torrent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { magnetUrl, category } = body;

    if (!magnetUrl) {
      return NextResponse.json({ error: 'Missing magnetUrl' }, { status: 400 });
    }

    const hashMatch = magnetUrl.match(/btih:([a-fA-F0-9]+)/i);
    const hash = hashMatch?.[1]?.toLowerCase() || '';

    const formBody = new URLSearchParams();
    formBody.set('urls', magnetUrl);
    formBody.set('category', category || 'syllabus');
    formBody.set('savepath', DOWNLOAD_PATH);
    formBody.set('sequentialDownload', 'true');
    formBody.set('firstLastPiecePrio', 'true');

    const res = await qbFetch('/torrents/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to add torrent' }, { status: 500 });
    }

    return NextResponse.json({ success: true, hash });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — Get torrent status or list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const hash = searchParams.get('hash');

    if (hash) {
      const res = await qbFetch('/torrents/info', { params: { hashes: hash } });
      const list = await res.json();
      const torrent = list[0];
      if (!torrent) {
        return NextResponse.json({ error: 'Torrent not found' }, { status: 404 });
      }

      // Find video file
      const filesRes = await qbFetch('/torrents/files', { params: { hash } });
      const files = await filesRes.json();
      const videoExts = ['.mkv', '.mp4', '.avi', '.m4v', '.webm', '.mov'];
      const videoFiles = files
        .filter((f: any) => videoExts.some(ext => f.name.toLowerCase().endsWith(ext)))
        .sort((a: any, b: any) => b.size - a.size);
      const videoFile = videoFiles[0] || null;

      return NextResponse.json({
        ...torrent,
        videoFile: videoFile ? {
          name: videoFile.name,
          size: videoFile.size,
          progress: videoFile.progress,
        } : null,
      });
    }

    const res = await qbFetch('/torrents/info', { params: { category: 'syllabus' } });
    const torrents = await res.json();
    return NextResponse.json({ torrents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Remove a torrent
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const hash = searchParams.get('hash');
    const keepFiles = searchParams.get('keepFiles') === 'true';

    if (!hash) {
      return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
    }

    const res = await qbFetch('/torrents/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        hashes: hash,
        deleteFiles: keepFiles ? 'false' : 'true',
      }).toString(),
    });

    return NextResponse.json({ success: res.ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
