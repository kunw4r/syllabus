// TMDB API — calls our proxy at /api/tmdb which hides the API key
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5min

function cached<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data as T);
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
  return cached(`tmdb:${endpoint}${params}`, () => tmdb(endpoint, params));
}

// ─── Movies ───

export function getTrendingMovies() {
  return tmdbCached('/trending/movie/week').then((d: any) => d.results || []);
}

export function getUpcomingMovies() {
  return tmdbCached('/movie/upcoming').then((d: any) => d.results || []);
}

export async function searchMovies(query: string) {
  const data = await tmdb('/search/movie', `query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getMovieDetails(id: number | string) {
  return tmdbCached(`/movie/${id}`, 'append_to_response=recommendations,credits,watch/providers,external_ids,videos');
}

// ─── TV Shows ───

export function getTrendingTV() {
  return tmdbCached('/trending/tv/week').then((d: any) => d.results || []);
}

export function getAiringTV() {
  return tmdbCached('/tv/airing_today').then((d: any) => d.results || []);
}

export async function searchTV(query: string) {
  const data = await tmdb('/search/tv', `query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getTVDetails(id: number | string) {
  return tmdbCached(`/tv/${id}`, 'append_to_response=recommendations,credits,watch/providers,external_ids,videos');
}

// ─── Movie Discovery ───

export function getTopRatedMovies() {
  return tmdbCached('/movie/top_rated').then((d: any) => d.results || []);
}

export function getNowPlayingMovies() {
  return tmdbCached('/movie/now_playing').then((d: any) => d.results || []);
}

export function getPopularMovies() {
  return tmdbCached('/movie/popular').then((d: any) => d.results || []);
}

export function getMoviesByGenre(genreId: number) {
  return tmdbCached('/discover/movie', `with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`).then((d: any) => d.results || []);
}

// ─── TV Discovery ───

export function getTopRatedTV() {
  return tmdbCached('/tv/top_rated').then((d: any) => d.results || []);
}

export function getPopularTV() {
  return tmdbCached('/tv/popular').then((d: any) => d.results || []);
}

export function getTVByGenre(genreId: number) {
  return tmdbCached('/discover/tv', `with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`).then((d: any) => d.results || []);
}

export function getAnime() {
  return tmdbCached('/discover/tv', 'with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=50').then((d: any) => d.results || []);
}

export function getAnimationTV() {
  return tmdbCached('/discover/tv', 'with_genres=16&without_original_language=ja&sort_by=popularity.desc&vote_count.gte=20').then((d: any) => d.results || []);
}

// ─── Top 100 ───

export function getTop100Movies(genreId: number | null = null) {
  const key = genreId ? `top100:movies:${genreId}` : 'top100:movies';
  return cached(key, async () => {
    const genreParam = genreId ? `&with_genres=${genreId}` : '';
    const minVotes = genreId ? 500 : 1000;
    const pages = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) =>
        tmdb('/discover/movie', `sort_by=vote_average.desc&vote_count.gte=${minVotes}${genreParam}&page=${p}`)
      )
    );
    const seen = new Set<number>();
    return pages.flatMap((p: any) => p.results || []).filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  });
}

export function getTop100TV(genreId: number | null = null) {
  const key = genreId ? `top100:tv:${genreId}` : 'top100:tv';
  return cached(key, async () => {
    const genreParam = genreId ? `&with_genres=${genreId}` : '';
    const minVotes = genreId ? 200 : 500;
    const pages = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) =>
        tmdb('/discover/tv', `sort_by=vote_average.desc&vote_count.gte=${minVotes}${genreParam}&page=${p}`)
      )
    );
    const seen = new Set<number>();
    return pages.flatMap((p: any) => p.results || []).filter((s: any) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  });
}

// ─── Multi-search ───

