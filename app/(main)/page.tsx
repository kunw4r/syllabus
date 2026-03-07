'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Eye, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLibrary, removeFromLibrary } from '@/lib/api/library';
import {
  getTrendingMovies, getTrendingTV,
  getUpcomingMovies, getNowPlayingMovies, getPopularMovies, getTopRatedMovies,
  getPopularTV, getTopRatedTV,
} from '@/lib/api/tmdb';
import { getTrendingBooks } from '@/lib/api/books';
import { enrichItemsWithRatings, loadStaticScoreDB, applyStoredScores } from '@/lib/scoring';
import { getAllRecommendations, type RecommendationRow as RecRowType } from '@/lib/services/recommendations';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import EditorialRow from '@/components/ui/EditorialRow';
import SearchBar from '@/components/ui/SearchBar';
import HeroBanner from '@/components/ui/HeroBanner';
import RecommendationRow from '@/components/ui/RecommendationRow';
import { SkeletonRow, HomePageSkeleton } from '@/components/ui/SkeletonCard';
import { FadeInView } from '@/components/motion/FadeInView';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface LibraryItem {
  id: string;
  title: string;
  media_type?: string;
  status?: string;
  poster_url?: string;
  backdrop_url?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
  user_rating?: number;
  external_rating?: number;
  genres?: string;
  added_at?: string;
  updated_at?: string;
  progress_season?: number;
  progress_episode?: number;
  progress_timestamp?: number;
}

// Session cache for instant back-navigation
const HOME_CACHE_KEY = 'home_cache';

