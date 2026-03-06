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

// ─── Intent Parsing ───

async function parseIntent(query: string): Promise<ParsedIntent> {
  try {
    const res = await fetch('/api/search/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return { type: 'title_search', originalQuery: query, keywords: [query] };
}

// ─── Semantic Search ───

async function semanticSearch(query: string, mediaType?: string): Promise<any[]> {
  try {
    const res = await fetch('/api/search/semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mediaType, limit: 15 }),
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
// Phase 2: AI-enhanced results layered on top (1-3s)

type ProgressCallback = (results: AISearchResults) => void;

export function aiSearchProgressive(
  query: string,
  onProgress: ProgressCallback,
): { cancel: () => void } {
  let cancelled = false;

  (async () => {
    // ── Phase 1: fast title search (no AI) ──
    const titleIntent: ParsedIntent = { type: 'title_search', originalQuery: query, keywords: [query] };

    const [titleMovies, titleTV, titleBooks] = await Promise.all([
      searchMovies(query),
      searchTV(query),
      searchBooks(query),
    ]);

    if (cancelled) return;

    // Show title results immediately
    onProgress({
      intent: titleIntent,
      movies: titleMovies,
      tv: titleTV,
      books: titleBooks,
      semantic: [],
    });

    // ── Phase 2: AI intent + enhanced results in background ──
    const intent = await parseIntent(query);
    if (cancelled) return;

    // For plain title searches the intent parser agrees — we're already done
    if (intent.type === 'title_search') {
      logSearch(query, intent, titleMovies.length + titleTV.length + titleBooks.length);
      return;
    }

    let movies: any[] = titleMovies;
    let tv: any[] = titleTV;
    let semantic: any[] = [];

    switch (intent.type) {
      case 'mood':
      case 'scenario': {
        const [scenarioResults, sem] = await Promise.all([
          searchByScenario(query),
          semanticSearch(query),
        ]);
        if (cancelled) return;

        movies = scenarioResults.filter((r: any) => r.media_type === 'movie');
        tv = scenarioResults.filter((r: any) => r.media_type === 'tv');
        // Fall back to title results if scenario returned nothing
        if (movies.length === 0) movies = titleMovies;
        if (tv.length === 0) tv = titleTV;
        semantic = sem;
        break;
      }

      case 'similar_to': {
        const refTitle = intent.similarTo || query;
        const [multiResults, sem] = await Promise.all([
          multiSearchTMDB(refTitle),
          semanticSearch(query),
        ]);
        if (cancelled) return;

        if (multiResults.length > 0) {
          const ref = multiResults[0];
          try {
            const mt = ref.media_type === 'tv' ? 'tv' : 'movie';
            const res = await fetch(`/api/tmdb/${mt}/${ref.id}?append_to_response=recommendations`);
            const data = await res.json();
            const recs = (data.recommendations?.results || []).map((r: any) => ({
              ...r,
              media_type: r.media_type || mt,
            }));
            movies = recs.filter((r: any) => r.media_type === 'movie');
            tv = recs.filter((r: any) => r.media_type === 'tv');
          } catch {
            // keep title results
          }
        }
        semantic = sem;
        break;
      }

      case 'natural_language':
      default: {
        const [scenarioResults, sem] = await Promise.all([
          searchByScenario(query),
          semanticSearch(query),
        ]);
        if (cancelled) return;

        const scenarioMovies = scenarioResults.filter((r: any) => r.media_type === 'movie');
        const scenarioTV = scenarioResults.filter((r: any) => r.media_type === 'tv');
        movies = deduplicateById([...scenarioMovies, ...titleMovies]);
        tv = deduplicateById([...scenarioTV, ...titleTV]);
        semantic = sem;
        break;
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
