import { NextRequest, NextResponse } from 'next/server';
import { addTorrent, getTorrent, getTorrents, findVideoFile, deleteTorrent, getProgress } from '@/lib/api/qbittorrent';

// POST — Add a torrent
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { magnetUrl, category } = body;

  if (!magnetUrl) {
    return NextResponse.json({ error: 'Missing magnetUrl' }, { status: 400 });
  }

  // Extract hash from magnet link
  const hashMatch = magnetUrl.match(/btih:([a-fA-F0-9]+)/);
  const hash = hashMatch?.[1]?.toLowerCase() || '';

  const ok = await addTorrent({
    urls: magnetUrl,
    category: category || 'syllabus',
    sequentialDownload: true,
    firstLastPiecePrio: true,
  });

  if (!ok) {
    return NextResponse.json({ error: 'Failed to add torrent' }, { status: 500 });
  }

  return NextResponse.json({ success: true, hash });
}

// GET — Get torrent status or list
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hash = searchParams.get('hash');

  if (hash) {
    const torrent = await getTorrent(hash);
    if (!torrent) {
      return NextResponse.json({ error: 'Torrent not found' }, { status: 404 });
    }
    const videoFile = await findVideoFile(hash);
    return NextResponse.json({
      ...torrent,
      videoFile: videoFile ? {
        name: videoFile.name,
        size: videoFile.size,
        progress: videoFile.progress,
      } : null,
    });
  }

  const torrents = await getTorrents({ category: 'syllabus' });
  return NextResponse.json({ torrents });
}

// DELETE — Remove a torrent
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hash = searchParams.get('hash');
  const keepFiles = searchParams.get('keepFiles') === 'true';

  if (!hash) {
    return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
  }

  const ok = await deleteTorrent(hash, !keepFiles);
  return NextResponse.json({ success: ok });
}
