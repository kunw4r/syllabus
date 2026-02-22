'use client';

import { getOMDbByTitle } from '@/lib/api/omdb';
import { getMALRating } from '@/lib/api/jikan';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OMDbRatings {
  imdb_id?: string;
  imdb?: { score: string; votes?: string };
  rt?: { score: string };
  metacritic?: { score: string };
  director?: string;
  writer?: string;
  awards?: string;
  boxOffice?: string;
  rated?: string;
  country?: string;
}

interface MALRating {
  score: number | null;
  scored_by?: number;
  mal_id?: number;
  url?: string;
}

interface EnrichProgress {
  completed: number;
  total: number;
  phase: 'enriching' | 'done';
}

/** Minimal shape of a chart / list item coming from TMDB or similar. */
interface MediaItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  unified_rating?: number | null;
  rating?: number;
  genre_ids?: number[];
  genres?: { id: number; name?: string }[];
  original_language?: string;
  overview?: string;
  [key: string]: unknown;
}

interface SlimMediaItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  unified_rating?: number | null;
  genre_ids?: number[];
  genres?: { id: number; name?: string }[];
  original_language?: string;
  overview?: string;
}

interface ChartEntry {
  items: SlimMediaItem[];
  ts: number;
}

interface ChartStore {
  _v: number;
  [chartKey: string]: ChartEntry | number; // _v is number, rest are ChartEntry
}

interface StaticScoreDB {
  [mediaType: string]: {
    [id: string]: { s?: number };
  };
}

// ---------------------------------------------------------------------------
// Score store  (localStorage-based)
// ---------------------------------------------------------------------------

const SCORE_STORE_KEY = 'syllabus_scores';

let _scoreCache: Record<string, number> | null = null;

function getScoreStore(): Record<string, number> {
  if (!_scoreCache) {
    try {
      _scoreCache = JSON.parse(localStorage.getItem(SCORE_STORE_KEY) || '{}');
    } catch {
      _scoreCache = {};
    }
  }
  return _scoreCache!;
}

function _saveScoreStore(): void {
  try {
    localStorage.setItem(SCORE_STORE_KEY, JSON.stringify(_scoreCache));
  } catch {
    /* quota exceeded – best-effort */
  }
}

export function getSyllabusScore(
  mediaType: string,
  id: number | string,
): number | null {
  return getScoreStore()[`${mediaType}:${id}`] ?? null;
}

export function setSyllabusScore(
  mediaType: string,
  id: number | string,
  score: number | null | undefined,
): void {
  if (score == null || !id) return;
  const store = getScoreStore();
  store[`${mediaType}:${id}`] = score;
  _saveScoreStore();
}

export function applyStoredScores<T extends MediaItem>(
  items: T[],
  mediaType: string,
): T[] {
  const store = getScoreStore();
  items.forEach((item) => {
    const key = `${mediaType}:${item.id}`;
    if (store[key] != null) {
      item.unified_rating = store[key];
    }
  });
  return items;
}

// ---------------------------------------------------------------------------
// OMDb cache  (localStorage-based)
// ---------------------------------------------------------------------------

const OMDB_STORE_KEY = 'syllabus_omdb';

let _omdbCache: Record<string, OMDbRatings | null> | null = null;

function getOmdbStore(): Record<string, OMDbRatings | null> {
  if (!_omdbCache) {
    try {
      _omdbCache = JSON.parse(localStorage.getItem(OMDB_STORE_KEY) || '{}');
      let purged = false;
      for (const k of Object.keys(_omdbCache!)) {
        if (_omdbCache![k] === null) {
          delete _omdbCache![k];
          purged = true;
        }
      }
      if (purged) {
        try {
          localStorage.setItem(OMDB_STORE_KEY, JSON.stringify(_omdbCache));
        } catch {
          /* quota */
        }
      }
    } catch {
      _omdbCache = {};
    }
  }
  return _omdbCache!;
}

export function getOmdbEntry(key: string): OMDbRatings | null | undefined {
  return getOmdbStore()[key] ?? undefined;
}

