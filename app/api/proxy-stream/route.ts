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
    // Some CDNs (e.g. illimitableinkwell) reject requests WITH Referer/Origin
    // Only send headers for m3u8 manifests from known providers, not for segment CDNs
    const parsedUrl = new URL(url);
    const needsHeaders = parsedUrl.hostname.includes('cloudnestra') || parsedUrl.hostname.includes('embed');
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        ...(needsHeaders ? {
          'Referer': parsedUrl.origin + '/',
          'Origin': parsedUrl.origin,
        } : {}),
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

      // Rewrite ALL non-comment lines (both relative and absolute URLs)
      body = body.replace(/^(?!#)(.+)$/gm, (match) => {
        const trimmed = match.trim();
        if (!trimmed) return match;
        let absoluteUrl: string;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          absoluteUrl = trimmed; // Already absolute
        } else if (trimmed.startsWith('/')) {
          absoluteUrl = new URL(url).origin + trimmed;
        } else {
          absoluteUrl = baseUrl + trimmed;
        }
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
