#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Syllabus Score Enrichment Agent                            ║
 * ║  Builds a pre-computed database of IMDb + RT scores         ║
 * ║  for instant loading on the website (zero live API calls).  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DATA FLOW:
 *   TMDB (tiered: homepage → top100 → year backfill → decade backfill)
 *     → OMDb (IMDb + Rotten Tomatoes scores)
 *     → Jikan/MAL (anime scores, for Japanese animation titles)
 *       → scores.json (static database served via GitHub Pages)
 *         → Website loads on startup (instant scores everywhere)
 *
 * STRATEGY (4 tiers, highest priority first):
 *   Tier 1: Homepage/browse titles (trending, now playing, popular, top rated)
 *   Tier 2: Top 100 candidates (discover by vote_average)
 *   Tier 3: Year backfill (2025 → 2000, ~160 titles per year)
 *   Tier 4: Decade backfill (1990s → 1960s)
 *
 * USAGE:
 *   node scripts/enrich.js                    # Full run (all tiers)
 *   node scripts/enrich.js --limit 100        # Limit OMDb calls
 *   node scripts/enrich.js --movies-only      # Only movies
 *   node scripts/enrich.js --tv-only          # Only TV
 *   node scripts/enrich.js --backfill-only    # Skip Tier 1+2, only backfill
 *
 * RUNS VIA: GitHub Actions daily at 2am UTC (see .github/workflows/enrich.yml)
 */

const fs = require('fs');
const path = require('path');

// ─── Config ───
const TMDB_KEY = process.env.TMDB_KEY || process.env.TMDB_API_KEY || process.env.REACT_APP_TMDB_API_KEY || 'e78b9789ddab05e594a195dc997e9c3f';
const OMDB_KEYS = [
  process.env.OMDB_KEY_1 || process.env.OMDB_API_KEY_1 || '4a3b711b',
  process.env.OMDB_KEY_2 || process.env.OMDB_API_KEY_2 || '91f420c8',
  process.env.OMDB_KEY_3 || process.env.OMDB_API_KEY_3 || '2f3fd1aa',
].filter(Boolean);

const SCORES_PATH = path.resolve(__dirname, '../public/data/scores.json');
const TMDB_BASE = 'https://api.themoviedb.org/3';
const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Backfill boundaries — always start from current year
const BACKFILL_START_YEAR = new Date().getFullYear();
const BACKFILL_END_YEAR = 2000;
const DECADE_START = 1990;
const DECADE_END = 1960;

// Parse CLI args
const args = process.argv.slice(2);
const CALL_LIMIT = parseInt(args.find((_, i, a) => a[i - 1] === '--limit') || '2700');
const MOVIES_ONLY = args.includes('--movies-only');
const TV_ONLY = args.includes('--tv-only');
const BACKFILL_ONLY = args.includes('--backfill-only');

// ─── OMDb key rotation ───
let keyIdx = 0;
const exhausted = new Set();
let totalCalls = 0;

function getKey() {
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const idx = (keyIdx + i) % OMDB_KEYS.length;
    if (!exhausted.has(idx)) return OMDB_KEYS[idx];
  }
  return null; // all exhausted
}

function hasBudget() {
  return totalCalls < CALL_LIMIT && getKey() !== null;
}

async function omdbFetch(params) {
  if (!hasBudget()) return null;

  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const idx = (keyIdx + attempt) % OMDB_KEYS.length;
    if (exhausted.has(idx)) continue;

    const url = `https://www.omdbapi.com/?${params}&apikey=${OMDB_KEYS[idx]}`;
    const res = await fetch(url);
    const data = await res.json();
    totalCalls++;

    if (data.Error === 'Request limit reached!') {
      exhausted.add(idx);
      log(`  ⚠ Key ${idx + 1} exhausted (${totalCalls} calls so far)`);
      continue;
    }
    return data;
  }
  return null;
}

// ─── Jikan/MAL helpers ───
let jikanCalls = 0;