export async function multiSearchTMDB(query: string) {
  const data = await tmdb('/search/multi', `query=${encodeURIComponent(query)}`);
  return (data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
}

// ─── Discovery ───

const GENRE_MAP: Record<string, string> = {
  all: '', action: '28', comedy: '35', drama: '18', scifi: '878',
  thriller: '53', romance: '10749', horror: '27', animation: '16',
  documentary: '99', crime: '80', fantasy: '14', family: '10751',
};

export async function getCuratedPicks(genre = 'all', page = 1) {
  const genreParam = GENRE_MAP[genre] ? `with_genres=${GENRE_MAP[genre]}&` : '';
  const data = await tmdb('/discover/movie', `${genreParam}sort_by=vote_average.desc&vote_count.gte=500&vote_average.gte=6&page=${page}`);
  return data.results || [];
}

const SCENARIO_KEYWORDS: Record<string, { genres: string; keywords: string }> = {
  'date night': { genres: '10749,35', keywords: '' },
  'date': { genres: '10749,35', keywords: '' },
  'romantic': { genres: '10749', keywords: '' },
  'family': { genres: '10751,16', keywords: '' },
  'kids': { genres: '10751,16', keywords: '' },
  'scary': { genres: '27', keywords: '' },
  'horror': { genres: '27', keywords: '' },
  'funny': { genres: '35', keywords: '' },
  'comedy': { genres: '35', keywords: '' },
  'cry': { genres: '18,10749', keywords: '' },
  'emotional': { genres: '18,10749', keywords: '' },
  'sad': { genres: '18', keywords: '' },
  'action': { genres: '28', keywords: '' },
  'adrenaline': { genres: '28,53', keywords: '' },
  'mind off': { genres: '28,12,35', keywords: '' },
  'take my mind': { genres: '28,12,35,14', keywords: '' },
  'relax': { genres: '35,10751,10402', keywords: '' },
  'chill': { genres: '35,10402', keywords: '' },
  'thriller': { genres: '53,9648', keywords: '' },
  'suspense': { genres: '53,9648', keywords: '' },
  'mystery': { genres: '9648', keywords: '' },
  'mind bending': { genres: '878,9648', keywords: '' },
  'sci-fi': { genres: '878', keywords: '' },
  'space': { genres: '878', keywords: '1612' },
  'war': { genres: '10752,18', keywords: '' },
  'history': { genres: '36', keywords: '' },
  'true story': { genres: '18,36', keywords: '9672' },
  'superhero': { genres: '28,878', keywords: '9715' },
  'animated': { genres: '16', keywords: '' },
  'anime': { genres: '16', keywords: '' },
  'documentary': { genres: '99', keywords: '' },
  'inspiring': { genres: '18', keywords: '9748' },
  'adventure': { genres: '12,28', keywords: '' },
  'fantasy': { genres: '14', keywords: '' },
  'magic': { genres: '14', keywords: '' },
  'zombie': { genres: '27', keywords: '12377' },
  'heist': { genres: '80,53', keywords: '10051' },
  'feel good': { genres: '35,10751,10749', keywords: '' },
  'wholesome': { genres: '35,10751', keywords: '' },
  'coming of age': { genres: '18', keywords: '10683' },
  'teen': { genres: '18,35', keywords: '10683' },
  'western': { genres: '37', keywords: '' },
  'music': { genres: '10402', keywords: '' },
  'sport': { genres: '18', keywords: '6075' },
  'revenge': { genres: '28,53', keywords: '10084' },
};

export async function searchByScenario(query: string) {
  const q = query.toLowerCase().trim();
  let genres = '';
  let keywords = '';

  const sorted = Object.entries(SCENARIO_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, config] of sorted) {
    if (q.includes(phrase)) {
      genres = config.genres;
      keywords = config.keywords;
      break;
    }
  }

  if (!genres) {
    const kwRes = await tmdb('/search/keyword', `query=${encodeURIComponent(q)}`);
    const kwIds = (kwRes.results || []).slice(0, 3).map((k: any) => k.id).join('|');
    if (kwIds) {
      const data = await tmdb('/discover/movie', `with_keywords=${kwIds}&sort_by=vote_average.desc&vote_count.gte=100`);
      return (data.results || []).map((r: any) => ({ ...r, media_type: 'movie' }));
    }
    const data = await tmdb('/search/movie', `query=${encodeURIComponent(query)}`);
    return (data.results || []).map((r: any) => ({ ...r, media_type: 'movie' }));
  }

  const kwParam = keywords ? `&with_keywords=${keywords}` : '';
  const [movies, tv] = await Promise.all([
    tmdb('/discover/movie', `with_genres=${genres}${kwParam}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 3) + 1}`),
    tmdb('/discover/tv', `with_genres=${genres.replace('10752', '10768')}${kwParam}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 2) + 1}`),
  ]);

  const combined = [
    ...(movies.results || []).map((r: any) => ({ ...r, media_type: 'movie' })),
    ...(tv.results || []).map((r: any) => ({ ...r, media_type: 'tv' })),
  ].sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));

  return combined.slice(0, 20);
}

