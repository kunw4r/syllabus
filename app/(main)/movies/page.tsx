'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Search, X, Play } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow, SkeletonHero } from '@/components/ui/SkeletonCard';
import {
  getTrendingMovies,
  getNowPlayingMovies,
  getTopRatedMovies,
  getMoviesByGenre,
  searchMovies,
  getMovieDetails,
} from '@/lib/api/tmdb';
import {
  enrichItemsWithRatings,
  applyStoredScores,
  loadStaticScoreDB,
} from '@/lib/scoring';
import { TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10749, name: 'Romance' },
  { id: 27, name: 'Horror' },
  { id: 16, name: 'Animation' },
  { id: 99, name: 'Documentary' },
  { id: 80, name: 'Crime' },
  { id: 14, name: 'Fantasy' },
  { id: 12, name: 'Adventure' },
];

export default function MoviesPage() {
  const router = useRouter();
  const [hero, setHero] = useState<any>(null);
  const [heroTrailer, setHeroTrailer] = useState<string | null>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [genreData, setGenreData] = useState<Record<number, any[]>>({});
  const [loadedGenres, setLoadedGenres] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load static score DB + initial data
  useEffect(() => {
    loadStaticScoreDB();

    async function loadInitial() {
      try {
        const [t, np, tr] = await Promise.all([
          getTrendingMovies(),
          getNowPlayingMovies(),
          getTopRatedMovies(),
        ]);

        applyStoredScores(t, 'movie');
        applyStoredScores(np, 'movie');
        applyStoredScores(tr, 'movie');

        setTrending(t);
        setNowPlaying(np);
        setTopRated(tr);

        const h = t[Math.floor(Math.random() * Math.min(5, t.length))];
        if (h) {
          setHero(h);
          getMovieDetails(h.id).then((d: any) => {
            const trailer = d.videos?.results?.find(
              (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
            );
            if (trailer) setHeroTrailer(trailer.key);
          }).catch(() => {});
        }

        // Pre-load first 3 genres
        const initial = GENRES.slice(0, 3);
        const genreResults = await Promise.all(
          initial.map((g) => getMoviesByGenre(g.id))
        );
        const gd: Record<number, any[]> = {};
        initial.forEach((g, i) => {
          applyStoredScores(genreResults[i], 'movie');
          gd[g.id] = genreResults[i];
        });
        setGenreData(gd);
        setLoadedGenres(new Set(initial.map((g) => g.id)));

        // Background enrichment
        enrichItemsWithRatings(t, 'movie').then(setTrending);
        enrichItemsWithRatings(np, 'movie').then(setNowPlaying);
        enrichItemsWithRatings(tr, 'movie').then(setTopRated);
      } catch (err) {
        console.error('[Movies] Initial load failed:', err);
      }
      setInitialLoaded(true);
    }
    loadInitial();
  }, []);

  // Lazy-load genres as they scroll into view
  const loadGenre = useCallback(
    async (genreId: number) => {
      if (loadedGenres.has(genreId)) return;
      setLoadedGenres((prev) => new Set([...prev, genreId]));
      const data = await getMoviesByGenre(genreId);
      applyStoredScores(data, 'movie');
      setGenreData((prev) => ({ ...prev, [genreId]: data }));
    },
    [loadedGenres]
  );

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const genreId = Number(node.dataset.genre);
            if (genreId) loadGenre(genreId);
            observer.disconnect();
          }
        },
        { rootMargin: '300px' }
      );
      observer.observe(node);
    },
    [loadGenre]
  );

  // Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchMovies(query);
    setResults(data);
    setSearching(false);
  };

  const clearSearch = () => {
    setResults(null);
    setQuery('');
  };

  // Loading skeleton
  if (!initialLoaded) {
    return (
      <div className="min-w-0">
        <SkeletonHero />
        <div className="mt-8"><SkeletonRow /></div>
        <div className="mt-8"><SkeletonRow /></div>
        <div className="mt-8"><SkeletonRow /></div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">
            Results for &ldquo;{query}&rdquo;
          </h2>
          <div className="flex flex-wrap gap-4">
            {results.map((m: any) => (
              <MediaCard key={m.id} item={m} mediaType="movie" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Hero Banner */}
          {hero?.backdrop_path && (
            <div className="relative -mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-2 mb-10 h-[45vh] sm:h-[55vh] lg:h-[60vh] min-h-[300px] overflow-hidden rounded-b-3xl">
              <img
                src={`${TMDB_IMG_ORIGINAL}${hero.backdrop_path}`}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-6 lg:left-10 max-w-lg pr-4">
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2 sm:mb-3 leading-tight">
                  {hero.title}
                </h1>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-white/50 mb-2 sm:mb-3">
                  {(hero.unified_rating ?? hero.vote_average) > 0 && (
                    <span className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 shadow-lg" style={{ background: getRatingBg(Number(hero.unified_rating ?? hero.vote_average)), boxShadow: getRatingGlow(Number(hero.unified_rating ?? hero.vote_average)) }}>
                      <Star size={14} className="fill-current" style={{ color: getRatingHex(Number(hero.unified_rating ?? hero.vote_average)) }} />{' '}
                      <span className="font-semibold drop-shadow-sm" style={{ color: getRatingHex(Number(hero.unified_rating ?? hero.vote_average)) }}>{Number(
                        hero.unified_rating ?? hero.vote_average
                      ).toFixed(1)}</span>
                    </span>
                  )}
                  <span>{hero.release_date?.slice(0, 4)}</span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5">
                  {hero.overview}
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => router.push(`/details/movie/${hero.id}`)}
                    className="bg-white text-black font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm hover:bg-white/90 transition-colors"
                  >
                    More Info
                  </button>
                  {heroTrailer && (
                    <a
                      href={`https://www.youtube.com/watch?v=${heroTrailer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 backdrop-blur-md border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <Play size={16} /> Trailer
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top 10 Movies This Week */}
          <ScrollRow title="Top 10 Movies This Week">
            {trending.slice(0, 10).map((item) => (
              <MediaCard key={item.id} item={item} mediaType="movie" />
            ))}
          </ScrollRow>

          {/* Now Playing */}
          <ScrollRow title="Now Playing in Cinemas">
            {nowPlaying.map((m) => (
              <MediaCard key={m.id} item={m} mediaType="movie" />
            ))}
          </ScrollRow>

          {/* Genre Rows (lazy-loaded) */}
          {GENRES.map((g) => {
            const loaded = loadedGenres.has(g.id);
            const movies = genreData[g.id];
            return (
              <div
                key={g.id}
                ref={loaded ? undefined : observerRef}
                data-genre={g.id}
              >
                {!loaded ? (
                  <div className="mt-8">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                      {g.name}
                    </h2>
                    <SkeletonRow />
                  </div>
                ) : movies?.length > 0 ? (
                  <ScrollRow title={g.name}>
                    {movies.map((m: any) => (
                      <MediaCard key={m.id} item={m} mediaType="movie" />
                    ))}
                  </ScrollRow>
                ) : null}
              </div>
            );
          })}

          {/* Top Rated */}
          <ScrollRow title="Top Rated of All Time">
            {topRated.map((m) => (
              <MediaCard key={m.id} item={m} mediaType="movie" />
            ))}
          </ScrollRow>
        </>
      )}
    </div>
  );
}
