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

// ─── Main Search Orchestrator ───

export async function aiSearch(query: string): Promise<AISearchResults> {
  const intent = await parseIntent(query);

  let movies: any[] = [];
  let tv: any[] = [];
  let books: any[] = [];
  let semantic: any[] = [];

  switch (intent.type) {
    case 'title_search': {
      // Standard search across all types
      const [m, t, b] = await Promise.all([
        searchMovies(query),
        searchTV(query),
        searchBooks(query),
      ]);
      movies = m;
      tv = t;
      books = b;
      break;
    }

    case 'mood':
    case 'scenario': {
      // Scenario search + semantic + books
      const [scenarioResults, sem, b] = await Promise.all([
        searchByScenario(query),
        semanticSearch(query),
        searchBooks(intent.keywords?.join(' ') || query),
      ]);

      // Split scenario results by media type
      movies = scenarioResults.filter((r: any) => r.media_type === 'movie');
      tv = scenarioResults.filter((r: any) => r.media_type === 'tv');
      books = b;
      semantic = sem;
      break;
    }

    case 'similar_to': {
      // Find the reference title, then get recommendations + semantic
      const refTitle = intent.similarTo || query;
      const [multiResults, sem] = await Promise.all([
        multiSearchTMDB(refTitle),
        semanticSearch(query),
      ]);

      // If we found the reference, get its recommendations
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
          // Fall through to semantic
        }
      }

      semantic = sem;
      break;
    }

    case 'natural_language':
    default: {
      // Hybrid: scenario + title search + semantic
      const [scenarioResults, m, t, b, sem] = await Promise.all([
        searchByScenario(query),
        searchMovies(query),
        searchTV(query),
        searchBooks(query),
        semanticSearch(query),
      ]);

      // Merge scenario with title results (scenario first)
      const scenarioMovies = scenarioResults.filter((r: any) => r.media_type === 'movie');
      const scenarioTV = scenarioResults.filter((r: any) => r.media_type === 'tv');

      movies = deduplicateById([...scenarioMovies, ...m]);
      tv = deduplicateById([...scenarioTV, ...t]);
      books = b;
      semantic = sem;
      break;
    }
  }

  const totalCount = movies.length + tv.length + books.length + semantic.length;
  logSearch(query, intent, totalCount);

  return { intent, movies, tv, books, semantic };
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
