import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

/**
 * Proxies HLS m3u8 manifests and .ts segments to avoid CORS issues.
 * Usage: /api/proxy-stream?url=<encoded_url>
 *
 * For m3u8 files, rewrites segment/key URLs to also go through this proxy.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': new URL(url).origin + '/',
        'Origin': new URL(url).origin,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.statusText ? 502 : res.status });
    }

    const contentType = res.headers.get('content-type') || '';
    const isM3u8 = url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL');

    if (isM3u8) {
      let body = await res.text();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Rewrite relative URLs in the m3u8 to go through our proxy
      body = body.replace(/^(?!#)(?!https?:\/\/)(.+)$/gm, (match) => {
        const absoluteUrl = match.startsWith('/')
          ? new URL(url).origin + match
          : baseUrl + match;
        return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
      });

      // Also rewrite absolute URLs in URI= attributes (encryption keys, etc.)
      body = body.replace(/URI="(https?:\/\/[^"]+)"/g, (_match, uri) => {
        return `URI="/api/proxy-stream?url=${encodeURIComponent(uri)}"`;
      });

      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For .ts segments, .key files, etc — stream the bytes through
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[proxy-stream] Error:', err);
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 });
  }
}
