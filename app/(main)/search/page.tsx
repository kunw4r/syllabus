'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Search as SearchIcon } from 'lucide-react';
import { aiSearch, type AISearchResults } from '@/lib/api/ai-search';
import { enrichItemsWithRatings } from '@/lib/scoring';
import { SCENARIO_SUGGESTIONS } from '@/lib/constants';
import SearchBar from '@/components/ui/SearchBar';
import ScrollRow from '@/components/ui/ScrollRow';
import MediaCard from '@/components/ui/MediaCard';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import { FadeInView } from '@/components/motion/FadeInView';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

const MOOD_GRADIENTS: Record<string, string> = {
  'feel good movies': 'from-yellow-500/20 to-orange-500/20',
  'mind bending sci-fi': 'from-purple-500/20 to-blue-500/20',
  'date night picks': 'from-pink-500/20 to-rose-500/20',
  'scary horror films': 'from-red-800/20 to-gray-900/20',
  'funny comedies': 'from-amber-400/20 to-yellow-500/20',
  'inspiring true stories': 'from-sky-400/20 to-blue-500/20',
  'epic adventure films': 'from-emerald-500/20 to-teal-500/20',
  'emotional dramas': 'from-indigo-500/20 to-violet-500/20',
  'classic heist movies': 'from-gray-500/20 to-zinc-600/20',
  'anime to binge watch': 'from-red-400/20 to-pink-500/20',
  'family movie night': 'from-cyan-400/20 to-sky-500/20',
  'thriller suspense': 'from-slate-700/20 to-gray-800/20',
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url.toString());
    doSearch(query);
  };

  const handleMoodClick = (phrase: string) => {
    handleSearch(phrase);
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

  const isMoodSearch = results?.intent?.type === 'mood' || results?.intent?.type === 'scenario';

  const hasResults = results && (
    results.movies.length > 0 ||
    results.tv.length > 0 ||
    results.books.length > 0 ||
    results.semantic.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Search bar - centered hero when no results */}
      {!results && !loading ? (
        <FadeInView>
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <Sparkles size={48} className="text-accent/30 mb-6" />
            <h1 className="font-serif text-3xl sm:text-4xl text-white mb-3">What are you looking for?</h1>
            <p className="text-sm text-white/30 max-w-md mb-8">
              Search naturally — try moods, scenarios, or describe what you&apos;re in the mood for
            </p>
            <div className="w-full max-w-xl">
              <SearchBar onSearch={handleSearch} autoFocus placeholder="Search with AI..." />
            </div>

            {/* Mood discovery cards */}
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-10 w-full max-w-2xl" staggerDelay={0.05}>
              {SCENARIO_SUGGESTIONS.map((s) => (
                <StaggerItem key={s.phrase}>
                  <button
                    onClick={() => handleMoodClick(s.phrase)}
                    className={`w-full p-4 rounded-xl text-left bg-gradient-to-br ${MOOD_GRADIENTS[s.phrase] || 'from-white/5 to-white/[0.02]'} border border-white/[0.06] hover:border-white/15 hover:scale-[1.02] transition-all duration-200`}
                  >
                    <span className="text-2xl mb-2 block">{s.icon}</span>
                    <span className="text-xs font-medium text-white/70">{s.phrase}</span>
                  </button>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeInView>
      ) : (
        <SearchBar onSearch={handleSearch} autoFocus placeholder="Search with AI..." />
      )}

      {/* Thematic header for mood/scenario searches */}
      {results && isMoodSearch && intentLabel && (
        <FadeInView>
          <div className="relative rounded-xl overflow-hidden py-6 px-6 bg-gradient-to-r from-accent/10 via-dark-800 to-dark-800 border border-accent/10">
            <h2 className="font-serif text-2xl text-white mb-1">{intentLabel}</h2>
            <p className="text-sm text-white/40">
              Showing results for &ldquo;{currentQuery}&rdquo;
            </p>
          </div>
        </FadeInView>
      )}

      {/* Intent badge for non-mood searches */}
      {results && !isMoodSearch && intentLabel && (
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

      {/* Results with staggered fade */}
      {!loading && results && hasResults && (
        <div className="space-y-6">
          {results.movies.length > 0 && (
            <FadeInView>
              <ScrollRow title={`Movies \u2014 \u201C${currentQuery}\u201D`}>
                {results.movies.map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="movie" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}

          {results.tv.length > 0 && (
            <FadeInView delay={0.15}>
              <ScrollRow title={`TV Shows \u2014 \u201C${currentQuery}\u201D`}>
                {results.tv.map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="tv" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}

          {results.books.length > 0 && (
            <FadeInView delay={0.3}>
              <ScrollRow title={`Books \u2014 \u201C${currentQuery}\u201D`}>
                {results.books.map((b: any) => (
                  <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}

          {results.semantic.length > 0 && (
            <FadeInView delay={0.45}>
              <ScrollRow title="AI-Powered Matches">
                {results.semantic.map((item: any) => (
                  <MediaCard
                    key={`sem-${item.media_type}-${item.id}`}
                    item={item}
                    mediaType={item.media_type === 'tv' ? 'tv' : 'movie'}
                  />
                ))}
              </ScrollRow>
            </FadeInView>
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
