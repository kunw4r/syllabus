import { supabase } from './supabase';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.REACT_APP_TMDB_API_KEY;
const OMDB_KEY = '4a3b711b';
const OL_BASE = 'https://openlibrary.org';

// ─── In-memory cache (5-minute TTL) ───
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cached(key, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data);
  return fetcher().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

// ─── TMDB helper ───
async function tmdb(endpoint, params = '') {
  const res = await fetch(`${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}${params}`);
  return res.json();
}

function tmdbCached(endpoint, params = '') {
  return cached(`tmdb:${endpoint}${params}`, () => tmdb(endpoint, params));
}

// ─── Movies ───

export function getTrendingMovies() {
  return tmdbCached('/trending/movie/week').then(d => d.results || []);
}

export function getUpcomingMovies() {
  return tmdbCached('/movie/upcoming').then(d => d.results || []);
}

export async function searchMovies(query) {
  const data = await tmdb('/search/movie', `&query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getMovieDetails(id) {
  return tmdbCached(`/movie/${id}`, '&append_to_response=recommendations,credits,watch/providers,external_ids,videos');
}

// ─── TV Shows ───

export function getTrendingTV() {
  return tmdbCached('/trending/tv/week').then(d => d.results || []);
}

export function getAiringTV() {
  return tmdbCached('/tv/airing_today').then(d => d.results || []);
}

export async function searchTV(query) {
  const data = await tmdb('/search/tv', `&query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getTVDetails(id) {
  return tmdbCached(`/tv/${id}`, '&append_to_response=recommendations,credits,watch/providers,external_ids,videos');
}

// ─── Movie Discovery ───

export function getTopRatedMovies() {
  return tmdbCached('/movie/top_rated').then(d => d.results || []);
}

export function getNowPlayingMovies() {
  return tmdbCached('/movie/now_playing').then(d => d.results || []);
}

export function getPopularMovies() {
  return tmdbCached('/movie/popular').then(d => d.results || []);
}

export function getMoviesByGenre(genreId) {
  return tmdbCached('/discover/movie', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`).then(d => d.results || []);
}

// ─── TV Discovery ───

export function getTopRatedTV() {
  return tmdbCached('/tv/top_rated').then(d => d.results || []);
}

export function getPopularTV() {
  return tmdbCached('/tv/popular').then(d => d.results || []);
}

export function getTVByGenre(genreId) {
  return tmdbCached('/discover/tv', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`).then(d => d.results || []);
}

export function getAnime() {
  return tmdbCached('/discover/tv', '&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=50').then(d => d.results || []);
}

export function getAnimationTV() {
  return tmdbCached('/discover/tv', '&with_genres=16&without_original_language=ja&sort_by=popularity.desc&vote_count.gte=20').then(d => d.results || []);
}

// ─── Top 100 (TMDB — 5 pages × 20 = 100) ───

export function getTop100Movies(genreId = null) {
  const key = genreId ? `top100:movies:${genreId}` : 'top100:movies';
  return cached(key, async () => {
    if (genreId) {
      const pages = await Promise.all(
        [1, 2, 3, 4, 5].map(p => tmdb('/discover/movie', `&sort_by=vote_average.desc&vote_count.gte=300&with_genres=${genreId}&page=${p}`))
      );
      return pages.flatMap(p => p.results || []);
    }
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(p => tmdb('/movie/top_rated', `&page=${p}`))
    );
    return pages.flatMap(p => p.results || []);
  });
}

export function getTop100TV(genreId = null) {
  const key = genreId ? `top100:tv:${genreId}` : 'top100:tv';
  return cached(key, async () => {
    if (genreId) {
      const pages = await Promise.all(
        [1, 2, 3, 4, 5].map(p => tmdb('/discover/tv', `&sort_by=vote_average.desc&vote_count.gte=200&with_genres=${genreId}&page=${p}`))
      );
      return pages.flatMap(p => p.results || []);
    }
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(p => tmdb('/tv/top_rated', `&page=${p}`))
    );
    return pages.flatMap(p => p.results || []);
  });
}

// ─── OMDb (IMDb + Rotten Tomatoes + Metacritic) ───