const MOOD_GENRES: Record<string, Record<string, string>> = {
  light: { movie: '35,10751,10402', tv: '35,10751' },
  dark: { movie: '28,53,27,80', tv: '28,80,9648' },
  mind: { movie: '878,9648,14', tv: '878,9648' },
  feel: { movie: '10749,18,10402', tv: '10749,18' },
  adventure: { movie: '12,28,14', tv: '10759,14' },
  chill: { movie: '99,36,10770', tv: '99,10764' },
};

export async function discoverByMood(mood: string, mediaType = 'movie') {
  const genreStr = MOOD_GENRES[mood]?.[mediaType] || MOOD_GENRES.light[mediaType];
  const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
  const data = await tmdb(endpoint, `with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 3) + 1}`);
  return data.results || [];
}

// ─── Smart Recommendations ───

export async function getSmartRecommendations(libraryItems: any[]) {
  if (!libraryItems || libraryItems.length === 0) return [];

  const rated = libraryItems
    .filter((i) => i.status === 'finished' && i.media_type !== 'book')
    .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
    .slice(0, 5);

  const watching = libraryItems
    .filter((i) => i.status === 'watching' && i.media_type !== 'book')
    .slice(0, 3);

  const seeds = [...rated, ...watching].slice(0, 6);
  if (seeds.length === 0) return [];

  const allRecs = await Promise.all(
    seeds.map(async (item) => {
      try {
        const endpoint = item.media_type === 'tv' ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`;
        const data = await tmdb(endpoint, 'append_to_response=recommendations');
        return (data.recommendations?.results || []).map((r: any) => ({
          ...r,
          media_type: r.media_type || item.media_type,
          _source: item.title,
          _sourceRating: item.user_rating || item.external_rating || 0,
        }));
      } catch {
        return [];
      }
    })
  );

  const libraryIds = new Set(libraryItems.map((i) => String(i.tmdb_id)));
  const seen = new Set<string>();
  const unique = allRecs.flat().filter((r: any) => {
    const key = `${r.media_type}-${r.id}`;
    if (seen.has(key) || libraryIds.has(String(r.id))) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a: any, b: any) => {
    const scoreA = (a.vote_average || 0) + (a._sourceRating / 10);
    const scoreB = (b.vote_average || 0) + (b._sourceRating / 10);
    return scoreB - scoreA;
  });

  return unique.slice(0, 20);
}

// ─── Discover Weekly ───

export async function getDiscoverWeekly(library: any[]) {
  if (library.length < 3) return [];

  const seeds = [...library]
    .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
    .slice(0, 5)
    .filter((i) => i.tmdb_id);

  if (seeds.length === 0) return [];

  const allRecs = await Promise.all(
    seeds.map(async (seed) => {
      try {
        const mt = seed.media_type === 'tv' ? 'tv' : 'movie';
        const data = await tmdb(`/${mt}/${seed.tmdb_id}/recommendations`);
        return (data.results || []).map((r: any) => ({ ...r, media_type: mt }));
      } catch {
        return [];
      }
    })
  );

  const libIds = new Set(library.map((i) => String(i.tmdb_id)));
  const seen = new Set<string>();
  const unique = allRecs.flat().filter((r: any) => {
    const key = `${r.media_type}-${r.id}`;
    if (seen.has(key) || libIds.has(String(r.id))) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
  return unique.slice(0, 20);
}
