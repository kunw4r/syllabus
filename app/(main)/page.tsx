'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Eye, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLibrary } from '@/lib/api/library';
import { getTrendingMovies, getTrendingTV, searchMovies, searchTV } from '@/lib/api/tmdb';
import { getTrendingBooks, searchBooks } from '@/lib/api/books';
import { enrichItemsWithRatings, loadStaticScoreDB, applyStoredScores } from '@/lib/scoring';
import { getAllRecommendations, type RecommendationRow as RecRowType } from '@/lib/services/recommendations';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import EditorialRow from '@/components/ui/EditorialRow';
import SearchBar from '@/components/ui/SearchBar';
import HeroBanner from '@/components/ui/HeroBanner';
import RecommendationRow from '@/components/ui/RecommendationRow';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import { FadeInView } from '@/components/motion/FadeInView';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface LibraryItem {
  id: string;
  title: string;
  media_type?: string;
  status?: string;
  poster_url?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
  user_rating?: number;
  external_rating?: number;
  genres?: string;
  added_at?: string;
  updated_at?: string;
}

interface SearchResultsState {
  movies: any[];
  tv: any[];
  books: any[];
  query: string;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecRowType[]>([]);

  const greetName = user?.user_metadata?.username || user?.email?.split('@')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const load = useCallback(async () => {
    setLoading(true);
    loadStaticScoreDB();

    const [movies, tv, books] = await Promise.all([
      getTrendingMovies(),
      getTrendingTV(),
      getTrendingBooks(),
    ]);

    setTrendingMovies(applyStoredScores(movies, 'movie'));
    setTrendingTV(applyStoredScores(tv, 'tv'));
    setTrendingBooks(books);
    setLoading(false);

    enrichItemsWithRatings(movies, 'movie').then(setTrendingMovies);
    enrichItemsWithRatings(tv, 'tv').then(setTrendingTV);

    if (user) {
      try {
        const lib = await getLibrary();
        setLibrary(lib);

        if (lib.length >= 3) {
          getAllRecommendations(lib).then(setRecommendations).catch(() => {});
        }
      } catch {
        // silently fail
      }
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = async (query: string) => {
    const [movies, tv, books] = await Promise.all([
      searchMovies(query),
      searchTV(query),
      searchBooks(query),
    ]);
    setSearchResults({ movies, tv, books, query });
  };

  const continueWatching = library.filter((i) => i.status === 'watching').slice(0, 20);
  const watchlist = library.filter((i) => i.status === 'want').slice(0, 20);
  const finishedCount = library.filter((i) => i.status === 'finished').length;

  const navigateToItem = (item: LibraryItem) => {
    const mt = item.media_type || 'movie';
    if (mt === 'book') {
      const k = item.openlibrary_key?.replace('/works/', '');
      if (k) router.push(`/details/book/${k}`);
    } else {
      router.push(`/details/${mt}/${item.tmdb_id}`);
    }
  };

  const heroItems = trendingMovies
    .filter((m) => m.backdrop_path && (m.vote_average || 0) >= 6)
    .slice(0, 5)
    .map((m) => ({ ...m, media_type: 'movie' }));

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      {!loading && heroItems.length > 0 && !searchResults && (
        <HeroBanner items={heroItems} />
      )}

      {/* Greeting */}
      <FadeInView>
        <div>
          <h1 className={`font-black text-white ${heroItems.length > 0 && !searchResults ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
            {greeting}{greetName ? `, ${greetName}` : ''}
          </h1>
          <p className="text-sm text-white/40 mt-1">Discover something new today</p>
        </div>
      </FadeInView>

      {/* Stats */}
      {user && library.length > 0 && (
        <StaggerContainer className="grid grid-cols-3 gap-3">
          <StaggerItem>
            <div
              className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => router.push('/library')}
            >
              <Library size={20} className="text-accent" />
              <div>
                <p className="text-xl font-black">{library.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">In Library</p>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div
              className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => router.push('/library')}
            >
              <Eye size={20} className="text-blue-400" />
              <div>
                <p className="text-xl font-black">{continueWatching.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">In Progress</p>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div
              className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => router.push('/library')}
            >
              <CheckCircle2 size={20} className="text-green-400" />
              <div>
                <p className="text-xl font-black">{finishedCount}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Finished</p>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Search */}
      <FadeInView delay={0.1}>
        <SearchBar onSearch={handleSearch} placeholder="Search movies, TV shows & books..." />
      </FadeInView>

      {/* Search results */}
      {searchResults && (
        <div className="space-y-6">
          {searchResults.movies.length > 0 && (
            <FadeInView>
              <ScrollRow title={`Movies \u2014 \u201C${searchResults.query}\u201D`}>
                {searchResults.movies.map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="movie" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}
          {searchResults.tv.length > 0 && (
            <FadeInView delay={0.1}>
              <ScrollRow title={`TV Shows \u2014 \u201C${searchResults.query}\u201D`}>
                {searchResults.tv.map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="tv" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}
          {searchResults.books.length > 0 && (
            <FadeInView delay={0.2}>
              <ScrollRow title={`Books \u2014 \u201C${searchResults.query}\u201D`}>
                {searchResults.books.map((b: any) => (
                  <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
                ))}
              </ScrollRow>
            </FadeInView>
          )}
        </div>
      )}

      {/* Continue Watching — Spotlight shelf */}
      {continueWatching.length > 0 && (
        <FadeInView>
          <section className="glass-premium rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Continue Watching</h2>
              <button
                onClick={() => router.push('/library?tab=watching')}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
              >
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {continueWatching.map((item) => (
                <div
                  key={item.id}
                  className="shrink-0 w-[160px] sm:w-[180px] cursor-pointer group"
                  onClick={() => navigateToItem(item)}
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/30 transition-all duration-300">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                        {(item.media_type || 'movie') === 'book' ? '\u{1F4D6}' : '\u{1F3AC}'}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-white/70 truncate group-hover:text-accent transition-colors">
                    {item.title}
                  </p>
                  {item.updated_at && (
                    <p className="text-[10px] text-white/25">
                      {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </FadeInView>
      )}

      {/* Recommendation rows */}
      {!searchResults && recommendations.length > 0 && (
        recommendations.map((row, i) => (
          <FadeInView key={`${row.strategy}-${i}`} delay={i * 0.05}>
            <RecommendationRow row={row} />
          </FadeInView>
        ))
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <FadeInView>
          <ScrollRow title="Your Watchlist">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="shrink-0 w-[140px] sm:w-[160px] cursor-pointer group"
                onClick={() => navigateToItem(item)}
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/30 transition-all duration-300">
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                      {(item.media_type || 'movie') === 'book' ? '\u{1F4D6}' : '\u{1F3AC}'}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-white/70 truncate group-hover:text-accent transition-colors">
                  {item.title}
                </p>
              </div>
            ))}
          </ScrollRow>
        </FadeInView>
      )}

      {/* Trending */}
      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : (
        <>
          <FadeInView>
            <EditorialRow title="Trending Movies" items={trendingMovies} mediaType="movie" />
          </FadeInView>
          <FadeInView delay={0.1}>
            <EditorialRow title="Trending TV Shows" items={trendingTV} mediaType="tv" />
          </FadeInView>
          <FadeInView delay={0.2}>
            <ScrollRow title="Trending Books">
              {trendingBooks.map((b: any) => (
                <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
              ))}
            </ScrollRow>
          </FadeInView>
        </>
      )}
    </div>
  );
}