async function jikanFetch(title) {
  const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(title)}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    jikanCalls++;
    const anime = data.data?.[0];
    if (!anime?.score) return null;
    return { score: anime.score, mal_id: anime.mal_id };
  } catch {
    return null;
  }
}

function isAnimeItem(item) {
  return item.original_language === 'ja' &&
    (item.genre_ids?.includes(16) || item.genres?.some(g => g.id === 16));
}

function computeAnimeScore(imdb, malScore) {
  const scores = [];
  if (imdb) scores.push(imdb);
  if (malScore) scores.push(malScore);
  if (scores.length === 0) return null;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

// ─── TMDB helpers ───
async function tmdb(endpoint, extraParams = '') {
  const url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}${extraParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

async function tmdbPages(endpoint, pages = 5, extraParams = '') {
  const results = [];
  for (let p = 1; p <= pages; p++) {
    const data = await tmdb(endpoint, `${extraParams}&page=${p}`);
    results.push(...(data.results || []));
    await sleep(100);
  }
  return results;
}

// ─── Utilities ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function parseOMDb(data) {
  if (!data || data.Response === 'False') return null;
  const result = { imdb_id: data.imdbID };
  (data.Ratings || []).forEach(r => {
    if (r.Source === 'Internet Movie Database') {
      result.imdb = parseFloat(r.Value); // "8.5/10" → 8.5
    } else if (r.Source === 'Rotten Tomatoes') {
      result.rt = parseInt(r.Value); // "99%" → 99
    }
  });
  return (result.imdb || result.rt) ? result : null;
}

function computeScore(omdb) {
  if (!omdb) return null;
  const scores = [];
  if (omdb.imdb) scores.push(omdb.imdb);
  if (omdb.rt) scores.push(omdb.rt / 10);
  if (scores.length === 0) return null;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

// Deduplicate an array of TMDB items by ID
function dedup(items) {
  const seen = new Set();
  return items.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// ─── Score DB helpers ───
function loadExistingScores() {
  try {
    const raw = fs.readFileSync(SCORES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { _meta: {}, movie: {}, tv: {} };
  }
}

function saveScores(db) {
  fs.mkdirSync(path.dirname(SCORES_PATH), { recursive: true });
  fs.writeFileSync(SCORES_PATH, JSON.stringify(db));
}

// ─── Enrichment core ───
// Enrich a list of TMDB items, returns count of new scores added
async function enrichItems(items, type, db) {
  let newScores = 0;
  let animeCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = String(item.id);

    // Skip if already in database
    if (db[type][id]) continue;

    // Check call budget
    if (!hasBudget()) {
      log(`   ⏸  Budget reached (${totalCalls}/${CALL_LIMIT} calls). Stopping tier.`);
      break;
    }

    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const anime = isAnimeItem(item);
    const omdbType = type === 'tv' ? 'series' : 'movie';
    let params = `t=${encodeURIComponent(title)}&type=${omdbType}`;
    if (year) params += `&y=${year}`;

    const omdbData = await omdbFetch(params);
    if (!omdbData) continue;

    const parsed = parseOMDb(omdbData);

    if (anime) {
      // Anime: fetch MAL score via Jikan, compute avg(IMDb, MAL)
      animeCount++;
      const mal = await jikanFetch(title);
      await sleep(1000); // Jikan rate limit: 1 req/sec

      const score = computeAnimeScore(parsed?.imdb, mal?.score);
      if (parsed || score) {
        db[type][id] = {
          t: title,
          s: score,
          i: parsed?.imdb || null,
          r: null,
          m: mal?.score || null,
          ii: parsed?.imdb_id || null,
          y: year || null,
        };
        newScores++;
      }
    } else {
      // Non-anime: existing flow, avg(IMDb, RT/10)
      const score = computeScore(parsed);
      if (parsed || score) {
        db[type][id] = {
          t: title,
          s: score,
          i: parsed?.imdb || null,
          r: parsed?.rt || null,
          ii: parsed?.imdb_id || null,
          y: year || null,
        };
        newScores++;
      }
    }

    // Progress log every 50 items
    if ((i + 1) % 50 === 0) {
      log(`   ${type}: ${i + 1}/${items.length} processed (${newScores} new, ${animeCount} anime, ${totalCalls} OMDb + ${jikanCalls} Jikan calls)`);
    }

    if (!anime) await sleep(200);
  }

  return newScores;
}

// ─── Tier 1: Homepage & Browse titles ───
async function fetchTier1(db) {
  log('\n── TIER 1: Homepage & Browse Titles ──');

  let totalNew = 0;

  if (!TV_ONLY) {
    log('📽  Fetching homepage/browse movies...');
    const [trending, nowPlaying, topRated, popular] = await Promise.all([
      tmdbPages('/trending/movie/week', 2),        // 40 titles
      tmdbPages('/movie/now_playing', 3),           // 60 titles
      tmdbPages('/movie/top_rated', 3),             // 60 titles
      tmdbPages('/movie/popular', 5),               // 100 titles
    ]);
    const animeMovies = await tmdbPages('/discover/movie', 3,
      '&with_genres=16&with_original_language=ja&sort_by=popularity.desc');
    const movies = dedup([...trending, ...nowPlaying, ...topRated, ...popular, ...animeMovies]);
    log(`   ${movies.length} unique movies (${movies.filter(m => !db.movie[String(m.id)]).length} new, incl. anime)`);
    totalNew += await enrichItems(movies, 'movie', db);
  }

  if (!MOVIES_ONLY && hasBudget()) {
    log('📺  Fetching homepage/browse TV...');
    const [trending, airingToday, topRated, popular] = await Promise.all([
      tmdbPages('/trending/tv/week', 2),            // 40 titles
      tmdbPages('/tv/airing_today', 3),             // 60 titles
      tmdbPages('/tv/top_rated', 3),                // 60 titles
      tmdbPages('/tv/popular', 5),                  // 100 titles
    ]);
    const animeTV = await tmdbPages('/discover/tv', 5,
      '&with_genres=16&with_original_language=ja&sort_by=popularity.desc');
    const shows = dedup([...trending, ...airingToday, ...topRated, ...popular, ...animeTV]);
    log(`   ${shows.length} unique TV shows (${shows.filter(s => !db.tv[String(s.id)]).length} new, incl. anime)`);
    totalNew += await enrichItems(shows, 'tv', db);
  }

  log(`   Tier 1 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 2: Top 100 Candidates ───
async function fetchTier2(db) {
  log('\n── TIER 2: Top 100 Candidates ──');

  let totalNew = 0;

  if (!TV_ONLY) {
    log('🏆  Fetching top-voted movies...');
    const topMovies = dedup(await tmdbPages('/discover/movie', 10, '&sort_by=vote_average.desc&vote_count.gte=1000'));
    log(`   ${topMovies.length} movies (${topMovies.filter(m => !db.movie[String(m.id)]).length} new)`);
    totalNew += await enrichItems(topMovies, 'movie', db);
  }

  if (!MOVIES_ONLY && hasBudget()) {
    log('🏆  Fetching top-voted TV...');
    const topTV = dedup(await tmdbPages('/discover/tv', 10, '&sort_by=vote_average.desc&vote_count.gte=500'));
    log(`   ${topTV.length} TV shows (${topTV.filter(s => !db.tv[String(s.id)]).length} new)`);
    totalNew += await enrichItems(topTV, 'tv', db);
  }

  log(`   Tier 2 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 3: Year-Based Backfill ───
async function fetchTier3(db) {
  log('\n── TIER 3: Year-Based Backfill ──');

  const startYear = db._meta.backfillYear ?? BACKFILL_START_YEAR;
  let currentYear = startYear;
  let totalNew = 0;
  let yearsProcessed = 0;

  while (currentYear >= BACKFILL_END_YEAR && hasBudget()) {
    log(`\n📅  Backfilling year ${currentYear}...`);
    let yearNew = 0;

    if (!TV_ONLY && hasBudget()) {
      const movies = dedup(await tmdbPages(
        '/discover/movie', 5,
        `&primary_release_year=${currentYear}&sort_by=popularity.desc&vote_count.gte=50`
      ));
      const newMovies = movies.filter(m => !db.movie[String(m.id)]).length;
      log(`   ${currentYear} movies: ${movies.length} found, ${newMovies} new`);
      yearNew += await enrichItems(movies, 'movie', db);
    }

    if (!MOVIES_ONLY && hasBudget()) {
      const shows = dedup(await tmdbPages(
        '/discover/tv', 3,
        `&first_air_date_year=${currentYear}&sort_by=popularity.desc&vote_count.gte=50`
      ));
      const newShows = shows.filter(s => !db.tv[String(s.id)]).length;
      log(`   ${currentYear} TV: ${shows.length} found, ${newShows} new`);
      yearNew += await enrichItems(shows, 'tv', db);
    }

    totalNew += yearNew;
    yearsProcessed++;
    log(`   ${currentYear} complete: +${yearNew} scores`);

    // Move to next year
    currentYear--;

    // Save progress after each year so we don't lose work on crash
    db._meta.backfillYear = currentYear;
    saveScores(db);
  }

  if (currentYear < BACKFILL_END_YEAR) {
    log(`   Year backfill complete! All years ${BACKFILL_START_YEAR}-${BACKFILL_END_YEAR} covered.`);
    db._meta.backfillYear = 'done';
    db._meta.backfillDoneForYear = BACKFILL_START_YEAR;
  }

  log(`   Tier 3 done: ${yearsProcessed} years, +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 4: Decade Backfill (pre-2000) ───
async function fetchTier4(db) {
  log('\n── TIER 4: Decade Backfill ──');

  const startDecade = db._meta.backfillDecade ?? DECADE_START;
  let currentDecade = startDecade;
  let totalNew = 0;

  while (currentDecade >= DECADE_END && hasBudget()) {
    const decadeEnd = currentDecade + 9;
    log(`\n📅  Backfilling ${currentDecade}s (${currentDecade}-${decadeEnd})...`);
    let decadeNew = 0;

    if (!TV_ONLY && hasBudget()) {
      const movies = dedup(await tmdbPages(
        '/discover/movie', 5,
        `&primary_release_date.gte=${currentDecade}-01-01&primary_release_date.lte=${decadeEnd}-12-31&sort_by=vote_count.desc`
      ));
      const newMovies = movies.filter(m => !db.movie[String(m.id)]).length;
      log(`   ${currentDecade}s movies: ${movies.length} found, ${newMovies} new`);
      decadeNew += await enrichItems(movies, 'movie', db);
    }

    if (!MOVIES_ONLY && hasBudget()) {
      const shows = dedup(await tmdbPages(
        '/discover/tv', 3,
        `&first_air_date.gte=${currentDecade}-01-01&first_air_date.lte=${decadeEnd}-12-31&sort_by=vote_count.desc`
      ));
      const newShows = shows.filter(s => !db.tv[String(s.id)]).length;
      log(`   ${currentDecade}s TV: ${shows.length} found, ${newShows} new`);
      decadeNew += await enrichItems(shows, 'tv', db);
    }

    totalNew += decadeNew;
    log(`   ${currentDecade}s complete: +${decadeNew} scores`);

    // Move to previous decade
    currentDecade -= 10;
    db._meta.backfillDecade = currentDecade;
    saveScores(db);
  }

  if (currentDecade < DECADE_END) {
    log('   Decade backfill complete! All decades covered.');
    db._meta.backfillDecade = 'done';
  }

  log(`   Tier 4 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 5: Genre Deep Dive ───
// Discover titles genre-by-genre with lower vote thresholds
const MOVIE_GENRES = [
  28,12,16,35,80,99,18,10751,14,36,27,10402,9648,10749,878,10770,53,10752,37
];
const TV_GENRES = [
  10759,16,35,80,99,18,10751,10762,9648,10763,10764,10765,10766,10767,10768,37
];

async function fetchTier5(db) {
  log('\n── TIER 5: Genre Deep Dive ──');
  let totalNew = 0;

  // Track which genre+page we're up to so we resume across runs
  const genreState = db._meta.genreCrawl || { movieIdx: 0, moviePage: 1, tvIdx: 0, tvPage: 1 };

  // Movies by genre
  if (!TV_ONLY) {
    let gi = genreState.movieIdx;
    let page = genreState.moviePage;
    while (gi < MOVIE_GENRES.length && hasBudget()) {
      const genreId = MOVIE_GENRES[gi];
      log(`   🎬 Movie genre ${genreId} (page ${page})...`);

      // Fetch several pages per genre, lower vote threshold to catch more
      const pagesToFetch = Math.min(5, Math.floor((CALL_LIMIT - totalCalls) / 40) || 1);
      const items = [];
      for (let p = page; p < page + pagesToFetch && hasBudget(); p++) {
        try {
          const data = await tmdb('/discover/movie', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=20&page=${p}`);
          const results = data.results || [];
          if (results.length === 0) break;
          items.push(...results);
        } catch { break; }
        await sleep(100);
      }

      const unique = dedup(items);
      const newItems = unique.filter(m => !db.movie[String(m.id)]);
      if (newItems.length > 0) {
        log(`   Found ${newItems.length} new movies in genre ${genreId}`);
        totalNew += await enrichItems(newItems, 'movie', db);
      }

      page += pagesToFetch;
      if (page > 25 || items.length === 0) { // TMDB max 500 results (25 pages)
        gi++;
        page = 1;
      }

      genreState.movieIdx = gi;
      genreState.moviePage = page;
      db._meta.genreCrawl = genreState;
      saveScores(db);
    }
  }

  // TV by genre
  if (!MOVIES_ONLY && hasBudget()) {
    let gi = genreState.tvIdx;
    let page = genreState.tvPage;
    while (gi < TV_GENRES.length && hasBudget()) {
      const genreId = TV_GENRES[gi];
      log(`   📺 TV genre ${genreId} (page ${page})...`);

      const pagesToFetch = Math.min(5, Math.floor((CALL_LIMIT - totalCalls) / 40) || 1);
      const items = [];
      for (let p = page; p < page + pagesToFetch && hasBudget(); p++) {
        try {
          const data = await tmdb('/discover/tv', `&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=20&page=${p}`);
          const results = data.results || [];
          if (results.length === 0) break;
          items.push(...results);
        } catch { break; }
        await sleep(100);
      }

      const unique = dedup(items);
      const newItems = unique.filter(s => !db.tv[String(s.id)]);
      if (newItems.length > 0) {
        log(`   Found ${newItems.length} new TV shows in genre ${genreId}`);
        totalNew += await enrichItems(newItems, 'tv', db);
      }

      page += pagesToFetch;
      if (page > 25 || items.length === 0) {
        gi++;
        page = 1;
      }

      genreState.tvIdx = gi;
      genreState.tvPage = page;
      db._meta.genreCrawl = genreState;
      saveScores(db);
    }
  }

  // Reset genre crawl when all genres done so it cycles again next run
  if (genreState.movieIdx >= MOVIE_GENRES.length && genreState.tvIdx >= TV_GENRES.length) {
    log('   All genres crawled! Resetting for next cycle.');
    db._meta.genreCrawl = { movieIdx: 0, moviePage: 1, tvIdx: 0, tvPage: 1 };
  }

  log(`   Tier 5 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 6: Deep Popularity Crawl ───
// Crawl TMDB by popularity with very low vote threshold, paginated across runs
async function fetchTier6(db) {
  log('\n── TIER 6: Deep Popularity Crawl ──');
  let totalNew = 0;

  const crawlState = db._meta.deepCrawl || { moviePage: 1, tvPage: 1 };

  // Movies — crawl by popularity, deep pages
  if (!TV_ONLY && hasBudget()) {
    let page = crawlState.moviePage;
    const maxPage = Math.min(page + 20, 500); // 20 pages per run max
    log(`   🎬 Deep movie crawl starting at page ${page}...`);

    while (page <= maxPage && hasBudget()) {
      try {
        const data = await tmdb('/discover/movie', `&sort_by=popularity.desc&vote_count.gte=10&page=${page}`);
        const results = data.results || [];
        if (results.length === 0) { page = 1; break; } // reset when exhausted

        const newItems = results.filter(m => !db.movie[String(m.id)]);
        if (newItems.length > 0) {
          totalNew += await enrichItems(newItems, 'movie', db);
        }
      } catch { break; }

      page++;
      await sleep(100);
    }

    crawlState.moviePage = page > 500 ? 1 : page;
  }

  // TV — same approach
  if (!MOVIES_ONLY && hasBudget()) {
    let page = crawlState.tvPage;
    const maxPage = Math.min(page + 15, 500);
    log(`   📺 Deep TV crawl starting at page ${page}...`);

    while (page <= maxPage && hasBudget()) {
      try {
        const data = await tmdb('/discover/tv', `&sort_by=popularity.desc&vote_count.gte=10&page=${page}`);
        const results = data.results || [];
        if (results.length === 0) { page = 1; break; }

        const newItems = results.filter(s => !db.tv[String(s.id)]);
        if (newItems.length > 0) {
          totalNew += await enrichItems(newItems, 'tv', db);
        }
      } catch { break; }

      page++;
      await sleep(100);
    }

    crawlState.tvPage = page > 500 ? 1 : page;
  }

  db._meta.deepCrawl = crawlState;
  saveScores(db);

  log(`   Tier 6 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── Tier 7: International & Language Crawl ───
// Discover titles from specific languages/regions often missed
const LANGUAGES = ['ko','hi','es','fr','de','it','pt','zh','th','tr','pl','da','sv','no','nl','fi'];

async function fetchTier7(db) {
  log('\n── TIER 7: International Cinema ──');
  let totalNew = 0;

  const langState = db._meta.langCrawl || { idx: 0, page: 1 };

  while (langState.idx < LANGUAGES.length && hasBudget()) {
    const lang = LANGUAGES[langState.idx];
    let page = langState.page;

    log(`   🌍 Language: ${lang} (page ${page})...`);

    const pagesToFetch = Math.min(5, 25 - page + 1);
    for (let p = page; p < page + pagesToFetch && hasBudget(); p++) {
      try {
        // Movies
        if (!TV_ONLY) {
          const data = await tmdb('/discover/movie', `&with_original_language=${lang}&sort_by=vote_count.desc&vote_count.gte=50&page=${p}`);
          const newMovies = (data.results || []).filter(m => !db.movie[String(m.id)]);
          if (newMovies.length > 0) totalNew += await enrichItems(newMovies, 'movie', db);
        }
        // TV
        if (!MOVIES_ONLY && hasBudget()) {
          const data = await tmdb('/discover/tv', `&with_original_language=${lang}&sort_by=vote_count.desc&vote_count.gte=30&page=${p}`);
          const newShows = (data.results || []).filter(s => !db.tv[String(s.id)]);
          if (newShows.length > 0) totalNew += await enrichItems(newShows, 'tv', db);
        }
      } catch { break; }
      await sleep(100);
    }

    langState.page = page + pagesToFetch;
    if (langState.page > 25) {
      langState.idx++;
      langState.page = 1;
    }

    db._meta.langCrawl = langState;
    saveScores(db);
  }

  // Reset when all languages done
  if (langState.idx >= LANGUAGES.length) {
    log('   All languages crawled! Resetting.');
    db._meta.langCrawl = { idx: 0, page: 1 };
  }

  log(`   Tier 7 done: +${totalNew} new scores (${totalCalls} calls used)`);
  return totalNew;
}

// ─── RT Direct Scraper (fills gaps where OMDb has no RT score) ───
const RT_BASE = 'https://www.rottentomatoes.com';
const RT_LIMIT = parseInt(args.find((_, i, a) => a[i - 1] === '--rt-limit') || '200');
let rtCalls = 0;

function toRTSlug(title) {
  return title.toLowerCase()
    .replace(/[''ʼ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Generate multiple slug variants for better hit rate
function rtSlugVariants(title, year) {
  const base = toRTSlug(title);
  const slugs = [base];

  // Try without "the_" prefix (RT often drops it)
  if (base.startsWith('the_')) slugs.push(base.slice(4));

  // Try with year suffix (RT uses this for remakes/duplicates)
  if (year) slugs.push(`${base}_${year}`);

  // Try with "a_" prefix dropped
  if (base.startsWith('a_')) slugs.push(base.slice(2));

  return slugs;
}

const RT_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

function parseRTScore(html) {
  try {
    const ldMatch = html.match(/application\/ld\+json">([^<]+)/);
    if (!ldMatch) return null;
    const ld = JSON.parse(ldMatch[1]);
    const score = ld.aggregateRating?.ratingValue;
    return score ? parseInt(score) : null;
  } catch {
    return null;
  }
}

async function fetchRTScore(title, type, year) {
  const prefix = type === 'tv' ? '/tv/' : '/m/';
  const slugs = rtSlugVariants(title, year);

  for (const slug of slugs) {
    const url = `${RT_BASE}${prefix}${slug}`;
    try {
      const res = await fetch(url, { headers: RT_HEADERS, redirect: 'follow' });
      rtCalls++;
      if (!res.ok) continue;
      const html = await res.text();
      const score = parseRTScore(html);
      if (score != null) return score;
    } catch {
      continue;
    }
    await sleep(300);
  }
  return null;
}

async function backfillRT(db) {
  log('\n── RT BACKFILL: Filling missing Rotten Tomatoes scores ──');
  let filled = 0;

  // Collect entries missing RT score, prioritize TV (OMDb rarely has RT for TV)
  const missing = [];
  for (const [id, entry] of Object.entries(db.tv)) {
    if (!entry.r && entry.t) missing.push({ id, type: 'tv', entry });
  }
  for (const [id, entry] of Object.entries(db.movie)) {
    if (!entry.r && entry.t) missing.push({ id, type: 'movie', entry });
  }

  log(`   ${missing.length} entries missing RT (${Object.values(db.tv).filter(e => !e.r).length} TV, ${Object.values(db.movie).filter(e => !e.r).length} movies)`);

  const limit = Math.min(missing.length, RT_LIMIT);

  for (let i = 0; i < limit; i++) {
    const { id, type, entry } = missing[i];
    const score = await fetchRTScore(entry.t, type, entry.y);

    if (score != null) {
      entry.r = score;
      // Recompute unified score with RT included
      const scores = [];
      if (entry.i) scores.push(entry.i);
      if (entry.m) scores.push(entry.m); // MAL for anime
      else if (entry.r) scores.push(entry.r / 10); // RT/10 for non-anime
      entry.s = scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : entry.s;
      filled++;
    }

    if ((i + 1) % 50 === 0) {
      log(`   ${i + 1}/${limit} checked (${filled} RT scores found, ${rtCalls} requests)`);
      saveScores(db);
    }

    // Rate limit: ~2 req/sec to be polite
    await sleep(500);
  }

  saveScores(db);
  log(`   RT backfill done: ${filled} new RT scores from ${rtCalls} requests`);
  return filled;
}

// ─── Entry point ───
async function main() {
  console.log('\n' + '═'.repeat(60));
  log('🚀  Syllabus Score Enrichment Agent starting...');
  log(`   Keys: ${OMDB_KEYS.length} | Budget: ${CALL_LIMIT} calls`);
  if (BACKFILL_ONLY) log('   Mode: backfill-only (skipping Tier 1+2)');
  if (MOVIES_ONLY) log('   Mode: movies-only');
  if (TV_ONLY) log('   Mode: tv-only');
  console.log('═'.repeat(60) + '\n');

  // Load existing database
  const db = loadExistingScores();
  if (!db.movie) db.movie = {};
  if (!db.tv) db.tv = {};
  if (!db._meta) db._meta = {};

  const existingMovies = Object.keys(db.movie).length;
  const existingTV = Object.keys(db.tv).length;
  log(`📦  Existing database: ${existingMovies} movies, ${existingTV} TV shows`);
  if (db._meta.backfillYear !== undefined) log(`   Backfill year: ${db._meta.backfillYear}`);
  if (db._meta.backfillDecade !== undefined) log(`   Backfill decade: ${db._meta.backfillDecade}`);

  let totalNew = 0;

  // ── Tier 1: Homepage & Browse (always, unless --backfill-only) ──
  if (!BACKFILL_ONLY && hasBudget()) {
    totalNew += await fetchTier1(db);
  }

  // ── Tier 2: Top 100 Candidates (always, unless --backfill-only) ──
  if (!BACKFILL_ONLY && hasBudget()) {
    totalNew += await fetchTier2(db);
  }

  // ── Tier 3: Year backfill (current year → 2000) ──
  // Auto-reset when a new year starts so we always crawl the latest year
  if (db._meta.backfillYear === 'done' && db._meta.backfillDoneForYear < BACKFILL_START_YEAR) {
    log(`   New year detected (${BACKFILL_START_YEAR}), resetting year backfill...`);
    db._meta.backfillYear = undefined;
  }
  if (hasBudget() && db._meta.backfillYear !== 'done') {
    totalNew += await fetchTier3(db);
  }

  // ── Tier 4: Decade backfill (1990s → 1960s) ──
  if (hasBudget() && db._meta.backfillYear === 'done' && db._meta.backfillDecade !== 'done') {
    totalNew += await fetchTier4(db);
  }

  // ── Tier 5: Genre deep dive (genre-by-genre discovery) ──
  if (hasBudget()) {
    totalNew += await fetchTier5(db);
  }

  // ── Tier 6: Deep popularity crawl (low-threshold, paginated) ──
  if (hasBudget()) {
    totalNew += await fetchTier6(db);
  }

  // ── Tier 7: International cinema (by language) ──
  if (hasBudget()) {
    totalNew += await fetchTier7(db);
  }

  // ── RT Backfill: scrape Rotten Tomatoes directly for missing RT scores ──
  if (!args.includes('--skip-rt')) {
    await backfillRT(db);
  }

  // Count anime entries
  const animeMovies = Object.values(db.movie).filter(e => e.m != null).length;
  const animeTV = Object.values(db.tv).filter(e => e.m != null).length;

  // Update metadata
  db._meta.lastRun = new Date().toISOString();
  db._meta.totalMovies = Object.keys(db.movie).length;
  db._meta.totalTV = Object.keys(db.tv).length;
  db._meta.totalAnime = animeMovies + animeTV;
  db._meta.omdbCallsThisRun = totalCalls;
  db._meta.jikanCallsThisRun = jikanCalls;
  db._meta.rtCallsThisRun = rtCalls;
  db._meta.newScoresThisRun = totalNew;

  // Write final database
  saveScores(db);
  const sizeKB = (Buffer.byteLength(JSON.stringify(db)) / 1024).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  log('✅  Enrichment complete!');
  log(`   📊  ${db._meta.totalMovies} movies + ${db._meta.totalTV} TV shows (${db._meta.totalAnime} anime)`);
  log(`   🆕  ${totalNew} new scores added`);
  log(`   📱  ${totalCalls} OMDb + ${jikanCalls} Jikan + ${rtCalls} RT calls used`);
  log(`   💾  ${SCORES_PATH} (${sizeKB} KB)`);
  if (db._meta.backfillYear !== 'done') {
    log(`   📅  Next backfill year: ${db._meta.backfillYear ?? BACKFILL_START_YEAR}`);
  } else if (db._meta.backfillDecade !== 'done') {
    log(`   📅  Next backfill decade: ${db._meta.backfillDecade}s`);
  } else {
    log(`   🎉  All backfill complete!`);
  }
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('❌ Enrichment failed:', err);
  process.exit(1);
});
