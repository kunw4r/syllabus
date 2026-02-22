// TMDB Person API — uses existing /api/tmdb catch-all proxy

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fetcher().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

async function tmdb(endpoint: string, params = '') {
  const res = await fetch(`/api/tmdb${endpoint}?${params.replace(/^&/, '')}`);
  return res.json();
}

function tmdbCached(endpoint: string, params = '') {
  return cached(`person:${endpoint}${params}`, () => tmdb(endpoint, params));
}

// ─── Person Search ───

export async function searchPerson(query: string) {
  const data = await tmdb('/search/person', `query=${encodeURIComponent(query)}`);
  return (data.results || []).filter(
    (p: any) => p.known_for_department === 'Acting'
  );
}

// ─── Person Details ───

export function getPersonDetails(id: number | string) {
  return tmdbCached(
    `/person/${id}`,
    'append_to_response=movie_credits,tv_credits,images,external_ids'
  );
}

// ─── Popular Actors ───

export function getPopularActors(page = 1) {
  return tmdbCached(`/person/popular`, `page=${page}`).then(
    (d: any) => d.results || []
  );
}
