const express = require('express');
const router = express.Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const OL_BASE = 'https://openlibrary.org';

// Helper for TMDB requests
async function tmdbFetch(endpoint, params = '') {
  const url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}${params}`;
  const res = await fetch(url);
  return res.json();
}

// ──────────── MOVIES ────────────

// Trending movies
router.get('/movies/trending', async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/movie/week');
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upcoming movies
router.get('/movies/upcoming', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/upcoming');
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search movies
router.get('/movies/search', async (req, res) => {
  try {
    const data = await tmdbFetch('/search/movie', `&query=${encodeURIComponent(req.query.q)}`);
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Movie details
router.get('/movies/:id', async (req, res) => {
  try {
    const data = await tmdbFetch(`/movie/${req.params.id}`, '&append_to_response=recommendations,credits');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── TV SHOWS ────────────

// Trending TV
router.get('/tv/trending', async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/tv/week');
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Airing today
router.get('/tv/airing', async (req, res) => {
  try {
    const data = await tmdbFetch('/tv/airing_today');
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search TV
router.get('/tv/search', async (req, res) => {
  try {
    const data = await tmdbFetch('/search/tv', `&query=${encodeURIComponent(req.query.q)}`);
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TV details
router.get('/tv/:id', async (req, res) => {
  try {
    const data = await tmdbFetch(`/tv/${req.params.id}`, '&append_to_response=recommendations,credits');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── BOOKS ────────────

// Search books
router.get('/books/search', async (req, res) => {
  try {
    const response = await fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(req.query.q)}&limit=20`);
    const data = await response.json();
    const books = data.docs.map(book => ({
      key: book.key,
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      cover_id: book.cover_i,
      poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
      first_publish_year: book.first_publish_year,
      rating: book.ratings_average ? Math.round(book.ratings_average * 10) / 10 : null,
      subject: book.subject?.slice(0, 3) || [],
    }));
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trending books (uses subject-based lists)
router.get('/books/trending', async (req, res) => {
  try {
    const response = await fetch(`${OL_BASE}/trending/daily.json?limit=20`);
    const data = await response.json();
    const books = (data.works || []).map(book => ({
      key: book.key,
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      cover_id: book.cover_i,
      poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
      first_publish_year: book.first_publish_year,
    }));
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────── MULTI-SEARCH ────────────

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const [tmdbData, booksRes] = await Promise.all([
      tmdbFetch('/search/multi', `&query=${encodeURIComponent(q)}`),
      fetch(`${OL_BASE}/search.json?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()),
    ]);

    const movies = tmdbData.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    const books = (booksRes.docs || []).slice(0, 5).map(book => ({
      media_type: 'book',
      key: book.key,
      title: book.title,
      author: book.author_name?.[0],
      poster_path: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
    }));

    res.json([...movies, ...books]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
