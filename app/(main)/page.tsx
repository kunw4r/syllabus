'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Eye, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLibrary } from '@/lib/api/library';
import { getTrendingMovies, getTrendingTV, searchMovies, searchTV } from '@/lib/api/tmdb';
import { getTrendingBooks, searchBooks } from '@/lib/api/books';
import { enrichItemsWithRatings, loadStaticScoreDB, applyStoredScores } from '@/lib/scoring';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import SearchBar from '@/components/ui/SearchBar';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import { TMDB_IMG } from '@/lib/constants';

interface LibraryItem {
  id: string;
  title: string;
  media_type?: string;
  status?: string;
  poster_url?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
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

    // Phase 1: instant render with stored scores (zero OMDb calls)
    setTrendingMovies(applyStoredScores(movies, 'movie'));
    setTrendingTV(applyStoredScores(tv, 'tv'));
    setTrendingBooks(books);
    setLoading(false);

    // Phase 2: background enrichment (batched OMDb calls)
    enrichItemsWithRatings(movies, 'movie').then(setTrendingMovies);
    enrichItemsWithRatings(tv, 'tv').then(setTrendingTV);

    if (user) {
      try {
        const lib = await getLibrary();
        setLibrary(lib);
      } catch {
        // silently fail if library fetch errors
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

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {greeting}{greetName ? `, ${greetName}` : ''}
        </h1>
        <p className="text-sm text-white/40 mt-1">Discover something new today</p>
      </div>

      {/* Stats */}
      {user && library.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
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
        </div>
      )}

      {/* Search */}
      <SearchBar onSearch={handleSearch} placeholder="Search movies, TV shows & books..." />

      {/* Search results */}
      {searchResults && (
        <div className="space-y-6">
          {searchResults.movies.length > 0 && (
            <ScrollRow title={`Movies \u2014 "${searchResults.query}"`}>
              {searchResults.movies.map((m: any) => (
                <MediaCard key={m.id} item={m} mediaType="movie" />
              ))}
            </ScrollRow>
          )}
          {searchResults.tv.length > 0 && (
            <ScrollRow title={`TV Shows \u2014 "${searchResults.query}"`}>
              {searchResults.tv.map((m: any) => (
                <MediaCard key={m.id} item={m} mediaType="tv" />
              ))}
            </ScrollRow>
          )}
          {searchResults.books.length > 0 && (
            <ScrollRow title={`Books \u2014 "${searchResults.query}"`}>
              {searchResults.books.map((b: any) => (
                <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
              ))}
            </ScrollRow>
          )}
        </div>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ScrollRow title="Continue Watching">
          {continueWatching.map((item) => (
            <div
              key={item.id}
              className="shrink-0 w-[140px] sm:w-[160px] cursor-pointer group"
              onClick={() => navigateToItem(item)}
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                    {(item.media_type || 'movie') === 'book' ? '\uD83D\uDCD6' : '\uD83C\uDFAC'}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-white/70 truncate group-hover:text-accent transition-colors">
                {item.title}
              </p>
            </div>
          ))}
        </ScrollRow>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <ScrollRow title="Your Watchlist">
          {watchlist.map((item) => (
            <div
              key={item.id}
              className="shrink-0 w-[140px] sm:w-[160px] cursor-pointer group"
              onClick={() => navigateToItem(item)}
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                    {(item.media_type || 'movie') === 'book' ? '\uD83D\uDCD6' : '\uD83C\uDFAC'}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-white/70 truncate group-hover:text-accent transition-colors">
                {item.title}
              </p>
            </div>
          ))}
        </ScrollRow>
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
          <ScrollRow title="Trending Movies">
            {trendingMovies.map((m: any) => (
              <MediaCard key={m.id} item={m} mediaType="movie" />
            ))}
          </ScrollRow>
          <ScrollRow title="Trending TV Shows">
            {trendingTV.map((m: any) => (
              <MediaCard key={m.id} item={m} mediaType="tv" />
            ))}
          </ScrollRow>
          <ScrollRow title="Trending Books">
            {trendingBooks.map((b: any) => (
              <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
            ))}
          </ScrollRow>
        </>
      )}
    </div>
  );
}
