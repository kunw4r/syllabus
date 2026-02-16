import { supabase } from './supabase';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.REACT_APP_TMDB_API_KEY;
const OL_BASE = 'https://openlibrary.org';

// ─── TMDB helper ───
async function tmdb(endpoint, params = '') {
  const res = await fetch(`${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}${params}`);
  return res.json();
}

// ─── Movies ───

export async function getTrendingMovies() {
  const data = await tmdb('/trending/movie/week');
  return data.results || [];
}

export async function getUpcomingMovies() {
  const data = await tmdb('/movie/upcoming');
  return data.results || [];
}

export async function searchMovies(query) {
  const data = await tmdb('/search/movie', `&query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export async function getMovieDetails(id) {
  return tmdb(`/movie/${id}`, '&append_to_response=recommendations,credits');
}

// ─── TV Shows ───

export async function getTrendingTV() {
  const data = await tmdb('/trending/tv/week');
  return data.results || [];
}

export async function getAiringTV() {
  const data = await tmdb('/tv/airing_today');
  return data.results || [];
}

export async function searchTV(query) {
  const data = await tmdb('/search/tv', `&query=${encodeURIComponent(query)}`);
  return data.results || [];
}

export async function getTVDetails(id) {
  return tmdb(`/tv/${id}`, '&append_to_response=recommendations,credits');
}

// ─── Movie Discovery ───

export async function getTopRatedMovies() {
  const data = await tmdb('/movie/top_rated');
  return data.results || [];
}

export async function getNowPlayingMovies() {
  const data = await tmdb('/movie/now_playing');
  return data.results || [];
}

export async function getPopularMovies() {
  const data = await tmdb('/movie/popular');
  return data.results || [];
}

export async function getMoviesByGenre(genreId) {
  const data = await tmdb('/discover/movie', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`);
  return data.results || [];
}

// ─── TV Discovery ───

export async function getTopRatedTV() {
  const data = await tmdb('/tv/top_rated');
  return data.results || [];
}

export async function getPopularTV() {
  const data = await tmdb('/tv/popular');
  return data.results || [];
}

export async function getTVByGenre(genreId) {
  const data = await tmdb('/discover/tv', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50`);
  return data.results || [];
}

export async function getAnime() {
  const data = await tmdb('/discover/tv', '&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=50');
  return data.results || [];
}

export async function getAnimationTV() {
  const data = await tmdb('/discover/tv', '&with_genres=16&without_original_language=ja&sort_by=popularity.desc&vote_count.gte=20');
  return data.results || [];
}

// ─── Books (Open Library) ───

export async function getTrendingBooks() {
  try {
    const res = await fetch(`${OL_BASE}/trending/daily.json?limit=20`);
    const data = await res.json();
    return (data.works || []).map(book => ({
      key: book.key,
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      cover_id: book.cover_i,
      poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
      first_publish_year: book.first_publish_year,
    }));
  } catch {
    return [];
  }
}

export async function searchBooks(query) {
  const res = await fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=20`);
  const data = await res.json();
  return (data.docs || []).map(book => ({
    key: book.key,
    title: book.title,
    author: book.author_name?.[0] || 'Unknown',
    cover_id: book.cover_i,
    poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
    first_publish_year: book.first_publish_year,
    rating: book.ratings_average ? Math.round(book.ratings_average * 10) / 10 : null,
    subject: book.subject?.slice(0, 3) || [],
  }));
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