function parseOMDbResponse(data) {
  if (!data || data.Response === 'False') return null;
  const ratings = { imdb_id: data.imdbID };
  (data.Ratings || []).forEach(r => {
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

export function getOMDbRatings(imdbId, title = null, type = null) {
  if (!imdbId) return Promise.resolve(null);
  return cached(`omdb:${imdbId}`, async () => {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
      const data = await res.json();
      const ratings = parseOMDbResponse(data);
      if (!ratings) return null;

      // If no RT score and we have a title, try searching by title as fallback
      // (OMDb sometimes returns RT for title search but not by IMDb ID, especially for TV)
      if (!ratings.rt && title) {
        const omdbType = type === 'tv' ? 'series' : type === 'movie' ? 'movie' : '';
        let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_KEY}`;
        if (omdbType) url += `&type=${omdbType}`;
        const fallbackRes = await fetch(url);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.Response !== 'False') {
          (fallbackData.Ratings || []).forEach(r => {
            if (r.Source === 'Rotten Tomatoes' && !ratings.rt) {
              ratings.rt = { score: r.Value };
            }
          });
        }
      }

      return ratings;
    } catch { return null; }
  });
}

// ─── OMDb by title (used for Top 100 enrichment where we lack IMDb IDs) ───

export function getOMDbByTitle(title, year, type = 'movie') {
  if (!title) return Promise.resolve(null);
  const omdbType = type === 'tv' ? 'series' : 'movie';
  const key = `omdb:t:${title}:${year || ''}:${omdbType}`;
  return cached(key, async () => {
    try {
      let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&type=${omdbType}&apikey=${OMDB_KEY}`;
      if (year) url += `&y=${year}`;
      const res = await fetch(url);
      const data = await res.json();
      return parseOMDbResponse(data);
    } catch { return null; }
  });
}

// ─── Unified Rating: avg(IMDb, RT/10) or avg(IMDb, MAL) for anime ───
// Returns a single /10 score or null if no data at all

export function computeUnifiedRating(omdbData, malData, isAnime) {
  const scores = [];
  if (omdbData?.imdb?.score) {
    const v = parseFloat(omdbData.imdb.score);
    if (!isNaN(v)) scores.push(v);
  }
  if (isAnime) {
    if (malData?.score) scores.push(malData.score);
  } else {
    if (omdbData?.rt?.score) {
      const v = parseInt(omdbData.rt.score);
      if (!isNaN(v)) scores.push(v / 10);
    }
  }
  if (scores.length === 0) return null;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

// ─── Batch enrich items with unified ratings (for Top 100) ───

export function enrichItemsWithRatings(items, mediaType) {
  const key = `enriched:${mediaType}:${items.map(i => i.id || i.key).join(',')}`;
  return cached(key, async () => {
    const enriched = items.map(i => ({ ...i }));
    const batchSize = 10;

    for (let i = 0; i < enriched.length; i += batchSize) {
      const batch = enriched.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const isAnime = item.original_language === 'ja' &&
          (item.genre_ids?.includes(16) || item.genres?.some(g => g.id === 16));

        const omdb = await getOMDbByTitle(title, year, mediaType);
        let mal = null;
        if (isAnime) {
          try { mal = await getMALRating(title); } catch { /* ignore */ }
        }

        item.unified_rating = computeUnifiedRating(omdb, mal, isAnime);
      }));
    }

    // Sort by unified rating (fallback to vote_average/rating)
    enriched.sort((a, b) => {
      const ra = a.unified_rating ?? a.vote_average ?? a.rating ?? 0;
      const rb = b.unified_rating ?? b.vote_average ?? b.rating ?? 0;
      return rb - ra;
    });

    return enriched;
  });
}

// ─── MAL / Jikan (Anime ratings) ───

export function getMALRating(title) {
  if (!title) return Promise.resolve(null);
  return cached(`mal:${title}`, async () => {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
      const data = await res.json();
      const anime = data.data?.[0];
      if (!anime) return null;
      return {
        score: anime.score,
        scored_by: anime.scored_by,
        mal_id: anime.mal_id,
        url: anime.url,
      };
    } catch { return null; }
  });
}

// ─── Books (Open Library — free, unlimited, reliable) ───

