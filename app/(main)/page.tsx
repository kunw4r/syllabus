'use client';

import { useEffect, useState, useCallback } from 'react';
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

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

    setTrendingMovies(applyStoredScores(movies, 'movie'));
    setTrendingTV(applyStoredScores(tv, 'tv'));
    setTrendingBooks(books);
    setNowPlaying(applyStoredScores(nowPlayingArr, 'movie'));
    setUpcoming(applyStoredScores(upcomingArr, 'movie'));
    setPopularMovies(applyStoredScores(popularMoviesArr, 'movie'));
    setTopRatedMovies(applyStoredScores(topRatedMoviesArr, 'movie'));
    setPopularTV(applyStoredScores(popularTVArr, 'tv'));
    setTopRatedTV(applyStoredScores(topRatedTVArr, 'tv'));
    setLoading(false);

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

  return (
    <div>
      {/* Hero Banner — full bleed edge-to-edge */}
      {!loading && heroItems.length > 0 && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 -mt-6 lg:-mt-4 mb-10">
          <HeroBanner items={heroItems} onSearch={handleSearch} />
        </div>
      )}

      <div className="space-y-10">
        {/* Search — only show standalone when hero isn't visible */}
        {(loading || heroItems.length === 0) && (
          <FadeInView>
            <SearchBar onSearch={handleSearch} placeholder="Search movies, TV shows & books..." />
          </FadeInView>
        )}

        {/* Stats row */}
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
              {continueWatching.map((item) => (
                <MediaCard
                  key={item.id}
                  item={{
                    id: item.tmdb_id,
                    title: item.title,
                    backdrop_path: null,
                    poster_path: item.poster_url || null,
                    vote_average: item.external_rating,
                    media_type: item.media_type || 'movie',
                  }}
                  mediaType={(item.media_type as 'movie' | 'tv' | 'book') || 'movie'}
                  showAdd={false}
                  size="small"
                />
              ))}
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
                    backdrop_path: null,
                    poster_path: item.poster_url || null,
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
          </>
        )}
      </div>
    </div>
  );
}
