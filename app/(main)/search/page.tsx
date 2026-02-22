'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Search as SearchIcon } from 'lucide-react';
import { aiSearch, type AISearchResults } from '@/lib/api/ai-search';
import { enrichItemsWithRatings } from '@/lib/scoring';
import SearchBar from '@/components/ui/SearchBar';
import ScrollRow from '@/components/ui/ScrollRow';
import MediaCard from '@/components/ui/MediaCard';
import { SkeletonRow } from '@/components/ui/SkeletonCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [results, setResults] = useState<AISearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(initialQuery);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setCurrentQuery(query);

    try {
      const res = await aiSearch(query);
      setResults(res);

      // Background enrich movies and TV
      if (res.movies.length > 0) {
        enrichItemsWithRatings(res.movies, 'movie').then((enriched) => {
          setResults((prev) => prev ? { ...prev, movies: enriched } : prev);
        });
      }
      if (res.tv.length > 0) {
        enrichItemsWithRatings(res.tv, 'tv').then((enriched) => {
          setResults((prev) => prev ? { ...prev, tv: enriched } : prev);
        });
      }
    } catch {
      // show empty results
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  const handleSearch = (query: string) => {
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url.toString());
    doSearch(query);
  };

  const intentLabel = results?.intent?.type
    ? {
        title_search: 'Title Search',
        mood: 'Mood Search',
        scenario: 'Scenario Search',
        similar_to: 'Similar To',
        natural_language: 'AI Search',
      }[results.intent.type]
    : null;

  const hasResults = results && (
    results.movies.length > 0 ||
    results.tv.length > 0 ||
    results.books.length > 0 ||
    results.semantic.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <SearchBar onSearch={handleSearch} autoFocus placeholder="Search with AI..." />

      {/* Intent badge */}
      {results && intentLabel && (
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-xs text-accent font-medium uppercase tracking-wider">
            {intentLabel}
          </span>
          <span className="text-xs text-white/30">
            for &ldquo;{currentQuery}&rdquo;
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {/* Results */}
      {!loading && results && hasResults && (
        <div className="space-y-6">
          {results.movies.length > 0 && (
            <ScrollRow title={`Movies — "${currentQuery}"`}>
              {results.movies.map((m: any) => (
                <MediaCard key={m.id} item={m} mediaType="movie" />
              ))}
            </ScrollRow>
          )}

          {results.tv.length > 0 && (
            <ScrollRow title={`TV Shows — "${currentQuery}"`}>
              {results.tv.map((m: any) => (
                <MediaCard key={m.id} item={m} mediaType="tv" />
              ))}
            </ScrollRow>
          )}

          {results.books.length > 0 && (
            <ScrollRow title={`Books — "${currentQuery}"`}>
              {results.books.map((b: any) => (
                <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
              ))}
            </ScrollRow>
          )}

          {results.semantic.length > 0 && (
            <ScrollRow title="AI-Powered Matches">
              {results.semantic.map((item: any) => (
                <MediaCard
                  key={`sem-${item.media_type}-${item.id}`}
                  item={item}
                  mediaType={item.media_type === 'tv' ? 'tv' : 'movie'}
                />
              ))}
            </ScrollRow>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && results && !hasResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchIcon size={48} className="text-white/10 mb-4" />
          <h3 className="text-lg font-bold text-white/60 mb-2">No results found</h3>
          <p className="text-sm text-white/30 max-w-md">
            Try a different search like &ldquo;feel good movies&rdquo; or &ldquo;mind bending sci-fi&rdquo;
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !results && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles size={48} className="text-accent/30 mb-4" />
          <h3 className="text-lg font-bold text-white/60 mb-2">AI-Powered Search</h3>
          <p className="text-sm text-white/30 max-w-md">
            Search naturally — try moods, scenarios, or describe what you&apos;re in the mood for
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SkeletonRow />}>
      <SearchContent />
    </Suspense>
  );
}