function mapOLWork(w) {
  const coverId = w.cover_i || w.cover_id;
  return {
    key: w.key,
    title: w.title,
    author: w.author_name?.[0] || w.authors?.[0]?.name || 'Unknown',
    cover_id: coverId,
    poster_path: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null,
    first_publish_year: w.first_publish_year,
    rating: w.ratings_average ? Math.round(w.ratings_average * 20) / 10 : null,
    ratings_count: w.ratings_count || 0,
    want_to_read: w.want_to_read_count || 0,
    already_read: w.already_read_count || 0,
    currently_reading: w.currently_reading_count || 0,
    edition_count: w.edition_count || 0,
    subject: w.subject?.slice(0, 5) || [],
    media_type: 'book',
  };
}

export function getTrendingBooks() {
  return cached('ol:trending', async () => {
    try {
      const res = await fetch(`${OL_BASE}/trending/daily.json?limit=20`);
      const data = await res.json();
      return (data.works || []).map(mapOLWork);
    } catch { return []; }
  });
}

export function getBooksBySubject(subject) {
  return cached(`ol:subject:${subject}`, async () => {
    try {
      const res = await fetch(`${OL_BASE}/subjects/${encodeURIComponent(subject)}.json?limit=20`);
      const data = await res.json();
      return (data.works || []).map(w => ({
        key: w.key,
        title: w.title,
        author: w.authors?.[0]?.name || 'Unknown',
        cover_id: w.cover_id,
        poster_path: w.cover_id
          ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`
          : null,
        first_publish_year: w.first_publish_year,
        rating: null,
        subject: [subject],
        media_type: 'book',
      }));
    } catch { return []; }
  });
}

export async function searchBooks(query) {
  try {
    const res = await fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count,want_to_read_count,already_read_count,currently_reading_count,edition_count,subject`);
    const data = await res.json();
    return (data.docs || []).map(mapOLWork);
  } catch { return []; }
}

// ─── Book Detail (Open Library work + ratings + bookshelves + editions) ───

export function getBookDetails(workKey) {
  const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
  return cached(`ol:detail:${key}`, async () => {
    try {
      const [work, ratings, shelves, editions] = await Promise.all([
        fetch(`${OL_BASE}${key}.json`).then(r => r.json()),
        fetch(`${OL_BASE}${key}/ratings.json`).then(r => r.json()).catch(() => null),
        fetch(`${OL_BASE}${key}/bookshelves.json`).then(r => r.json()).catch(() => null),
        fetch(`${OL_BASE}${key}/editions.json?limit=1`).then(r => r.json()).catch(() => null),
      ]);

      // Resolve authors
      let authors = [];
      if (work.authors && work.authors.length > 0) {
        const authorKeys = work.authors
          .map(a => a.author?.key || a.key)
          .filter(Boolean);
        const authorResults = await Promise.all(
          authorKeys.slice(0, 5).map(aKey =>
            fetch(`${OL_BASE}${aKey}.json`).then(r => r.json()).catch(() => null)
          )
        );
        authors = authorResults.filter(Boolean).map(a => ({
          name: a.name || a.personal_name || 'Unknown',
          key: a.key,
          photo: a.photos?.[0] ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg` : null,
          bio: typeof a.bio === 'string' ? a.bio : a.bio?.value || '',
        }));
      }

      const coverId = work.covers?.[0];
      const desc = typeof work.description === 'string' ? work.description : work.description?.value || '';
      return {
        key: work.key,
        title: work.title,
        description: desc,
        cover_id: coverId,
        poster_path: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
        first_publish_date: work.first_publish_date || '',
        subjects: (work.subjects || []).slice(0, 8),
        rating: ratings?.summary?.average ? Math.round(ratings.summary.average * 20) / 10 : null,
        ratings_count: ratings?.summary?.count || 0,
        want_to_read: shelves?.counts?.want_to_read || 0,
        currently_reading: shelves?.counts?.currently_reading || 0,
        already_read: shelves?.counts?.already_read || 0,
        edition_count: editions?.size || editions?.entries?.length || 0,
        authors,
        media_type: 'book',
      };
    } catch { return null; }
  });
}

// ─── Top 100 Books (by rating, filtered by min votes) ───

export function getTop100Books(subject = null) {
  const key = subject ? `top100:books:${subject}` : 'top100:books';
  return cached(key, async () => {
    try {
      const q = subject ? `subject:${subject}` : 'subject:fiction OR subject:literature';
      const res = await fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=100&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count,want_to_read_count,already_read_count,currently_reading_count,edition_count,subject`);
      const data = await res.json();
      return (data.docs || []).filter(d => (d.ratings_count || 0) >= 10).map(mapOLWork);
    } catch { return []; }
  });
}

// ─── Multi-search ───

export async function multiSearch(query) {
  const [tmdbData, booksRes] = await Promise.all([
    tmdb('/search/multi', `&query=${encodeURIComponent(query)}`),
    fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,first_publish_year`)
      .then(r => r.json()).catch(() => ({ docs: [] })),
  ]);

  const media = (tmdbData.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  const books = (booksRes.docs || []).slice(0, 5).map(mapOLWork);

  return [...media, ...books];
}

// ─── Library (Supabase) ───

export async function getLibrary(filters = {}) {
  let query = supabase.from('library').select('*').order('added_at', { ascending: false });
  if (filters.media_type) query = query.eq('media_type', filters.media_type);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addToLibrary(item) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  // ─ Duplicate check ─
  let dupeQuery = supabase.from('library').select('id').eq('user_id', user.id);
  if (item.tmdb_id) dupeQuery = dupeQuery.eq('tmdb_id', item.tmdb_id);
  else if (item.openlibrary_key) dupeQuery = dupeQuery.eq('openlibrary_key', item.openlibrary_key);
  const { data: existing } = await dupeQuery;
  if (existing && existing.length > 0) throw new Error('Already in your library');

  const { data, error } = await supabase.from('library').insert({
    user_id: user.id,
    status: 'watching',
    ...item,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateLibraryItem(id, updates) {
  // Use maybeSingle so a 0-row result doesn't throw PGRST116
  const { data, error } = await supabase.from('library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message || 'Update failed');
  if (!data) throw new Error('Item not found — it may have been removed');
  return data;
}

export async function removeFromLibrary(id) {
  const { error } = await supabase.from('library').delete().eq('id', id);
  if (error) throw error;
}

// Look up a library item by tmdb_id or openlibrary_key for the current user
export async function getLibraryItemByMediaId({ tmdb_id, openlibrary_key }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let query = supabase.from('library').select('*').eq('user_id', user.id);
  if (tmdb_id) query = query.eq('tmdb_id', tmdb_id);
  else if (openlibrary_key) query = query.eq('openlibrary_key', openlibrary_key);
  else return null;
  const { data } = await query.maybeSingle();
  return data || null;
}

// ─── Curated Picks (high quality, well-rated) ───

const GENRE_MAP = {
  all: '',
  action: '28', comedy: '35', drama: '18', scifi: '878',
  thriller: '53', romance: '10749', horror: '27', animation: '16',
  documentary: '99', crime: '80', fantasy: '14', family: '10751',
};

export async function getCuratedPicks(genre = 'all', page = 1) {
  const genreParam = GENRE_MAP[genre] ? `&with_genres=${GENRE_MAP[genre]}` : '';
  const data = await tmdb('/discover/movie', `&sort_by=vote_average.desc&vote_count.gte=500&vote_average.gte=6${genreParam}&page=${page}`);
  return data.results || [];
}

// ─── AI Scenario Search ───

const SCENARIO_KEYWORDS = {
  'date night': { genres: '10749,35', keywords: '' },
  'date': { genres: '10749,35', keywords: '' },
  'romantic': { genres: '10749', keywords: '' },
  'family': { genres: '10751,16', keywords: '' },
  'kids': { genres: '10751,16', keywords: '' },
  'children': { genres: '10751,16', keywords: '' },
  'scary': { genres: '27', keywords: '' },
  'horror': { genres: '27', keywords: '' },
  'funny': { genres: '35', keywords: '' },
  'laugh': { genres: '35', keywords: '' },
  'comedy': { genres: '35', keywords: '' },
  'cry': { genres: '18,10749', keywords: '' },
  'emotional': { genres: '18,10749', keywords: '' },
  'sad': { genres: '18', keywords: '' },
  'action': { genres: '28', keywords: '' },
  'adrenaline': { genres: '28,53', keywords: '' },
  'escape': { genres: '14,12,878', keywords: '' },
  'mind off': { genres: '28,12,35', keywords: '' },
  'take my mind': { genres: '28,12,35,14', keywords: '' },
  'relax': { genres: '35,10751,10402', keywords: '' },
  'chill': { genres: '35,10402', keywords: '' },
  'thriller': { genres: '53,9648', keywords: '' },
  'suspense': { genres: '53,9648', keywords: '' },
  'mystery': { genres: '9648', keywords: '' },
  'mind bending': { genres: '878,9648', keywords: '' },
  'trippy': { genres: '878,9648', keywords: '' },
  'sci-fi': { genres: '878', keywords: '' },
  'space': { genres: '878', keywords: '1612' },
  'war': { genres: '10752,18', keywords: '' },
  'history': { genres: '36', keywords: '' },
  'true story': { genres: '18,36', keywords: '9672' },
  'based on': { genres: '18', keywords: '9672' },
  'superhero': { genres: '28,878', keywords: '9715' },
  'animated': { genres: '16', keywords: '' },
  'anime': { genres: '16', keywords: '' },
  'documentary': { genres: '99', keywords: '' },
  'learn': { genres: '99,36', keywords: '' },
  'inspiring': { genres: '18', keywords: '9748' },
  'motivat': { genres: '18', keywords: '9748' },
  'adventure': { genres: '12,28', keywords: '' },
  'fantasy': { genres: '14', keywords: '' },
  'magic': { genres: '14', keywords: '' },
  'zombie': { genres: '27', keywords: '12377' },
  'survival': { genres: '28,53', keywords: '10349' },
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

export async function searchByScenario(query) {
  const q = query.toLowerCase().trim();
  let genres = '';
  let keywords = '';

  // Match scenario keywords (longest first for multi-word matches)
  const sorted = Object.entries(SCENARIO_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, config] of sorted) {
    if (q.includes(phrase)) {
      genres = config.genres;
      keywords = config.keywords;
      break;
    }
  }

  if (!genres) {
    // Fallback: TMDB keyword search
    const kwRes = await tmdb('/search/keyword', `&query=${encodeURIComponent(q)}`);
    const kwIds = (kwRes.results || []).slice(0, 3).map(k => k.id).join('|');
    if (kwIds) {
      const data = await tmdb('/discover/movie', `&with_keywords=${kwIds}&sort_by=vote_average.desc&vote_count.gte=100`);
      return (data.results || []).map(r => ({ ...r, media_type: 'movie' }));
    }
    // Last resort: regular search
    const data = await tmdb('/search/movie', `&query=${encodeURIComponent(query)}`);
    return (data.results || []).map(r => ({ ...r, media_type: 'movie' }));
  }

  const kwParam = keywords ? `&with_keywords=${keywords}` : '';
  const [movies, tv] = await Promise.all([
    tmdb('/discover/movie', `&with_genres=${genres}${kwParam}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 3) + 1}`),
    tmdb('/discover/tv', `&with_genres=${genres.replace('10752','10768').replace('10751','10751')}${kwParam}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 2) + 1}`),
  ]);

  const combined = [
    ...(movies.results || []).map(r => ({ ...r, media_type: 'movie' })),
    ...(tv.results || []).map(r => ({ ...r, media_type: 'tv' })),
  ].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  return combined.slice(0, 20);
}

// ─── TMDB Discover by Mood ───

const MOOD_GENRES = {
  light: { movie: '35,10751,10402', tv: '35,10751' }, // Comedy, Family, Music
  dark: { movie: '28,53,27,80', tv: '28,80,9648' }, // Action, Thriller, Horror, Crime
  mind: { movie: '878,9648,14', tv: '878,9648' }, // Sci-Fi, Mystery, Fantasy
  feel: { movie: '10749,18,10402', tv: '10749,18' }, // Romance, Drama, Music
  adventure: { movie: '12,28,14', tv: '10759,14' }, // Adventure, Action, Fantasy
  chill: { movie: '99,36,10770', tv: '99,10764' }, // Documentary, History, Reality
};

export async function discoverByMood(mood, mediaType = 'movie') {
  const genreStr = MOOD_GENRES[mood]?.[mediaType] || MOOD_GENRES.light[mediaType];
  const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
  const data = await tmdb(endpoint, `&with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 3) + 1}`);
  return data.results || [];
}

// ─── Smart Recommendations (based on library) ───

export async function getSmartRecommendations(libraryItems) {
  if (!libraryItems || libraryItems.length === 0) return [];

  // Find highest-rated finished items (prefer user_rating, fallback to external)
  const rated = libraryItems
    .filter(i => i.status === 'finished' && i.media_type !== 'book')
    .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
    .slice(0, 5);

  // Also include items being watched
  const watching = libraryItems
    .filter(i => i.status === 'watching' && i.media_type !== 'book')
    .slice(0, 3);

  const seeds = [...rated, ...watching].slice(0, 6);
  if (seeds.length === 0) return [];

  // Fetch TMDB recommendations for each seed
  const allRecs = await Promise.all(
    seeds.map(async (item) => {
      try {
        const endpoint = item.media_type === 'tv' ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`;
        const data = await tmdb(endpoint, '&append_to_response=recommendations');
        return (data.recommendations?.results || []).map(r => ({
          ...r,
          media_type: r.media_type || item.media_type,
          _source: item.title,
          _sourceRating: item.user_rating || item.external_rating || 0,
        }));
      } catch { return []; }
    })
  );

  // Flatten, deduplicate, remove items already in library
  const libraryIds = new Set(libraryItems.map(i => String(i.tmdb_id)));
  const seen = new Set();
  const unique = allRecs.flat().filter(r => {
    const key = `${r.media_type}-${r.id}`;
    if (seen.has(key) || libraryIds.has(String(r.id))) return false;
    seen.add(key);
    return true;
  });

  // Score: TMDB rating + bonus for coming from highly-rated seeds
  unique.sort((a, b) => {
    const scoreA = (a.vote_average || 0) + (a._sourceRating / 10);
    const scoreB = (b.vote_average || 0) + (b._sourceRating / 10);
    return scoreB - scoreA;
  });

  return unique.slice(0, 20);
}

