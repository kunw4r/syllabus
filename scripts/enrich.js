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
].filter(Boolean);

const SCORES_PATH = path.resolve(__dirname, '../public/data/scores.json');
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Backfill boundaries
const BACKFILL_START_YEAR = 2025;
const BACKFILL_END_YEAR = 2000;
const DECADE_START = 1990;
const DECADE_END = 1960;

// Parse CLI args
const args = process.argv.slice(2);
const CALL_LIMIT = parseInt(args.find((_, i, a) => a[i - 1] === '--limit') || '1800');
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
    const omdbType = type === 'tv' ? 'series' : 'movie';
    let params = `t=${encodeURIComponent(title)}&type=${omdbType}`;
    if (year) params += `&y=${year}`;

    const omdbData = await omdbFetch(params);
    if (!omdbData) continue;

    const parsed = parseOMDb(omdbData);
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

    // Progress log every 50 items
    if ((i + 1) % 50 === 0) {
      log(`   ${type}: ${i + 1}/${items.length} processed (${newScores} new, ${totalCalls} calls)`);
    }

    await sleep(200);
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
    const movies = dedup([...trending, ...nowPlaying, ...topRated, ...popular]);
    log(`   ${movies.length} unique movies (${movies.filter(m => !db.movie[String(m.id)]).length} new)`);
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
    const shows = dedup([...trending, ...airingToday, ...topRated, ...popular]);
    log(`   ${shows.length} unique TV shows (${shows.filter(s => !db.tv[String(s.id)]).length} new)`);
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
    log('   Year backfill complete! All years 2025-2000 covered.');
    db._meta.backfillYear = 'done';
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

  // ── Tier 3: Year backfill (2025 → 2000) ──
  if (hasBudget() && db._meta.backfillYear !== 'done') {
    totalNew += await fetchTier3(db);
  }

  // ── Tier 4: Decade backfill (1990s → 1960s) ──
  if (hasBudget() && db._meta.backfillYear === 'done' && db._meta.backfillDecade !== 'done') {
    totalNew += await fetchTier4(db);
  }

  // Update metadata
  db._meta.lastRun = new Date().toISOString();
  db._meta.totalMovies = Object.keys(db.movie).length;
  db._meta.totalTV = Object.keys(db.tv).length;
  db._meta.omdbCallsThisRun = totalCalls;
  db._meta.newScoresThisRun = totalNew;

  // Write final database
  saveScores(db);
  const sizeKB = (Buffer.byteLength(JSON.stringify(db)) / 1024).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  log('✅  Enrichment complete!');
  log(`   📊  ${db._meta.totalMovies} movies + ${db._meta.totalTV} TV shows`);
  log(`   🆕  ${totalNew} new scores added`);
  log(`   📱  ${totalCalls} OMDb API calls used`);
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
