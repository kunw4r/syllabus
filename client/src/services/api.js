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
  return tmdbCached(`/movie/${id}`, '&append_to_response=recommendations,credits,watch/providers,external_ids');
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
  return tmdbCached(`/tv/${id}`, '&append_to_response=recommendations,credits,watch/providers,external_ids');
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

export function getOMDbRatings(imdbId) {
  if (!imdbId) return Promise.resolve(null);
  return cached(`omdb:${imdbId}`, async () => {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data.Response === 'False') return null;
      const ratings = { imdb_id: imdbId };
      (data.Ratings || []).forEach(r => {
        if (r.Source === 'Internet Movie Database') {
          ratings.imdb = { score: r.Value, votes: data.imdbVotes };
        } else if (r.Source === 'Rotten Tomatoes') {
          ratings.rt = { score: r.Value };
        }
      });
      return ratings;
    } catch { return null; }
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
  const { data, error } = await supabase.from('library').insert({
    user_id: user.id,
    ...item,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateLibraryItem(id, updates) {
  const { data, error } = await supabase.from('library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromLibrary(id) {
  const { error } = await supabase.from('library').delete().eq('id', id);
  if (error) throw error;
}