// ═══════════════════════════════════════════════════════
//  SOCIAL: Profiles, Follows, Activity, Blends
// ═══════════════════════════════════════════════════════

// Preset avatar options — character-style (like Crunchyroll / Spotify)
export const AVATAR_PRESETS = [
  // Adventurer style (cartoon characters)
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Neo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Trinity',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ripley',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Goku',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Totoro',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Yoda',
  // Lorelei style (stylish portraits)
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Sora',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Kai',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Ember',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Storm',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Phoenix',
  // Personas style (full character avatars)
  'https://api.dicebear.com/7.x/personas/svg?seed=Hero',
  'https://api.dicebear.com/7.x/personas/svg?seed=Villain',
  'https://api.dicebear.com/7.x/personas/svg?seed=Sage',
  'https://api.dicebear.com/7.x/personas/svg?seed=Rebel',
  'https://api.dicebear.com/7.x/personas/svg?seed=Ghost',
  'https://api.dicebear.com/7.x/personas/svg?seed=Ninja',
  // Notionists style (minimalist character portraits)
  'https://api.dicebear.com/7.x/notionists/svg?seed=Ace',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Maverick',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Raven',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Atlas',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Echo',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Cipher',
];

// ─── Profiles ───

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return data;
  // Auto-create profile row if it doesn't exist yet
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
  const { data: created, error } = await supabase.from('profiles')
    .upsert({ id: user.id, username }, { onConflict: 'id' })
    .select()
    .single();
  if (error) { console.error('Auto-create profile failed:', error); return null; }
  return created;
}

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  const { data, error } = await supabase.from('profiles')
    .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function searchUsers(query) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);
  return (data || []).filter(p => p.id !== user?.id);
}

