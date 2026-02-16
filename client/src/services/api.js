import { supabase } from './supabase';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.REACT_APP_TMDB_API_KEY;
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
  return tmdbCached(`/movie/${id}`, '&append_to_response=recommendations,credits');
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
  return tmdbCached(`/tv/${id}`, '&append_to_response=recommendations,credits');
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

// ─── Books (Open Library) ───

function mapOLBook(book) {
  return {
    key: book.key,
    title: book.title,
    author: book.author_name?.[0] || book.authors?.[0]?.name || 'Unknown',
    cover_id: book.cover_i || book.cover_id,
    poster_path: (book.cover_i || book.cover_id)
      ? `https://covers.openlibrary.org/b/id/${book.cover_i || book.cover_id}-M.jpg`
      : null,
    first_publish_year: book.first_publish_year,
    rating: book.ratings_average ? Math.round(book.ratings_average * 20) / 10 : null, // scale to /10
    ratings_count: book.ratings_count || 0,
    subject: book.subject?.slice(0, 3) || [],
  };
}

export function getTrendingBooks() {
  return cached('ol:trending', async () => {
    try {
      const res = await fetch(`${OL_BASE}/trending/daily.json?limit=20`);
      const data = await res.json();
      return (data.works || []).map(mapOLBook);
    } catch { return []; }
  });
}

export function getBooksBySubject(subject) {
  return cached(`ol:subject:${subject}`, async () => {
    try {
      const res = await fetch(`${OL_BASE}/subjects/${subject}.json?limit=20`);
      const data = await res.json();
      return (data.works || []).map(w => ({
        key: w.key,
        title: w.title,
        author: w.authors?.[0]?.name || 'Unknown',
        cover_id: w.cover_id,
        poster_path: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg` : null,
        first_publish_year: w.first_publish_year,
        rating: null,
        subject: [subject],
      }));
    } catch { return []; }
  });
}

export async function searchBooks(query) {
  const res = await fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count,subject`);
  const data = await res.json();
  return (data.docs || []).map(mapOLBook);
}

// ─── Multi-search ───

export async function multiSearch(query) {
  const [tmdbData, booksRes] = await Promise.all([
    tmdb('/search/multi', `&query=${encodeURIComponent(query)}`),
    fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
  ]);

  const media = (tmdbData.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  const books = (booksRes.docs || []).slice(0, 5).map(book => ({
    media_type: 'book',
    key: book.key,
    title: book.title,
    author: book.author_name?.[0],
    poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
  }));

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
