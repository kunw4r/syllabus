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

// ─── Library (localStorage) ───

const LIBRARY_KEY = 'syllabus_library';

function readLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLibrary(items) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

export async function getLibrary(filters = {}) {
  let items = readLibrary();
  if (filters.media_type) items = items.filter(i => i.media_type === filters.media_type);
  if (filters.status) items = items.filter(i => i.status === filters.status);
  return items;
}

export async function addToLibrary(item) {
  const items = readLibrary();
  const exists = items.some(i =>
    (item.tmdb_id && i.tmdb_id === item.tmdb_id && i.media_type === item.media_type) ||
    (item.openlibrary_key && i.openlibrary_key === item.openlibrary_key)
  );
  if (exists) throw new Error('Already in library');

  const newItem = {
    id: Date.now(),
    ...item,
    status: 'want',
    added_at: new Date().toISOString(),
  };
  items.unshift(newItem);
  writeLibrary(items);
  return newItem;
}

export async function updateLibraryItem(id, updates) {
  const items = readLibrary();
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    writeLibrary(items);
  }
  return items[idx];
}

export async function removeFromLibrary(id) {
  const items = readLibrary().filter(i => i.id !== id);
  writeLibrary(items);
  return { message: 'Removed' };
}