// ─── Follows ───

export async function followUser(followingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  const { error } = await supabase.from('follows')
    .insert({ follower_id: user.id, following_id: followingId });
  if (error) throw error;

  // Log activity
  const target = await getProfile(followingId);
  await logActivity({
    action: 'followed',
    title: target?.username || 'someone',
  });
}

export async function unfollowUser(followingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  const { error } = await supabase.from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getFollowing(userId) {
  const { data } = await supabase.from('follows')
    .select('following_id, profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);
  return (data || []).map(d => d.profiles).filter(Boolean);
}

export async function getFollowers(userId) {
  const { data } = await supabase.from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);
  return (data || []).map(d => d.profiles).filter(Boolean);
}

export async function isFollowing(followingId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

// ─── Activity Feed ───

export async function logActivity(entry) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity').insert({ user_id: user.id, ...entry }).select();
}

export async function getFriendActivity(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  // Get who I follow
  const { data: follows } = await supabase.from('follows')
    .select('following_id')
    .eq('follower_id', user.id);
  const followingIds = (follows || []).map(f => f.following_id);
  if (followingIds.length === 0) return [];
  // Get their activity
  const { data } = await supabase.from('activity')
    .select('*, profiles!activity_user_id_fkey(username, avatar_url)')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getMyActivity(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('activity')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── Blends (Spotify-style: shared taste between two users) ───

export async function getBlend(friendId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get both libraries
  const [myLib, friendLib] = await Promise.all([
    supabase.from('library').select('*').eq('user_id', user.id).then(r => r.data || []),
    supabase.from('library').select('*').eq('user_id', friendId).then(r => r.data || []),
  ]);

  // Find shared items
  const myIds = new Set(myLib.map(i => i.tmdb_id || i.openlibrary_key).filter(Boolean));
  const shared = friendLib.filter(i => myIds.has(i.tmdb_id || i.openlibrary_key));

  // Score overlap by genre
  const myGenres = {};
  myLib.forEach(i => (i.genres || '').split(',').forEach(g => {
    const t = g.trim();
    if (t) myGenres[t] = (myGenres[t] || 0) + 1;
  }));
  const friendGenres = {};
  friendLib.forEach(i => (i.genres || '').split(',').forEach(g => {
    const t = g.trim();
    if (t) friendGenres[t] = (friendGenres[t] || 0) + 1;
  }));

  // Shared genres sorted by overlap
  const sharedGenres = Object.keys(myGenres)
    .filter(g => friendGenres[g])
    .map(g => ({ genre: g, overlap: Math.min(myGenres[g], friendGenres[g]) }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5);

  // Compatibility score (0-100)
  const totalPossible = Math.max(myLib.length, friendLib.length, 1);
  const compatibility = Math.min(100, Math.round((shared.length / totalPossible) * 100 + sharedGenres.length * 5));

  // Generate recommendations based on shared genres
  let blendRecs = [];
  if (sharedGenres.length > 0) {
    const topGenre = sharedGenres[0].genre;
    // Try to find the TMDB genre ID
    const genreMap = { 'Action': 28, 'Comedy': 35, 'Drama': 18, 'Horror': 27, 'Romance': 10749, 'Thriller': 53, 'Sci-Fi': 878, 'Animation': 16, 'Crime': 80, 'Documentary': 99, 'Adventure': 12, 'Fantasy': 14, 'Mystery': 9648, 'Science Fiction': 878 };
    const genreId = genreMap[topGenre];
    if (genreId) {
      const recs = await getMoviesByGenre(genreId);
      const bothIds = new Set([...myLib, ...friendLib].map(i => i.tmdb_id).filter(Boolean));
      blendRecs = recs.filter(r => !bothIds.has(r.id)).slice(0, 10);
    }
  }

  return {
    shared,
    sharedGenres,
    compatibility,
    blendRecs,
    myCount: myLib.length,
    friendCount: friendLib.length,
  };
}

// ─── Discover Weekly (personalized recs refreshed weekly) ───

export async function getDiscoverWeekly() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const library = await getLibrary();
  if (library.length < 3) return [];

  // Use top-rated + recently added as seeds
  const seeds = [...library]
    .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
    .slice(0, 5)
    .filter(i => i.tmdb_id);

  if (seeds.length === 0) return [];

  // Fetch recs from TMDB for each seed
  const allRecs = await Promise.all(
    seeds.map(async (seed) => {
      try {
        const mt = seed.media_type === 'tv' ? 'tv' : 'movie';
        const data = await tmdb(`/${mt}/${seed.tmdb_id}/recommendations`);
        return (data.results || []).map(r => ({ ...r, media_type: mt }));
      } catch { return []; }
    })
  );

  // Deduplicate & remove existing library items
  const libIds = new Set(library.map(i => String(i.tmdb_id)));
  const seen = new Set();
  const unique = allRecs.flat().filter(r => {
    const key = `${r.media_type}-${r.id}`;
    if (seen.has(key) || libIds.has(String(r.id))) return false;
    seen.add(key);
    return true;
  });

  // Score and sort
  unique.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  return unique.slice(0, 20);
}

// ─── Friend's Library (public view) ───

export async function getFriendLibrary(userId) {
  const { data } = await supabase.from('library')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return data || [];
}
