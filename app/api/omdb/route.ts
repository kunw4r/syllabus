import { NextRequest, NextResponse } from 'next/server';

const OMDB_KEYS = [
  process.env.OMDB_API_KEY_1,
  process.env.OMDB_API_KEY_2,
].filter(Boolean) as string[];

let keyIdx = 0;
const exhausted = new Set<number>();

function getNextKey(): string {
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const idx = (keyIdx + i) % OMDB_KEYS.length;
    if (!exhausted.has(idx)) return OMDB_KEYS[idx];
  }
  exhausted.clear();
  return OMDB_KEYS[0];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => params.set(key, value));

  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const key = getNextKey();
    params.set('apikey', key);

    const res = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
    const data = await res.json();

    if (data.Error === 'Request limit reached!') {
      const idx = OMDB_KEYS.indexOf(key);
      exhausted.add(idx);
      keyIdx = (idx + 1) % OMDB_KEYS.length;
      continue;
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ Response: 'False', Error: 'Request limit reached!' });
}