function getHomeCache() {
  try {
    const raw = sessionStorage.getItem(HOME_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function setHomeCache(data: Record<string, any>) {
  try { sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const homeCache = useRef(getHomeCache());
  const c = homeCache.current;
  const [trendingMovies, setTrendingMovies] = useState<any[]>(c?.trendingMovies || []);
  const [trendingTV, setTrendingTV] = useState<any[]>(c?.trendingTV || []);
  const [trendingBooks, setTrendingBooks] = useState<any[]>(c?.trendingBooks || []);
  const [nowPlaying, setNowPlaying] = useState<any[]>(c?.nowPlaying || []);
  const [upcoming, setUpcoming] = useState<any[]>(c?.upcoming || []);
  const [popularMovies, setPopularMovies] = useState<any[]>(c?.popularMovies || []);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>(c?.topRatedMovies || []);
  const [popularTV, setPopularTV] = useState<any[]>(c?.popularTV || []);
  const [topRatedTV, setTopRatedTV] = useState<any[]>(c?.topRatedTV || []);
  const [loading, setLoading] = useState(!c);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecRowType[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    await loadStaticScoreDB();

    const [movies, tv, books, nowPlayingArr, upcomingArr, popularMoviesArr, topRatedMoviesArr, popularTVArr, topRatedTVArr] = await Promise.all([
      getTrendingMovies(),
      getTrendingTV(),
      getTrendingBooks(),
      getNowPlayingMovies().catch(() => []),
      getUpcomingMovies().catch(() => []),
      getPopularMovies().catch(() => []),
      getTopRatedMovies().catch(() => []),
      getPopularTV().catch(() => []),
      getTopRatedTV().catch(() => []),
    ]);

    const scoredMovies = applyStoredScores(movies, 'movie');
    const scoredTV = applyStoredScores(tv, 'tv');
    const scoredNowPlaying = applyStoredScores(nowPlayingArr, 'movie');
    const scoredUpcoming = applyStoredScores(upcomingArr, 'movie');
    const scoredPopularMovies = applyStoredScores(popularMoviesArr, 'movie');
    const scoredTopRatedMovies = applyStoredScores(topRatedMoviesArr, 'movie');
    const scoredPopularTV = applyStoredScores(popularTVArr, 'tv');
    const scoredTopRatedTV = applyStoredScores(topRatedTVArr, 'tv');

    setTrendingMovies(scoredMovies);
    setTrendingTV(scoredTV);
    setTrendingBooks(books);
    setNowPlaying(scoredNowPlaying);
    setUpcoming(scoredUpcoming);
    setPopularMovies(scoredPopularMovies);
    setTopRatedMovies(scoredTopRatedMovies);
    setPopularTV(scoredPopularTV);
    setTopRatedTV(scoredTopRatedTV);
    setLoading(false);

    // Cache for instant back-navigation
    setHomeCache({
      trendingMovies: scoredMovies, trendingTV: scoredTV, trendingBooks: books,
      nowPlaying: scoredNowPlaying, upcoming: scoredUpcoming,
      popularMovies: scoredPopularMovies, topRatedMovies: scoredTopRatedMovies,
      popularTV: scoredPopularTV, topRatedTV: scoredTopRatedTV,
    });

    enrichItemsWithRatings(movies, 'movie').then(setTrendingMovies);
    enrichItemsWithRatings(tv, 'tv').then(setTrendingTV);
    enrichItemsWithRatings(nowPlayingArr, 'movie').then(setNowPlaying);
    enrichItemsWithRatings(popularMoviesArr, 'movie').then(setPopularMovies);
    enrichItemsWithRatings(topRatedMoviesArr, 'movie').then(setTopRatedMovies);
    enrichItemsWithRatings(popularTVArr, 'tv').then(setPopularTV);
    enrichItemsWithRatings(topRatedTVArr, 'tv').then(setTopRatedTV);

    if (user) {
      try {
        const lib = await getLibrary();
        setLibrary(lib);

        if (lib.length >= 3) {
          getAllRecommendations(lib).then((rows) => {
            rows.forEach((row) => {
              const movies = row.items.filter((i: any) => i.media_type !== 'tv');
              const tvShows = row.items.filter((i: any) => i.media_type === 'tv');
              if (movies.length) applyStoredScores(movies, 'movie');
              if (tvShows.length) applyStoredScores(tvShows, 'tv');
            });
            setRecommendations(rows);
          }).catch(() => {});
        }
      } catch {
        // silently fail
      }
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const continueWatching = library.filter((i) => i.status === 'watching').slice(0, 20);
  const watchlist = library.filter((i) => i.status === 'want').slice(0, 20);
  const finishedCount = library.filter((i) => i.status === 'finished').length;

  const heroItems = trendingMovies
    .filter((m) => m.backdrop_path && (m.vote_average || 0) >= 6)
    .slice(0, 5)
    .map((m) => ({ ...m, media_type: 'movie' }));

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div>
      {/* Hero Banner — full bleed edge-to-edge, seamless fade into content */}
      {heroItems.length > 0 && (
        <div className="-mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-6 lg:-mt-4">
          <HeroBanner items={heroItems} />
        </div>
      )}

      <div className={`space-y-0 ${heroItems.length > 0 ? '-mt-14 sm:-mt-16 relative z-10' : ''}`}>
        {/* Search — only show standalone when hero isn't visible */}
        {heroItems.length === 0 && (
          <FadeInView>
            <SearchBar onSearch={handleSearch} placeholder="Search movies, TV shows & books..." />
          </FadeInView>
        )}

        {/* Stats row */}
        {user && library.length > 0 && (
          <StaggerContainer className="grid grid-cols-3 gap-2 sm:gap-3">
            <StaggerItem>
              <div
                className="rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                onClick={() => router.push('/library')}
              >
                <Library size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-lg sm:text-xl font-black">{library.length}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">In Library</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div
                className="rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                onClick={() => router.push('/library')}
              >
                <Eye size={18} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-lg sm:text-xl font-black">{continueWatching.length}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">In Progress</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div
                className="rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                onClick={() => router.push('/library')}
              >
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-lg sm:text-xl font-black">{finishedCount}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-wider">Finished</p>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <FadeInView>
            <ScrollRow
              title={
                <div className="flex items-center justify-between w-full">
                  <span>Continue Watching</span>
                  <button
                    onClick={() => router.push('/library?tab=watching')}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors font-normal"
                  >
                    See all <ChevronRight size={14} />
                  </button>
                </div>
              }
            >
              {continueWatching.map((item) => {
                const pLabel = item.media_type === 'tv' && item.progress_season && item.progress_episode
                  ? `S${item.progress_season} E${item.progress_episode}`
                  : item.media_type === 'movie' && item.progress_timestamp
                    ? `${Math.floor(item.progress_timestamp / 3600)}h ${Math.floor((item.progress_timestamp % 3600) / 60)}m`
                    : undefined;
                return (
                  <MediaCard
                    key={item.id}
                    item={{
                      id: item.tmdb_id,
                      title: item.title,
                      backdrop_path: item.backdrop_url?.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') || undefined,
                      poster_path: item.poster_url?.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') || undefined,
                      vote_average: item.external_rating,
                      media_type: item.media_type || 'movie',
                    }}
                    mediaType={(item.media_type as 'movie' | 'tv' | 'book') || 'movie'}
                    showAdd={false}
                    size="small"
                    progressLabel={pLabel}
                  />
                );
              })}
            </ScrollRow>
          </FadeInView>
        )}

        {/* Recommendation rows */}
        {recommendations.length > 0 && (
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
                <MediaCard
                  key={item.id}
                  item={{
                    id: item.tmdb_id,
                    title: item.title,
                    backdrop_path: item.backdrop_url?.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') || undefined,
                    poster_path: item.poster_url?.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') || undefined,
                    vote_average: item.external_rating,
                    media_type: item.media_type || 'movie',
                  }}
                  mediaType={(item.media_type as 'movie' | 'tv' | 'book') || 'movie'}
                  showAdd={false}
                  size="small"
                  onRemove={async () => {
                    await removeFromLibrary(item.id);
                    setLibrary((prev) => prev.filter((l) => l.id !== item.id));
                  }}
                />
              ))}
            </ScrollRow>
          </FadeInView>
        )}

        {/* Trending */}
        <FadeInView>
          <EditorialRow title="Trending Movies" items={trendingMovies} mediaType="movie" />
        </FadeInView>
        <FadeInView delay={0.05}>
          <EditorialRow title="Trending TV Shows" items={trendingTV} mediaType="tv" />
        </FadeInView>
        {nowPlaying.length > 0 && (
          <FadeInView delay={0.1}>
            <EditorialRow title="Now Playing in Theaters" items={nowPlaying} mediaType="movie" />
          </FadeInView>
        )}
        {upcoming.length > 0 && (
          <FadeInView delay={0.12}>
            <EditorialRow title="Coming Soon" items={upcoming} mediaType="movie" />
          </FadeInView>
        )}
        {popularMovies.length > 0 && (
          <FadeInView delay={0.14}>
            <EditorialRow title="Popular Movies" items={popularMovies} mediaType="movie" />
          </FadeInView>
        )}
        {topRatedMovies.length > 0 && (
          <FadeInView delay={0.16}>
            <EditorialRow title="Top Rated Movies" items={topRatedMovies} mediaType="movie" />
          </FadeInView>
        )}
        {popularTV.length > 0 && (
          <FadeInView delay={0.18}>
            <EditorialRow title="Popular TV Shows" items={popularTV} mediaType="tv" />
          </FadeInView>
        )}
        {topRatedTV.length > 0 && (
          <FadeInView delay={0.2}>
            <EditorialRow title="Top Rated TV Shows" items={topRatedTV} mediaType="tv" />
          </FadeInView>
        )}
        <FadeInView delay={0.22}>
          <ScrollRow title="Trending Books">
            {trendingBooks.map((b: any) => (
              <MediaCard key={b.key || b.google_books_id} item={b} mediaType="book" />
            ))}
          </ScrollRow>
        </FadeInView>
      </div>
    </div>
  );
}
