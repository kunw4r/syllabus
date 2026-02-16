import { supabase } from './supabase';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.REACT_APP_TMDB_API_KEY;
const GB_BASE = 'https://www.googleapis.com/books/v1/volumes';

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

// ─── Top 100 (TMDB — 5 pages × 20 = 100) ───

export function getTop100Movies() {
  return cached('top100:movies', async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(p => tmdb('/movie/top_rated', `&page=${p}`))
    );
    return pages.flatMap(p => p.results || []);
  });
}

export function getTop100TV() {
  return cached('top100:tv', async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(p => tmdb('/tv/top_rated', `&page=${p}`))
    );
    return pages.flatMap(p => p.results || []);
  });
}

// ─── Books (Google Books API — fast, huge catalog) ───

function mapGoogleBook(item) {
  const v = item.volumeInfo || {};
  return {
    key: item.id,
    title: v.title || 'Untitled',
    author: v.authors?.[0] || 'Unknown',
    authors: v.authors || [],
    poster_path: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    first_publish_year: v.publishedDate?.slice(0, 4) || '',
    rating: v.averageRating || null,
    ratings_count: v.ratingsCount || 0,
    description: v.description || '',
    categories: v.categories || [],
    pageCount: v.pageCount,
    media_type: 'book',
  };
}

export function getTrendingBooks() {
  return cached('gb:trending', async () => {
    try {
      const res = await fetch(`${GB_BASE}?q=subject:fiction&orderBy=newest&maxResults=20`);
      const data = await res.json();
      return (data.items || []).map(mapGoogleBook).filter(b => b.poster_path);
    } catch { return []; }
  });
}

export function getBooksBySubject(subject) {
  return cached(`gb:subject:${subject}`, async () => {
    try {
      const res = await fetch(`${GB_BASE}?q=subject:${encodeURIComponent(subject)}&orderBy=relevance&maxResults=20`);
      const data = await res.json();
      return (data.items || []).map(mapGoogleBook).filter(b => b.poster_path);
    } catch { return []; }
  });
}

export async function searchBooks(query) {
  try {
    const res = await fetch(`${GB_BASE}?q=${encodeURIComponent(query)}&maxResults=20`);
    const data = await res.json();
    return (data.items || []).map(mapGoogleBook);
  } catch { return []; }
}

// ─── Multi-search ───

export async function multiSearch(query) {
  const [tmdbData, booksRes] = await Promise.all([
    tmdb('/search/multi', `&query=${encodeURIComponent(query)}`),
    fetch(`${GB_BASE}?q=${encodeURIComponent(query)}&maxResults=5`).then(r => r.json()).catch(() => ({ items: [] })),
  ]);

  const media = (tmdbData.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  const books = (booksRes.items || []).map(mapGoogleBook);

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
