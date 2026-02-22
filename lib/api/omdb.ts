// OMDb API — calls our proxy at /api/omdb which handles key rotation

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

// Persistent OMDb cache (localStorage)
const OMDB_STORE_KEY = 'syllabus_omdb';
let _omdbCache: Record<string, any> | null = null;

function getOmdbStore() {
  if (!_omdbCache) {
    try {
      _omdbCache = JSON.parse(localStorage.getItem(OMDB_STORE_KEY) || '{}');
      let purged = false;
      for (const k of Object.keys(_omdbCache!)) {
        if (_omdbCache![k] === null) { delete _omdbCache![k]; purged = true; }
      }
      if (purged) {
        try { localStorage.setItem(OMDB_STORE_KEY, JSON.stringify(_omdbCache)); } catch { /* quota */ }
      }
    } catch { _omdbCache = {}; }
  }
  return _omdbCache!;
}

function saveOmdbEntry(key: string, data: any) {
  const store = getOmdbStore();
  store[key] = data;
  try { localStorage.setItem(OMDB_STORE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

function getOmdbEntry(key: string) {
  return getOmdbStore()[key] ?? undefined;
}

function parseOMDbResponse(data: any) {
  if (!data || data.Response === 'False') return null;
  const ratings: any = { imdb_id: data.imdbID };
  (data.Ratings || []).forEach((r: any) => {
    if (r.Source === 'Internet Movie Database') {
      ratings.imdb = { score: r.Value, votes: data.imdbVotes };
    } else if (r.Source === 'Rotten Tomatoes') {
      ratings.rt = { score: r.Value };
    } else if (r.Source === 'Metacritic') {
      ratings.metacritic = { score: r.Value };
    }
  });
  if (data.Director && data.Director !== 'N/A') ratings.director = data.Director;
  if (data.Writer && data.Writer !== 'N/A') ratings.writer = data.Writer;
  if (data.Awards && data.Awards !== 'N/A') ratings.awards = data.Awards;
  if (data.BoxOffice && data.BoxOffice !== 'N/A') ratings.boxOffice = data.BoxOffice;
  if (data.Rated && data.Rated !== 'N/A') ratings.rated = data.Rated;
  if (data.Country && data.Country !== 'N/A') ratings.country = data.Country;
  return ratings;
}

async function omdbProxy(params: string) {
  const res = await fetch(`/api/omdb?${params}`);
  return res.json();
}

export function getOMDbRatings(imdbId: string, title: string | null = null, type: string | null = null) {
  if (!imdbId) return Promise.resolve(null);
  const storedKey = `i:${imdbId}`;
  const stored = getOmdbEntry(storedKey);
  if (stored !== undefined) return Promise.resolve(stored);

  return cached(`omdb:${imdbId}`, async () => {
    try {
      const data = await omdbProxy(`i=${imdbId}`);
      if (data.Error === 'Request limit reached!') throw new Error('OMDB_RATE_LIMIT');
      const ratings = parseOMDbResponse(data);
      if (!ratings) { saveOmdbEntry(storedKey, null); return null; }

      if (!ratings.rt && title) {
        const omdbType = type === 'tv' ? 'series' : type === 'movie' ? 'movie' : '';
        let params = `t=${encodeURIComponent(title)}`;
        if (omdbType) params += `&type=${omdbType}`;
        const fallbackData = await omdbProxy(params);
        if (fallbackData.Response !== 'False') {
          (fallbackData.Ratings || []).forEach((r: any) => {
            if (r.Source === 'Rotten Tomatoes' && !ratings.rt) {
              ratings.rt = { score: r.Value };
            }
          });
        }
      }

      saveOmdbEntry(storedKey, ratings);
      return ratings;
    } catch (err: any) {
      if (err?.message === 'OMDB_RATE_LIMIT') throw err;
      return null;
    }
  });
}

export function getOMDbByTitle(title: string, year?: string, type = 'movie') {
  if (!title) return Promise.resolve(null);
  const omdbType = type === 'tv' ? 'series' : 'movie';
  const storedKey = `t:${title}:${year || ''}:${omdbType}`;
  const stored = getOmdbEntry(storedKey);
  if (stored !== undefined) return Promise.resolve(stored);

  return cached(`omdb:t:${title}:${year || ''}:${omdbType}`, async () => {
    try {
      let params = `t=${encodeURIComponent(title)}&type=${omdbType}`;
      if (year) params += `&y=${year}`;
      const data = await omdbProxy(params);
      if (data.Error === 'Request limit reached!') throw new Error('OMDB_RATE_LIMIT');
      const result = parseOMDbResponse(data);
      saveOmdbEntry(storedKey, result);
      return result;
    } catch (err: any) {
      if (err?.message === 'OMDB_RATE_LIMIT') throw err;
      return null;
    }
  });
}
