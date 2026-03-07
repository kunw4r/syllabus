import { searchMovies, searchTV, searchByScenario, multiSearchTMDB } from '@/lib/api/tmdb';
import { searchBooks } from '@/lib/api/books';

// ─── Query Variation Helpers ───

/** Generate alternate query forms to improve fuzzy matching */
function generateQueryVariations(query: string): string[] {
  const variations: string[] = [];
  const q = query.trim();

  // "and" ↔ "&"
  if (/\band\b/i.test(q)) variations.push(q.replace(/\band\b/gi, '&'));
  if (q.includes('&')) variations.push(q.replace(/&/g, 'and'));

  // Remove common suffixes/prefixes people add: "movie", "film", "show", "series", "the"
  const stripped = q.replace(/\b(the|movie|film|show|series|tv)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (stripped && stripped !== q) variations.push(stripped);

  // Try without punctuation
  const noPunct = q.replace(/[''"".,!?:;-]/g, '').replace(/\s+/g, ' ').trim();
  if (noPunct !== q) variations.push(noPunct);

  // Common double letter misspellings: try collapsing double letters
  const collapsed = q.replace(/(.)\1+/g, '$1');
  if (collapsed !== q.toLowerCase()) variations.push(collapsed);

  // Remove trailing 's' for plurals (e.g. "kappoors" → "kappoor")
  const depluralized = q.replace(/(\w{3,})s\b/gi, '$1');
  if (depluralized !== q) variations.push(depluralized);

  return [...new Set(variations.filter(v => v.length >= 2 && v !== q))];
}

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
    const multiP = multiSearchTMDB(query).catch(() => [] as any[]);
    const titleBooksP = searchBooks(query);
    const intentP = parseIntent(query);
    const scenarioP = searchByScenario(query).catch(() => [] as any[]);
    const semanticP = semanticSearch(query).catch(() => [] as any[]);

    // ── Phase 1: show title results as soon as they arrive ──
    const [titleMovies, titleTV, multiResults, titleBooks] = await Promise.all([titleMoviesP, titleTVP, multiP, titleBooksP]);
    if (cancelled) return;

    // Merge multi-search results into movie/tv buckets
    const multiMovies = multiResults.filter((r: any) => r.media_type === 'movie');
    const multiTV = multiResults.filter((r: any) => r.media_type === 'tv');
    const mergedMovies = deduplicateById([...titleMovies, ...multiMovies]);
    const mergedTV = deduplicateById([...titleTV, ...multiTV]);

    onProgress({
      intent: titleIntent,
      movies: mergedMovies,
      tv: mergedTV,
      books: titleBooks,
      semantic: [],
    });

    // ── Phase 1.5: If few results, try query variations for better fuzzy matching ──
    if (mergedMovies.length + mergedTV.length < 3) {
      const variations = generateQueryVariations(query);
      if (variations.length > 0) {
        const varResults = await Promise.all(
          variations.slice(0, 3).map((v) => multiSearchTMDB(v).catch(() => [] as any[]))
        );
        if (cancelled) return;
        const allVarResults = varResults.flat();
        const varMovies = allVarResults.filter((r: any) => r.media_type === 'movie');
        const varTV = allVarResults.filter((r: any) => r.media_type === 'tv');
        const betterMovies = deduplicateById([...mergedMovies, ...varMovies]);
        const betterTV = deduplicateById([...mergedTV, ...varTV]);
        if (betterMovies.length > mergedMovies.length || betterTV.length > mergedTV.length) {
          onProgress({
            intent: titleIntent,
            movies: betterMovies,
            tv: betterTV,
            books: titleBooks,
            semantic: [],
          });
        }
      }
    }

    // ── Phase 2: wait for AI results (already in-flight) ──
    const [intent, scenarioResults, semantic] = await Promise.all([intentP, scenarioP, semanticP]);
    if (cancelled) return;

    // For plain title searches, we're done
    if (intent.type === 'title_search') {
      logSearch(query, intent, mergedMovies.length + mergedTV.length + titleBooks.length);
      return;
    }

    let movies: any[] = mergedMovies;
    let tv: any[] = mergedTV;

    if (intent.type === 'similar_to') {
      // For "similar to X" — try to get recommendations
      const refTitle = intent.similarTo || query;
      try {
        const simResults = await multiSearchTMDB(refTitle);
        if (simResults.length > 0) {
          const ref = simResults[0];
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
        movies = scenarioMovies.length > 0 ? scenarioMovies : mergedMovies;
        tv = scenarioTV.length > 0 ? scenarioTV : mergedTV;
      } else {
        movies = deduplicateById([...scenarioMovies, ...mergedMovies]);
        tv = deduplicateById([...scenarioTV, ...mergedTV]);
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
