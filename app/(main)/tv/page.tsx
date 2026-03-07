'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Search, X, Play } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow, SkeletonHero } from '@/components/ui/SkeletonCard';
import {
  getTrendingTV,
  getTopRatedTV,
  getTVByGenre,
  getAnime,
  getAnimationTV,
  searchTV,
  getTVDetails,
} from '@/lib/api/tmdb';
import {
  enrichItemsWithRatings,
  applyStoredScores,
  loadStaticScoreDB,
} from '@/lib/scoring';
import { TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

const GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 80, name: 'Crime' },
  { id: 10751, name: 'Family' },
  { id: 99, name: 'Documentary' },
  { id: 10764, name: 'Reality' },
  { id: 10768, name: 'War & Politics' },
];

export default function TVPage() {
  const router = useRouter();
  const [hero, setHero] = useState<any>(null);
  const [heroTrailer, setHeroTrailer] = useState<string | null>(null);
  const [playingTrailer, setPlayingTrailer] = useState(false);
  const [trending, setTrending] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [anime, setAnime] = useState<any[]>([]);
  const [animation, setAnimation] = useState<any[]>([]);
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
        const [t, tr, an, anim] = await Promise.all([
          getTrendingTV(),
          getTopRatedTV(),
          getAnime(),
          getAnimationTV(),
        ]);

        applyStoredScores(t, 'tv');
        applyStoredScores(tr, 'tv');
        applyStoredScores(an, 'tv');
        applyStoredScores(anim, 'tv');

        setTrending(t);
        setTopRated(tr);
        setAnime(an);
        setAnimation(anim);

        const h = t[Math.floor(Math.random() * Math.min(5, t.length))];
        if (h) {
          setHero(h);
          getTVDetails(h.id).then((d: any) => {
            const trailer = d.videos?.results?.find(
              (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
            );
            if (trailer) setHeroTrailer(trailer.key);
          }).catch(() => {});
        }

        // Pre-load first 3 genres
        const initial = GENRES.slice(0, 3);
        const genreResults = await Promise.all(
          initial.map((g) => getTVByGenre(g.id))
        );
        const gd: Record<number, any[]> = {};
        initial.forEach((g, i) => {
          applyStoredScores(genreResults[i], 'tv');
          gd[g.id] = genreResults[i];
        });
        setGenreData(gd);
        setLoadedGenres(new Set(initial.map((g) => g.id)));

        // Background enrichment
        enrichItemsWithRatings(t, 'tv').then(setTrending);
        enrichItemsWithRatings(tr, 'tv').then(setTopRated);
        enrichItemsWithRatings(an, 'tv').then(setAnime);
        enrichItemsWithRatings(anim, 'tv').then(setAnimation);
      } catch (err) {
        console.error('[TV] Initial load failed:', err);
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
      const data = await getTVByGenre(genreId);
      applyStoredScores(data, 'tv');
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
    const data = await searchTV(query);
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
            {results.map((t: any) => (
              <MediaCard key={t.id} item={t} mediaType="tv" />
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
                  {hero.name}
                </h1>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-white/50 mb-2 sm:mb-3">
                  {(hero.unified_rating ?? hero.vote_average) > 0 && (() => { const val = Number(hero.unified_rating ?? hero.vote_average); return (
                    <span className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 shadow-lg" style={{ background: getRatingBg(val), boxShadow: getRatingGlow(val) }}>
                      <Star size={14} className="fill-current" style={{ color: getRatingHex(val) }} />{' '}
                      <span className="drop-shadow-sm" style={{ color: getRatingHex(val) }}>{val.toFixed(1)}</span>
                    </span>
                  ); })()}
                  <span>{hero.first_air_date?.slice(0, 4)}</span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5">
                  {hero.overview}
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => router.push(`/details/tv/${hero.id}`)}
                    className="bg-white text-black font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm hover:bg-white/90 transition-colors"
                  >
                    More Info
                  </button>
                  {heroTrailer && (
                    <button
                      onClick={() => setPlayingTrailer(true)}
                      className="bg-white/10 backdrop-blur-md border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <Play size={16} /> Trailer
                    </button>
                  )}
                </div>
              </div>
              {/* Inline trailer */}
              {playingTrailer && heroTrailer && (
                <div className="absolute inset-0 z-10 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${heroTrailer}?autoplay=1&rel=0`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="w-full h-full"
                  />
                  <button
                    onClick={() => setPlayingTrailer(false)}
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Top 10 TV This Week */}
          <ScrollRow title="Top 10 TV This Week">
            {trending.slice(0, 10).map((item) => (
              <MediaCard key={item.id} item={item} mediaType="tv" />
            ))}
          </ScrollRow>

          {/* Anime */}
          {anime.length > 0 && (
            <ScrollRow title="Anime">
              {anime.map((t) => (
                <MediaCard key={t.id} item={t} mediaType="tv" />
              ))}
            </ScrollRow>
          )}

          {/* Animation (Disney/Pixar/Western) */}
          {animation.length > 0 && (
            <ScrollRow title="Animation &middot; Disney & More">
              {animation.map((t) => (
                <MediaCard key={t.id} item={t} mediaType="tv" />
              ))}
            </ScrollRow>
          )}

          {/* Genre Rows (lazy-loaded) */}
          {GENRES.map((g) => {
            const loaded = loadedGenres.has(g.id);
            const shows = genreData[g.id];
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
                ) : shows?.length > 0 ? (
                  <ScrollRow title={g.name}>
                    {shows.map((t: any) => (
                      <MediaCard key={t.id} item={t} mediaType="tv" />
                    ))}
                  </ScrollRow>
                ) : null}
              </div>
            );
          })}

          {/* Top Rated */}
          <ScrollRow title="Top Rated of All Time">
            {topRated.map((t) => (
              <MediaCard key={t.id} item={t} mediaType="tv" />
            ))}
          </ScrollRow>
        </>
      )}
    </div>
  );
}
