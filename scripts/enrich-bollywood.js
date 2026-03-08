#!/usr/bin/env node
/**
 * Bollywood & Indian Cinema Enrichment
 * Fetches Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali movies & TV from TMDB
 * and enriches with OMDb scores.
 */
const fs = require('fs');
const path = require('path');

const TMDB_KEY = process.env.TMDB_KEY || process.env.TMDB_API_KEY || 'e78b9789ddab05e594a195dc997e9c3f';
const OMDB_KEYS = [
  process.env.OMDB_KEY_1 || process.env.OMDB_API_KEY_1 || '4a3b711b',
  process.env.OMDB_KEY_2 || process.env.OMDB_API_KEY_2 || '91f420c8',
  process.env.OMDB_KEY_3 || process.env.OMDB_API_KEY_3 || '2f3fd1aa',
].filter(Boolean);

const SCORES_PATH = path.resolve(__dirname, '../public/data/scores.json');
const TMDB_BASE = 'https://api.themoviedb.org/3';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Indian languages to crawl
const INDIAN_LANGS = [
  { code: 'hi', name: 'Hindi/Bollywood' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'bn', name: 'Bengali' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'mr', name: 'Marathi' },
];

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// OMDb
let keyIdx = 0;
const exhausted = new Set();
let totalCalls = 0;
const CALL_LIMIT = 1500;

function getKey() {
  for (let i = 0; i < OMDB_KEYS.length; i++) {
    const idx = (keyIdx + i) % OMDB_KEYS.length;
    if (!exhausted.has(idx)) return OMDB_KEYS[idx];
  }
  return null;
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
      log(`  Key ${idx + 1} exhausted (${totalCalls} calls)`);
      continue;
    }
    return data;
  }
  return null;
}

function parseOMDb(data) {
  if (!data || data.Response === 'False') return null;
  const result = { imdb_id: data.imdbID };
  (data.Ratings || []).forEach(r => {
    if (r.Source === 'Internet Movie Database') result.imdb = parseFloat(r.Value);
    else if (r.Source === 'Rotten Tomatoes') result.rt = parseInt(r.Value);
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

// TMDB
async function tmdb(endpoint, extraParams = '') {
  const url = `${TMDB_BASE}${endpoint}?api_key=${TMDB_KEY}${extraParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

async function tmdbPages(endpoint, pages, extraParams = '') {
  const results = [];
  for (let p = 1; p <= pages; p++) {
    const data = await tmdb(endpoint, `${extraParams}&page=${p}`);
    results.push(...(data.results || []));
    await sleep(100);
  }
  return results;
}

function dedup(items) {
  const seen = new Set();
  return items.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

// Score DB
function loadScores() {
  try { return JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8')); }
  catch { return { _meta: {}, movie: {}, tv: {} }; }
}

function saveScores(db) {
  fs.mkdirSync(path.dirname(SCORES_PATH), { recursive: true });
  fs.writeFileSync(SCORES_PATH, JSON.stringify(db));
}

async function enrichItems(items, type, db) {
  let newScores = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = String(item.id);
    if (db[type][id]) continue;
    if (!hasBudget()) { log(`   Budget reached`); break; }

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
        t: title, s: score,
        i: parsed?.imdb || null, r: parsed?.rt || null,
        ii: parsed?.imdb_id || null, y: year || null,
      };
      newScores++;
    }

    if ((i + 1) % 50 === 0) {
      log(`   ${type}: ${i + 1}/${items.length} (${newScores} new, ${totalCalls} calls)`);
    }
    await sleep(200);
  }
  return newScores;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('Bollywood & Indian Cinema Enrichment');
  console.log('='.repeat(60) + '\n');

  const db = loadScores();
  if (!db.movie) db.movie = {};
  if (!db.tv) db.tv = {};
  if (!db._meta) db._meta = {};

  log(`Existing: ${Object.keys(db.movie).length} movies, ${Object.keys(db.tv).length} TV`);

  let totalNew = 0;

  for (const lang of INDIAN_LANGS) {
    if (!hasBudget()) break;
    log(`\n--- ${lang.name} (${lang.code}) ---`);

    // Movies: popular + top rated + recent
    const movies = dedup([
      ...(await tmdbPages('/discover/movie', 10, `&with_original_language=${lang.code}&sort_by=popularity.desc&vote_count.gte=10`)),
      ...(await tmdbPages('/discover/movie', 5, `&with_original_language=${lang.code}&sort_by=vote_average.desc&vote_count.gte=50`)),
      ...(await tmdbPages('/discover/movie', 5, `&with_original_language=${lang.code}&sort_by=primary_release_date.desc&vote_count.gte=5`)),
    ]);
    const newMovies = movies.filter(m => !db.movie[String(m.id)]).length;
    log(`   ${movies.length} movies found (${newMovies} new)`);
    if (newMovies > 0 && hasBudget()) {
      totalNew += await enrichItems(movies, 'movie', db);
    }

    // TV shows
    if (hasBudget()) {
      const shows = dedup([
        ...(await tmdbPages('/discover/tv', 5, `&with_original_language=${lang.code}&sort_by=popularity.desc&vote_count.gte=5`)),
        ...(await tmdbPages('/discover/tv', 3, `&with_original_language=${lang.code}&sort_by=vote_average.desc&vote_count.gte=20`)),
      ]);
      const newShows = shows.filter(s => !db.tv[String(s.id)]).length;
      log(`   ${shows.length} TV shows found (${newShows} new)`);
      if (newShows > 0 && hasBudget()) {
        totalNew += await enrichItems(shows, 'tv', db);
      }
    }

    saveScores(db);
  }

  // Update meta
  db._meta.lastBollywoodRun = new Date().toISOString();
  db._meta.totalMovies = Object.keys(db.movie).length;
  db._meta.totalTV = Object.keys(db.tv).length;
  saveScores(db);

  console.log('\n' + '='.repeat(60));
  log(`Done! +${totalNew} new scores (${totalCalls} OMDb calls)`);
  log(`Total: ${db._meta.totalMovies} movies + ${db._meta.totalTV} TV shows`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
