import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';

// Stream video files from the downloads directory
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // Security: only allow files from the media-server downloads directory
  const basePath = path.join(process.env.HOME || '/root', 'media-server', 'downloads');
  const fullPath = path.resolve(basePath, filePath);

  if (!fullPath.startsWith(basePath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileStat = await stat(fullPath);
  const fileSize = fileStat.size;
  const range = req.headers.get('range');

  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
  };
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024, fileSize - 1); // 10MB chunks

    const chunkSize = end - start + 1;
    const stream = createReadStream(fullPath, { start, end });

    // Convert Node stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': contentType,
      },
    });
  }

  // No range — stream entire file
  const stream = createReadStream(fullPath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    },
  });
}
