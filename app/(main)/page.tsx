'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Play, Star } from 'lucide-react';
import { TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingHex, getRatingBg, getRatingGlow } from '@/lib/utils/rating-colors';
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

/** Extract the TMDB path portion from a stored URL, or return undefined */
function extractTmdbPath(url?: string | null): string | undefined {
  if (!url) return undefined;
  // Full TMDB URL → strip prefix to get /path.jpg
  const match = url.match(/\/t\/p\/[^/]+(\/.*)/);
  if (match) return match[1];
  // Already a bare path like /abc.jpg
  if (url.startsWith('/')) return url;
  return undefined;
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
          <HeroBanner
            items={heroItems}
            stats={user && library.length > 0 ? { total: library.length, inProgress: continueWatching.length, finished: finishedCount } : null}
            onStatsClick={() => router.push('/library')}
          />
        </div>
      )}

      <div className={`space-y-0 ${heroItems.length > 0 ? 'pt-2 relative z-10' : ''}`}>
        {/* Search — only show standalone when hero isn't visible */}
        {heroItems.length === 0 && (
          <FadeInView>
            <SearchBar onSearch={handleSearch} placeholder="Search movies, TV shows & books..." />
          </FadeInView>
        )}

        {/* Continue Watching — hero backdrop + progress bar cards */}
        {continueWatching.length > 0 && (() => {
          // Pick the most recently updated item as the hero
          const heroItem = [...continueWatching].sort((a, b) =>
            new Date(b.updated_at || b.added_at || 0).getTime() - new Date(a.updated_at || a.added_at || 0).getTime()
          )[0];
          const heroBackdrop = extractTmdbPath(heroItem?.backdrop_url);
          const heroPoster = extractTmdbPath(heroItem?.poster_url);

          return (
            <FadeInView>
              <section className="relative -mx-5 sm:-mx-8 lg:-mx-14 mb-4 overflow-hidden rounded-2xl">
                {/* Hero backdrop — blurred behind the row */}
                {(heroBackdrop || heroPoster) && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={heroBackdrop ? `${TMDB_IMG_ORIGINAL}${heroBackdrop}` : `${TMDB_IMG}${heroPoster}`}
                      alt=""
                      className="w-full h-full object-cover scale-105 blur-sm"
                    />
                    <div className="absolute inset-0 bg-dark-900/80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-dark-900/40" />
                  </div>
                )}

                <div className="relative z-10 px-5 sm:px-8 lg:px-14 pt-5 pb-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white">Continue Watching</h2>
                    <button
                      onClick={() => router.push('/library?tab=watching')}
                      className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                    >
                      See all <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Cards with progress bars */}
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {continueWatching.map((item) => {
                      const backdrop = extractTmdbPath(item.backdrop_url);
                      const poster = extractTmdbPath(item.poster_url);
                      const displayImg = backdrop
                        ? `${TMDB_IMG_ORIGINAL}${backdrop}`
                        : poster
                          ? `${TMDB_IMG}${poster}`
                          : null;
                      const mt = (item.media_type as 'movie' | 'tv') || 'movie';

                      // Progress label + approximate percentage
                      let pLabel = '';
                      let pPercent = 30; // default visual hint
                      if (mt === 'tv' && item.progress_season && item.progress_episode) {
                        pLabel = `S${item.progress_season} E${item.progress_episode}`;
                        // Rough estimate: assume ~8 eps per season
                        const estTotal = Math.max(item.progress_season * 8, item.progress_episode);
                        const estWatched = (item.progress_season - 1) * 8 + item.progress_episode;
                        pPercent = Math.min(Math.round((estWatched / estTotal) * 100), 95);
                      } else if (mt === 'movie' && item.progress_timestamp) {
                        const mins = Math.floor(item.progress_timestamp / 60);
                        pLabel = mins >= 60
                          ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                          : `${mins}m`;
                        // Assume ~120 min avg movie
                        pPercent = Math.min(Math.round((mins / 120) * 100), 95);
                      }

                      const rating = item.external_rating;

                      return (
                        <div
                          key={item.id}
                          className="shrink-0 w-[240px] sm:w-[280px] lg:w-[320px] group/cw cursor-pointer"
                          onClick={() => router.push(`/details/${mt}/${item.tmdb_id}`)}
                        >
                          <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-dark-800 transition-all duration-300 group-hover/cw:scale-[1.03] group-hover/cw:shadow-xl group-hover/cw:shadow-black/50">
                            {displayImg ? (
                              <img src={displayImg} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-3xl">{'\u{1F3AC}'}</div>
                            )}

                            {/* Hover play overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cw:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <Play size={18} className="text-black fill-black ml-0.5" />
                              </div>
                            </div>

                            {/* Rating badge */}
                            {rating != null && rating > 0 && (
                              <div
                                className="absolute top-2 right-2 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 backdrop-blur-md border border-white/10 z-10 group-hover/cw:opacity-0 transition-opacity"
                                style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
                              >
                                <Star size={9} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                                <span className="text-[11px] font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
                                  {Number(rating).toFixed(1)}
                                </span>
                              </div>
                            )}

                            {/* Bottom info bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-6">
                              <p className="text-[13px] font-semibold text-white truncate leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                                {item.title}
                              </p>
                              {pLabel && (
                                <span className="text-[10px] text-white/50 mt-0.5 block">{pLabel}</span>
                              )}
                            </div>

                            {/* Progress bar — bottom edge */}
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                              <div
                                className="h-full bg-accent rounded-r-full transition-all duration-500"
                                style={{ width: `${pPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </FadeInView>
          );
        })()}

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
                    backdrop_path: extractTmdbPath(item.backdrop_url),
                    poster_path: extractTmdbPath(item.poster_url),
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

        {/* Divider between personal and browse sections */}
        {(continueWatching.length > 0 || watchlist.length > 0 || recommendations.length > 0) && (
          <div className="pt-2 pb-1">
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>
        )}

        {/* Top 10 Movies Right Now */}
        <FadeInView>
          <EditorialRow title="Top 10 Movies Right Now" items={trendingMovies.slice(0, 10)} mediaType="movie" showRank />
        </FadeInView>

        {/* Now Playing — break up the Top 10s */}
        {nowPlaying.length > 0 && (
          <FadeInView delay={0.05}>
            <EditorialRow title="Now Playing in Theaters" items={nowPlaying} mediaType="movie" />
          </FadeInView>
        )}

        {/* Top 10 TV Right Now */}
        <FadeInView delay={0.08}>
          <EditorialRow title="Top 10 TV Right Now" items={trendingTV.slice(0, 10)} mediaType="tv" showRank />
        </FadeInView>

        {/* Coming Soon */}
        {upcoming.length > 0 && (
          <FadeInView delay={0.1}>
            <EditorialRow title="Coming Soon" items={upcoming} mediaType="movie" />
          </FadeInView>
        )}

        {/* Top 10 Movies of All Time */}
        {topRatedMovies.length > 0 && (
          <FadeInView delay={0.12}>
            <EditorialRow
              title="Top 10 Movies of All Time"
              items={[...topRatedMovies].sort((a, b) => (b.unified_rating ?? b.vote_average ?? 0) - (a.unified_rating ?? a.vote_average ?? 0)).slice(0, 10)}
              mediaType="movie"
              showRank
            />
          </FadeInView>
        )}

        {/* Popular Movies */}
        {popularMovies.length > 0 && (
          <FadeInView delay={0.14}>
            <EditorialRow title="Popular Movies" items={popularMovies} mediaType="movie" />
          </FadeInView>
        )}

        {/* Top 10 TV Shows of All Time */}
        {topRatedTV.length > 0 && (
          <FadeInView delay={0.16}>
            <EditorialRow
              title="Top 10 TV Shows of All Time"
              items={[...topRatedTV].sort((a, b) => (b.unified_rating ?? b.vote_average ?? 0) - (a.unified_rating ?? a.vote_average ?? 0)).slice(0, 10)}
              mediaType="tv"
              showRank
            />
          </FadeInView>
        )}

        {/* Popular TV */}
        {popularTV.length > 0 && (
          <FadeInView delay={0.18}>
            <EditorialRow title="Popular TV Shows" items={popularTV} mediaType="tv" />
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
