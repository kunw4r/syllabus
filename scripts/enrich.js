#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Syllabus Score Enrichment Agent                            ║
 * ║  Builds a pre-computed database of IMDb + RT scores         ║
 * ║  for instant loading on the website (zero live API calls).  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DATA FLOW:
 *   TMDB (top rated/popular/now playing)
 *     → OMDb (IMDb + Rotten Tomatoes scores)
 *       → scores.json (static database served via GitHub Pages)
 *         → Website loads on startup (instant scores everywhere)
 *
 * USAGE:
 *   node scripts/enrich.js                    # Full run
 *   node scripts/enrich.js --limit 100        # Limit OMDb calls
 *   node scripts/enrich.js --movies-only      # Only movies
 *   node scripts/enrich.js --tv-only          # Only TV
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
].filter(Boolean);

const SCORES_PATH = path.resolve(__dirname, '../public/data/scores.json');
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Parse CLI args
const args = process.argv.slice(2);
const CALL_LIMIT = parseInt(args.find((_, i, a) => a[i - 1] === '--limit') || '1800');
const MOVIES_ONLY = args.includes('--movies-only');
const TV_ONLY = args.includes('--tv-only');

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

async function omdbFetch(params) {
  if (totalCalls >= CALL_LIMIT) return null;
  const key = getKey();
  if (!key) return null;

  for (let attempt = 0; attempt < OMDB_KEYS.length; attempt++) {
    const k = OMDB_KEYS[(keyIdx + attempt) % OMDB_KEYS.length];
    if (exhausted.has((keyIdx + attempt) % OMDB_KEYS.length)) continue;

    const url = `https://www.omdbapi.com/?${params}&apikey=${k}`;
    const res = await fetch(url);
    const data = await res.json();
    totalCalls++;

    if (data.Error === 'Request limit reached!') {
      exhausted.add((keyIdx + attempt) % OMDB_KEYS.length);
      log(`  ⚠ Key ${attempt + 1} exhausted (${totalCalls} calls so far)`);
      continue;
    }
    return data;
  }
  return null;
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

// ─── Main enrichment logic ───
async function loadExistingScores() {
  try {
    const raw = fs.readFileSync(SCORES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { _meta: {}, movie: {}, tv: {} };
  }
}

async function fetchTMDBCatalog() {
  const catalog = { movie: [], tv: [] };

  if (!TV_ONLY) {
    log('📽  Fetching TMDB movies...');
    const [topRated, popular, nowPlaying, trending, topVoted] = await Promise.all([
      tmdbPages('/movie/top_rated', 10),      // 200 movies
      tmdbPages('/movie/popular', 5),          // 100 movies
      tmdbPages('/movie/now_playing', 3),      // 60 movies
      tmdbPages('/trending/movie/week', 3),    // 60 movies
      // Top 100 source: discover sorted by vote_average — ensures coverage
      tmdbPages('/discover/movie', 5, '&sort_by=vote_average.desc&vote_count.gte=1000'), // 100 movies
    ]);
    // Deduplicate by ID
    const seen = new Set();
    [...topRated, ...popular, ...nowPlaying, ...trending, ...topVoted].forEach(m => {
      if (!seen.has(m.id)) { seen.add(m.id); catalog.movie.push(m); }
    });
    log(`   Found ${catalog.movie.length} unique movies`);
  }

  if (!MOVIES_ONLY) {
    log('📺  Fetching TMDB TV shows...');
    const [topRated, popular, trending, topVoted] = await Promise.all([
      tmdbPages('/tv/top_rated', 10),          // 200 shows
      tmdbPages('/tv/popular', 5),             // 100 shows
      tmdbPages('/trending/tv/week', 3),       // 60 shows
      // Top 100 source: discover sorted by vote_average — ensures coverage
      tmdbPages('/discover/tv', 5, '&sort_by=vote_average.desc&vote_count.gte=500'), // 100 shows
    ]);
    const seen = new Set();
    [...topRated, ...popular, ...trending, ...topVoted].forEach(s => {
      if (!seen.has(s.id)) { seen.add(s.id); catalog.tv.push(s); }
    });
    log(`   Found ${catalog.tv.length} unique TV shows`);
  }

  return catalog;
}

async function enrichCatalog(catalog, db) {
  const types = [];
  if (!TV_ONLY) types.push(['movie', catalog.movie]);
  if (!MOVIES_ONLY) types.push(['tv', catalog.tv]);

  let newScores = 0;
  let skipped = 0;

  for (const [type, items] of types) {
    log(`\n🔍  Enriching ${items.length} ${type === 'movie' ? 'movies' : 'TV shows'}...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = String(item.id);

      // Skip if already in database
      if (db[type][id]) { skipped++; continue; }

      // Check call budget
      if (totalCalls >= CALL_LIMIT || getKey() === null) {
        log(`   ⏸  Budget reached (${totalCalls}/${CALL_LIMIT} calls). Stopping.`);
        return { newScores, skipped };
      }

      // Get IMDb ID from TMDB
      const title = item.title || item.name;
      const year = (item.release_date || item.first_air_date || '').slice(0, 4);

      // Try by title first (no need for extra TMDB call for imdb_id)
      const omdbType = type === 'tv' ? 'series' : 'movie';
      let params = `t=${encodeURIComponent(title)}&type=${omdbType}`;
      if (year) params += `&y=${year}`;

      const omdbData = await omdbFetch(params);
      if (!omdbData) { skipped++; continue; }

      const parsed = parseOMDb(omdbData);
      const score = computeScore(parsed);

      if (parsed || score) {
        db[type][id] = {
          t: title,                                    // title
          s: score,                                    // syllabus score
          i: parsed?.imdb || null,                     // imdb score
          r: parsed?.rt || null,                       // rotten tomatoes %
          ii: parsed?.imdb_id || null,                 // imdb id
          y: year || null,                             // year
        };
        newScores++;
      }

      // Progress log every 50 items
      if ((i + 1) % 50 === 0) {
        log(`   ${type}: ${i + 1}/${items.length} processed (${newScores} new, ${totalCalls} API calls)`);
      }

      // Throttle: 200ms between calls to be respectful
      await sleep(200);
    }
  }

  return { newScores, skipped };
}

// ─── Entry point ───
async function main() {
  console.log('\n' + '═'.repeat(60));
  log('🚀  Syllabus Score Enrichment Agent starting...');
  log(`   Keys: ${OMDB_KEYS.length} | Budget: ${CALL_LIMIT} calls`);
  console.log('═'.repeat(60) + '\n');

  // Load existing database
  const db = await loadExistingScores();
  const existingMovies = Object.keys(db.movie || {}).length;
  const existingTV = Object.keys(db.tv || {}).length;
  log(`📦  Existing database: ${existingMovies} movies, ${existingTV} TV shows`);

  // Fetch TMDB catalog
  const catalog = await fetchTMDBCatalog();

  // Enrich with OMDb scores
  const { newScores, skipped } = await enrichCatalog(catalog, db);

  // Update metadata
  db._meta = {
    lastRun: new Date().toISOString(),
    totalMovies: Object.keys(db.movie).length,
    totalTV: Object.keys(db.tv).length,
    omdbCallsThisRun: totalCalls,
    newScoresThisRun: newScores,
  };

  // Write the database
  fs.mkdirSync(path.dirname(SCORES_PATH), { recursive: true });
  fs.writeFileSync(SCORES_PATH, JSON.stringify(db));
  const sizeKB = (Buffer.byteLength(JSON.stringify(db)) / 1024).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  log('✅  Enrichment complete!');
  log(`   📊  ${db._meta.totalMovies} movies + ${db._meta.totalTV} TV shows`);
  log(`   🆕  ${newScores} new scores added`);
  log(`   📱  ${totalCalls} OMDb API calls used`);
  log(`   💾  ${SCORES_PATH} (${sizeKB} KB)`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('❌ Enrichment failed:', err);
  process.exit(1);
});
