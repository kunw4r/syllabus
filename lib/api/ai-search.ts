import { searchMovies, searchTV, searchByScenario, multiSearchTMDB } from '@/lib/api/tmdb';
import { searchBooks } from '@/lib/api/books';

// ─── Types ───

export interface ParsedIntent {
  type: 'title_search' | 'mood' | 'scenario' | 'similar_to' | 'natural_language';
  genres?: string[];
  mediaType?: 'movie' | 'tv' | 'book' | null;
  yearRange?: { min?: number; max?: number };
  mood?: string;
  similarTo?: string;
  keywords?: string[];
  originalQuery: string;
}

export interface AISearchResults {
  intent: ParsedIntent;
  movies: any[];
  tv: any[];
  books: any[];
  semantic: any[];
}

// ─── In-memory cache ───

const aiCache = new Map<string, { data: any; ts: number }>();
const AI_CACHE_TTL = 15 * 60 * 1000; // 15min

function aiCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = aiCache.get(key);
  if (entry && Date.now() - entry.ts < AI_CACHE_TTL) return Promise.resolve(entry.data as T);
  return fetcher().then((data) => {
    aiCache.set(key, { data, ts: Date.now() });
    return data;
  });
}

// ─── Intent Parsing ───

function parseIntent(query: string): Promise<ParsedIntent> {
  return aiCached(`intent:${query}`, async () => {
    try {
      const res = await fetch('/api/search/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return await res.json();
    } catch {
      // timeout or network error — fallback to title search
    }
    return { type: 'title_search', originalQuery: query, keywords: [query] };
  });
}

// ─── Semantic Search ───

function semanticSearch(query: string, mediaType?: string): Promise<any[]> {
  return aiCached(`semantic:${query}:${mediaType || ''}`, async () => {
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mediaType, limit: 15 }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).map((r: any) => ({
          ...r,
          id: r.tmdb_id,
          media_type: r.media_type,
          _semantic: true,
          _similarity: r.similarity,
        }));
      }
    } catch {
      // silently fail
    }
    return [];
  });
}

// ─── Search Logger ───

function logSearch(query: string, intent: ParsedIntent, resultCount: number) {
  // Fire and forget
  fetch('/api/search/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      parsedIntent: intent,
      resultCount,
    }),
  }).catch(() => {});
}

// ─── Deduplication ───

function deduplicateById(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.media_type || 'unknown'}-${item.id || item.tmdb_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Progressive Search Orchestrator ───
// Phase 1: instant title results (~200ms)
// Phase 2: AI-enhanced results layered on top — all kicked off in parallel

type ProgressCallback = (results: AISearchResults) => void;

export function aiSearchProgressive(
  query: string,
  onProgress: ProgressCallback,
): { cancel: () => void } {
  let cancelled = false;

  (async () => {
    const titleIntent: ParsedIntent = { type: 'title_search', originalQuery: query, keywords: [query] };

    // Kick off EVERYTHING in parallel — don't wait for intent before starting AI searches
    const titleMoviesP = searchMovies(query);
    const titleTVP = searchTV(query);
    const titleBooksP = searchBooks(query);
    const intentP = parseIntent(query);
    const scenarioP = searchByScenario(query).catch(() => [] as any[]);
    const semanticP = semanticSearch(query).catch(() => [] as any[]);

    // ── Phase 1: show title results as soon as they arrive ──
    const [titleMovies, titleTV, titleBooks] = await Promise.all([titleMoviesP, titleTVP, titleBooksP]);
    if (cancelled) return;

    onProgress({
      intent: titleIntent,
      movies: titleMovies,
      tv: titleTV,
      books: titleBooks,
      semantic: [],
    });

    // ── Phase 2: wait for AI results (already in-flight) ──
    const [intent, scenarioResults, semantic] = await Promise.all([intentP, scenarioP, semanticP]);
    if (cancelled) return;

    // For plain title searches, we're done
    if (intent.type === 'title_search') {
      logSearch(query, intent, titleMovies.length + titleTV.length + titleBooks.length);
      return;
    }

    let movies: any[] = titleMovies;
    let tv: any[] = titleTV;

    if (intent.type === 'similar_to') {
      // For "similar to X" — try to get recommendations
      const refTitle = intent.similarTo || query;
      try {
        const multiResults = await multiSearchTMDB(refTitle);
        if (multiResults.length > 0) {
          const ref = multiResults[0];
          const mt = ref.media_type === 'tv' ? 'tv' : 'movie';
          const res = await fetch(`/api/tmdb/${mt}/${ref.id}?append_to_response=recommendations`);
          const data = await res.json();
          const recs = (data.recommendations?.results || []).map((r: any) => ({
            ...r,
            media_type: r.media_type || mt,
          }));
          movies = recs.filter((r: any) => r.media_type === 'movie');
          tv = recs.filter((r: any) => r.media_type === 'tv');
        }
      } catch {
        // keep title results
      }
    } else {
      // mood / scenario / natural_language — use scenario results
      const scenarioMovies = scenarioResults.filter((r: any) => r.media_type === 'movie');
      const scenarioTV = scenarioResults.filter((r: any) => r.media_type === 'tv');

      if (intent.type === 'mood' || intent.type === 'scenario') {
        movies = scenarioMovies.length > 0 ? scenarioMovies : titleMovies;
        tv = scenarioTV.length > 0 ? scenarioTV : titleTV;
      } else {
        movies = deduplicateById([...scenarioMovies, ...titleMovies]);
        tv = deduplicateById([...scenarioTV, ...titleTV]);
      }
    }

    if (cancelled) return;

    const final: AISearchResults = { intent, movies, tv, books: titleBooks, semantic };
    onProgress(final);

    const totalCount = movies.length + tv.length + titleBooks.length + semantic.length;
    logSearch(query, intent, totalCount);
  })();

  return { cancel: () => { cancelled = true; } };
}


// ─── Auto-Suggest ───

export interface Suggestion {
  text: string;
  type: 'scenario' | 'content';
  icon?: string;
  poster?: string;
  year?: string;
  mediaType?: string;
  tmdbId?: number;
}

export async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      return data.suggestions || [];
    }
  } catch {
    // silently fail
  }
  return [];
}
