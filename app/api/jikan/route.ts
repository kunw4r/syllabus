import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const limit = searchParams.get('limit') || '1';

  const res = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=${limit}`,
    { next: { revalidate: 3600 } }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