export function saveOmdbEntry(key: string, data: OMDbRatings | null): void {
  const store = getOmdbStore();
  store[key] = data;
  try {
    localStorage.setItem(OMDB_STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

// ---------------------------------------------------------------------------
// Static Score DB loader  (/data/scores.json, 12 h TTL)
// ---------------------------------------------------------------------------

const STATIC_DB_KEY = 'syllabus_static_db_ts';
const STATIC_DB_TTL = 12 * 60 * 60 * 1000;

let _staticDbLoaded = false;

export async function loadStaticScoreDB(): Promise<void> {
  if (_staticDbLoaded) return;
  _staticDbLoaded = true;

  try {
    const lastLoad = parseInt(localStorage.getItem(STATIC_DB_KEY) || '0', 10);
    if (Date.now() - lastLoad < STATIC_DB_TTL) return;
  } catch {
    /* ignore parse errors */
  }

  try {
    const res = await fetch('/data/scores.json');
    if (!res.ok) return;
    const db: StaticScoreDB = await res.json();
    const scoreStore = getScoreStore();
    let merged = 0;

    for (const type of ['movie', 'tv'] as const) {
      const bucket = db[type];
      if (!bucket) continue;
      for (const [id, entry] of Object.entries(bucket)) {
        const key = `${type}:${id}`;
        if (scoreStore[key] == null && entry.s != null) {
          scoreStore[key] = entry.s;
          merged++;
        }
      }
    }

    if (merged > 0) {
      _saveScoreStore();
    }
    localStorage.setItem(STATIC_DB_KEY, String(Date.now()));
  } catch {
    /* network / parse errors – best-effort */
  }
}

// ---------------------------------------------------------------------------
// Chart cache  (localStorage, 24 h TTL)
// ---------------------------------------------------------------------------

const CHART_STORE_KEY = 'syllabus_charts';
const CHART_TTL = 24 * 60 * 60 * 1000;
const CHART_VERSION = 2;

let _chartCache: ChartStore | null = null;

function getChartStore(): ChartStore {
  if (!_chartCache) {
    try {
      const raw = JSON.parse(localStorage.getItem(CHART_STORE_KEY) || '{}');
      if (raw._v !== CHART_VERSION) {
        _chartCache = { _v: CHART_VERSION };
        try {
          localStorage.setItem(CHART_STORE_KEY, JSON.stringify(_chartCache));
        } catch {
          /* quota */
        }
      } else {
        _chartCache = raw as ChartStore;
      }
    } catch {
      _chartCache = { _v: CHART_VERSION };
    }
  }
  return _chartCache!;
}

function saveChart(chartKey: string, items: SlimMediaItem[]): void {
  const store = getChartStore();
  (store as Record<string, unknown>)[chartKey] = { items, ts: Date.now() };
  store._v = CHART_VERSION;
  try {
    localStorage.setItem(CHART_STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getCachedChart(chartKey: string): SlimMediaItem[] | null {
  const entry = getChartStore()[chartKey];
  if (!entry || typeof entry === 'number') return null;
  if (Date.now() - (entry as ChartEntry).ts > CHART_TTL) return null;
  return (entry as ChartEntry).items;
}

export function getChartAge(chartKey: string): number {
  const entry = getChartStore()[chartKey];
  if (!entry || typeof entry === 'number') return Infinity;
  return Date.now() - (entry as ChartEntry).ts;
}

// ---------------------------------------------------------------------------
// Unified rating
// ---------------------------------------------------------------------------

export function computeUnifiedRating(
  omdbData: OMDbRatings | null | undefined,
  malData: MALRating | null | undefined,
  isAnime: boolean,
): number | null {
  const scores: number[] = [];

  if (omdbData?.imdb?.score) {
    const v = parseFloat(omdbData.imdb.score);
    if (!isNaN(v)) scores.push(v);
  }

  if (isAnime) {
    if (malData?.score) scores.push(malData.score);
  } else {
    if (omdbData?.rt?.score) {
      const v = parseInt(omdbData.rt.score, 10);
      if (!isNaN(v)) scores.push(v / 10);
    }
  }

  if (scores.length === 0) return null;
  return parseFloat(
    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
  );
}

// ---------------------------------------------------------------------------
// Chart enrichment
// ---------------------------------------------------------------------------

export async function enrichChart(
  items: MediaItem[],
  mediaType: string,
  chartKey: string | null,
  onProgress: ((progress: EnrichProgress) => void) | null,
): Promise<MediaItem[]> {
  const enriched = items.map((i) => ({ ...i }));
  const scoreStore = getScoreStore();
  const needsFetch: MediaItem[] = [];

  enriched.forEach((item) => {
    const key = `${mediaType}:${item.id}`;
    if (scoreStore[key] != null) {
      item.unified_rating = scoreStore[key];
    } else {
      needsFetch.push(item);
    }
  });

  const total = needsFetch.length;
  let completed = 0;

  if (total > 0 && onProgress) {
    onProgress({ completed: 0, total, phase: 'enriching' });
  }

  const BATCH_SIZE = 3;
  const BATCH_DELAY = 500;
  let rateLimited = false;

  for (let i = 0; i < needsFetch.length && !rateLimited; i += BATCH_SIZE) {
    const batch = needsFetch.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        if (rateLimited) return;

        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const isAnime =
          item.original_language === 'ja' &&
          (item.genre_ids?.includes(16) ||
            item.genres?.some((g) => g.id === 16));

        try {
          const omdb = await getOMDbByTitle(title!, year, mediaType);
          let mal: MALRating | null = null;
          if (isAnime) {
            try {
              mal = await getMALRating(title!);
            } catch {
              /* MAL failures are non-fatal */
            }
          }
          item.unified_rating = computeUnifiedRating(omdb, mal, !!isAnime);
          if (item.unified_rating != null) {
            setSyllabusScore(mediaType, item.id, item.unified_rating);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'OMDB_RATE_LIMIT') {
            rateLimited = true;
          }
        }
      }),
    );

    completed += batch.length;
    if (onProgress) onProgress({ completed, total, phase: 'enriching' });

    if (i + BATCH_SIZE < needsFetch.length) {
      await new Promise<void>((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  // Sort by best available rating descending
  enriched.sort((a, b) => {
    const ra = a.unified_rating ?? a.vote_average ?? a.rating ?? 0;
    const rb = b.unified_rating ?? b.vote_average ?? b.rating ?? 0;
    return rb - ra;
  });

  // Persist a slimmed-down copy in the chart cache
  if (chartKey) {
    const slim: SlimMediaItem[] = enriched.map(
      ({
        id,
        title,
        name,
        poster_path,
        release_date,
        first_air_date,
        vote_average,
        unified_rating,
        genre_ids,
        genres,
        original_language,
        overview,
      }) => ({
        id,
        title,
        name,
        poster_path,
        release_date,
        first_air_date,
        vote_average,
        unified_rating,
        genre_ids,
        genres,
        original_language,
        overview: overview?.slice(0, 200),
      }),
    );
    saveChart(chartKey, slim);
  }

  if (onProgress) onProgress({ completed: total, total, phase: 'done' });
  return enriched;
}

/** Legacy wrapper — enriches items without caching or progress reporting. */
export function enrichItemsWithRatings(
  items: MediaItem[],
  mediaType: string,
): Promise<MediaItem[]> {
  return enrichChart(items, mediaType, null, null);
}
