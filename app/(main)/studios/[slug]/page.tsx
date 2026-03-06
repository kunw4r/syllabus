'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Star, X, Play, Pause, Volume2, VolumeX, Info } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import {
  getMoviesByCompany,
  getMoviesByLanguage,
  getTVByCompany,
  getTVByLanguage,
  getTopRatedByCompany,
  getTopRatedByLanguage,
  getNewReleasesByCompany,
  getNewReleasesByLanguage,
  enrichWithCertifications,
  getMovieTrailer,
  getTVTrailer,
  getMovieContentRating,
  getTVContentRating,
} from '@/lib/api/tmdb';
import {
  applyStoredScores,
  loadStaticScoreDB,
  enrichItemsWithRatings,
} from '@/lib/scoring';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import { STUDIOS, TMDB_IMG_ORIGINAL, GENRE_ID_TO_NAME, type Studio } from '@/lib/constants';
import { extractDominantColor } from '@/lib/utils/color-extract';


type Tab = 'movies' | 'tv';

const TRAILER_DELAY = 3000;
const SLIDE_INTERVAL = 8000;

/** Send a command to a YouTube iframe via postMessage */
function ytCommand(iframe: HTMLIFrameElement | null, func: string) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func, args: '' }),
    '*'
  );
}

// ── Rotating Hero Banner ──

function StudioHero({
  heroItems,
  studio,
  searchQuery,
  onSearchChange,
  tab,
  onTabChange,
  loading,
}: {
  heroItems: any[];
  studio: Studio;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  loading: boolean;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ambientColor, setAmbientColor] = useState('233, 69, 96');
  const [progressKey, setProgressKey] = useState(0);

  // Trailer state
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerReady, setTrailerReady] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout>(undefined);

  // Content rating
  const [contentRating, setContentRating] = useState<string | null>(null);

  const items = heroItems.filter((i: any) => i.backdrop_path).slice(0, 5);
  const current = items[currentIndex] || null;
  const currentItemId = current?.id;

  // Fetch trailer + content rating for current item
  useEffect(() => {
    setTrailerKey(null);
    setTrailerReady(false);
    setShowTrailer(false);
    setContentRating(null);
    setPaused(false);

    if (!currentItemId || !current) return;

    let cancelled = false;
    const mt = current.media_type || 'movie';
    const fetchTrailer = mt === 'tv' ? getTVTrailer : getMovieTrailer;
    const fetchRating = mt === 'tv' ? getTVContentRating : getMovieContentRating;

    fetchTrailer(currentItemId).then((key) => {
      if (!cancelled && key) setTrailerKey(key);
    }).catch(() => {});

    fetchRating(currentItemId).then((rating) => {
      if (!cancelled && rating) setContentRating(rating);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [currentItemId]);

  // Show trailer after delay
  useEffect(() => {
    if (!trailerKey) return;
    trailerTimerRef.current = setTimeout(() => setShowTrailer(true), TRAILER_DELAY);
    return () => { if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current); };
  }, [trailerKey]);

  // Auto-advance
  const advance = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % items.length);
    setProgressKey((k) => k + 1);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    if (showTrailer && trailerReady) return;
    const interval = setInterval(advance, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [advance, items.length, showTrailer, trailerReady]);

  // Ambient color
  useEffect(() => {
    if (current?.backdrop_path) {
      extractDominantColor(`${TMDB_IMG_ORIGINAL}${current.backdrop_path}`).then(setAmbientColor);
    }
  }, [currentItemId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    ytCommand(iframeRef.current, next ? 'mute' : 'unMute');
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    ytCommand(iframeRef.current, next ? 'pauseVideo' : 'playVideo');
  };

  const goToSlide = (i: number) => {
    setCurrentIndex(i);
    setProgressKey((k) => k + 1);
  };

  const title = current?.title || current?.name || '';
  const mt = current?.media_type || 'movie';
  const year = (current?.release_date || current?.first_air_date || '').toString().slice(0, 4);
  const genres = (current?.genre_ids || []).slice(0, 3).map((id: number) => GENRE_ID_TO_NAME[id]).filter(Boolean);
  const displayScore = current?.unified_rating ?? current?.vote_average;
  const trailerPlaying = showTrailer && trailerReady;

  return (
    <div className="relative -mx-[clamp(20px,5vw,64px)] mb-8" style={{ width: 'calc(100% + 2 * clamp(20px, 5vw, 64px))' }}>
      {/* Ambient glow */}
      <div
        className="absolute -inset-12 -z-10 opacity-20 blur-3xl transition-colors duration-[1200ms]"
        style={{ backgroundColor: `rgb(${ambientColor})` }}
      />

      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(380px, 55vh, 650px)' }}>
        {/* Backdrop images */}
        {items.length > 0 ? (
          <AnimatePresence mode="sync">
            <m.div
              key={current?.id || 'empty'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={`${TMDB_IMG_ORIGINAL}${current?.backdrop_path}`}
                alt={title}
                className={`w-full h-full object-cover object-[center_20%] ${
                  currentIndex % 2 === 0
                    ? 'animate-ken-burns-zoom'
                    : 'animate-ken-burns-zoom-alt'
                }`}
                loading="eager"
              />
            </m.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-700 to-dark-900" />
        )}

        {/* YouTube trailer iframe */}
        {showTrailer && trailerKey && (
          <div
            className={`absolute inset-0 z-[1] transition-opacity duration-1000 ${
              trailerReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0" style={{ transform: 'scale(1.2)' }}>
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${trailerKey}&playsinline=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full pointer-events-none"
                style={{ border: 'none' }}
                onLoad={() => {
                  setTimeout(() => setTrailerReady(true), 800);
                }}
              />
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#0e1117] via-[#0e1117]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] z-[2] bg-gradient-to-t from-[#0e1117] via-[#0e1117]/80 to-transparent" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#0e1117]/70 via-transparent to-transparent" />
        <div
          className="absolute inset-0 z-[2] opacity-15 transition-colors duration-[1200ms]"
          style={{ background: `radial-gradient(ellipse at 30% 80%, rgb(${ambientColor}) 0%, transparent 70%)` }}
        />

        {/* ── Top bar: Back button (left) + Search & Tabs (right) ── */}
        <div className="absolute top-0 left-0 right-0 z-[4] px-[clamp(20px,5vw,64px)] pt-4 flex items-start justify-between gap-4">
          <button
            onClick={() => router.push('/studios')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors shrink-0 mt-1"
          >
            <ArrowLeft size={15} />
            Studios
          </button>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`Search ${studio.name}...`}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder-white/25 outline-none focus:border-white/20 focus:bg-black/50 backdrop-blur-md transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-black/30 backdrop-blur-md rounded-xl p-1 border border-white/[0.1]">
              {(['movies', 'tv'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onTabChange(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t === 'movies' ? 'Movies' : 'TV Shows'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom content overlay ── */}
        <div className="absolute bottom-0 left-0 right-0 z-[3] pb-14 sm:pb-16 px-[clamp(20px,5vw,64px)]">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              {/* Studio name — always visible */}
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">
                {studio.name}
              </p>

              {current && !searchQuery && (
                <AnimatePresence mode="wait">
                  <m.div
                    key={current.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {/* Meta info row */}
                    <div className="flex items-center gap-2 mb-2.5 text-sm text-white/50">
                      {contentRating && (
                        <span className="inline-block border border-white/30 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/70 leading-none">
                          {contentRating}
                        </span>
                      )}
                      {year && <span>{year}</span>}
                      {genres.length > 0 && (
                        <>
                          <span className="text-white/20">|</span>
                          <span>{genres.join(' \u00B7 ')}</span>
                        </>
                      )}
                      {displayScore != null && displayScore > 0 && (
                        <>
                          <span className="text-white/20">|</span>
                          <span
                            className="inline-flex items-center gap-1 font-bold"
                            style={{ color: getRatingHex(displayScore) }}
                          >
                            <Star size={12} className="fill-current" />
                            {displayScore.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.1] mb-2.5 drop-shadow-lg">
                      {title}
                    </h2>

                    {/* Overview */}
                    {!trailerPlaying && current.overview && (
                      <p className="text-[14px] text-white/50 line-clamp-2 mb-5 max-w-xl leading-relaxed">
                        {current.overview}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/details/${mt}/${current.id}`)}
                        className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black rounded-xl px-6 py-2.5 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-black/20"
                      >
                        <Play size={16} fill="black" />
                        Details
                      </button>
                      <button
                        onClick={() => router.push(`/details/${mt}/${current.id}`)}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-xl px-6 py-2.5 text-sm font-bold transition-all active:scale-95"
                      >
                        <Info size={16} />
                        More Info
                      </button>
                    </div>
                  </m.div>
                </AnimatePresence>
              )}

              {/* When searching, show just studio name big */}
              {searchQuery && (
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
                  {studio.name}
                </h1>
              )}

              {/* When loading with no items yet */}
              {!current && !loading && (
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
                  {studio.name}
                </h1>
              )}
            </div>

            {/* Trailer controls — right side */}
            {trailerPlaying && (
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 shrink-0 mb-2"
              >
                <button
                  onClick={togglePause}
                  className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/15 transition-colors"
                  title={paused ? 'Play trailer' : 'Pause trailer'}
                >
                  {paused ? <Play size={16} fill="white" className="ml-0.5" /> : <Pause size={16} />}
                </button>
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/15 transition-colors"
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </m.div>
            )}
          </div>
        </div>

        {/* Progress indicators */}
        {items.length > 1 && (
          <div className="absolute bottom-6 right-0 z-[4] flex gap-2 items-center pr-[clamp(20px,5vw,64px)]">
            {items.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
                style={{ width: i === currentIndex ? '36px' : '12px' }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full" />
                {i === currentIndex && (
                  <div
                    key={progressKey}
                    className="absolute inset-0 bg-white rounded-full animate-progress-fill"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main Page ──

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = STUDIOS.find((s) => s.slug === slug);

  const [tab, setTab] = useState<Tab>('movies');
  const [popular, setPopular] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [page2, setPage2] = useState<any[]>([]);
  const [page3, setPage3] = useState<any[]>([]);
  const [tvPopular, setTvPopular] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tvLoaded, setTvLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMovies = useCallback(async (s: Studio) => {
    setLoading(true);
    const fetcher = s.tmdb_id
      ? (page: number) => getMoviesByCompany(s.tmdb_id!, page)
      : (page: number) => getMoviesByLanguage(s.language!, page);
    const topFetcher = s.tmdb_id
      ? () => getTopRatedByCompany(s.tmdb_id!)
      : () => getTopRatedByLanguage(s.language!);
    const newFetcher = s.tmdb_id
      ? () => getNewReleasesByCompany(s.tmdb_id!)
      : () => getNewReleasesByLanguage(s.language!);

    const [p1, p2, p3, top, recent] = await Promise.all([
      fetcher(1),
      fetcher(2),
      fetcher(3),
      topFetcher(),
      newFetcher(),
    ]);

    applyStoredScores(p1, 'movie');
    applyStoredScores(p2, 'movie');
    applyStoredScores(p3, 'movie');
    applyStoredScores(top, 'movie');
    applyStoredScores(recent, 'movie');

    setPopular(p1);
    setPage2(p2);
    setPage3(p3);
    setTopRated(top);
    setNewReleases(recent);
    setLoading(false);

    enrichItemsWithRatings(p1, 'movie').then(setPopular);
    enrichItemsWithRatings(top, 'movie').then(setTopRated);
    enrichItemsWithRatings(recent, 'movie').then(setNewReleases);

    // Enrich visible items with content ratings (PG, R, etc.)
    enrichWithCertifications(p1, 'movie').then(() => setPopular([...p1]));
    enrichWithCertifications(top, 'movie').then(() => setTopRated([...top]));
    enrichWithCertifications(recent, 'movie').then(() => setNewReleases([...recent]));
  }, []);

  const fetchTV = useCallback(async (s: Studio) => {
    if (tvLoaded) return;
    const fetcher = s.tmdb_id
      ? () => getTVByCompany(s.tmdb_id!)
      : () => getTVByLanguage(s.language!);

    const data = await fetcher();
    applyStoredScores(data, 'tv');
    setTvPopular(data);
    setTvLoaded(true);

    enrichItemsWithRatings(data, 'tv').then(setTvPopular);
    enrichWithCertifications(data, 'tv').then(() => setTvPopular([...data]));
  }, [tvLoaded]);

  useEffect(() => {
    if (!studio) return;
    loadStaticScoreDB();
    fetchMovies(studio);
  }, [studio, fetchMovies]);

  useEffect(() => {
    if (!studio || tab !== 'tv') return;
    fetchTV(studio);
  }, [studio, tab, fetchTV]);

  // Hero items — top 5 popular movies with backdrop
  const heroItems = useMemo(() => {
    if (popular.length === 0) return [];
    return popular
      .filter((m: any) => m.backdrop_path)
      .slice(0, 8)
      .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 5);
  }, [popular]);

  // Filter all movies by search query
  const filterBySearch = useCallback((items: any[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((m: any) =>
      (m.title || m.name || '').toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!studio) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 text-lg">Studio not found</p>
        <button onClick={() => router.push('/studios')} className="mt-4 text-accent hover:underline text-sm">
          Back to Studios
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* ── Rotating Hero with trailer, search, tabs ── */}
      <StudioHero
        heroItems={heroItems}
        studio={studio}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        tab={tab}
        onTabChange={setTab}
        loading={loading}
      />

      {tab === 'movies' ? (
        loading ? (
          <div className="space-y-8">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {/* New Releases */}
            {filterBySearch(newReleases).length > 0 && (
              <ScrollRow title="New Releases">
                {filterBySearch(newReleases).map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="movie" />
                ))}
              </ScrollRow>
            )}

            {/* Top Rated */}
            {filterBySearch(topRated).length > 0 && (
              <ScrollRow title="Top Rated">
                {filterBySearch(topRated).map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="movie" />
                ))}
              </ScrollRow>
            )}

            {/* Popular */}
            {filterBySearch(popular).length > 0 && (
              <ScrollRow title="Popular">
                {filterBySearch(popular).map((m: any) => (
                  <MediaCard key={m.id} item={m} mediaType="movie" />
                ))}
              </ScrollRow>
            )}

            {/* More movies — deduplicated */}
            {(() => {
              const shownIds = new Set([...popular, ...topRated, ...newReleases].map((m: any) => m.id));
              const moreItems = filterBySearch([...page2, ...page3].filter((m: any) => !shownIds.has(m.id)));
              if (moreItems.length === 0) return null;
              return (
                <ScrollRow title={`More from ${studio.name}`}>
                  {moreItems.map((m: any) => (
                    <MediaCard key={m.id} item={m} mediaType="movie" />
                  ))}
                </ScrollRow>
              );
            })()}

            {/* Empty search state */}
            {searchQuery && filterBySearch([...popular, ...topRated, ...newReleases, ...page2, ...page3]).length === 0 && (
              <div className="text-center py-16">
                <p className="text-white/30 text-sm">No movies matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </>
        )
      ) : (
        !tvLoaded ? (
          <div className="space-y-8">
            <SkeletonRow />
          </div>
        ) : filterBySearch(tvPopular).length > 0 ? (
          <ScrollRow title="TV Shows">
            {filterBySearch(tvPopular).map((s: any) => (
              <MediaCard key={s.id} item={s} mediaType="tv" />
            ))}
          </ScrollRow>
        ) : (
          <p className="text-white/30 text-sm py-10 text-center">
            {searchQuery ? `No TV shows matching "${searchQuery}"` : `No TV shows found for ${studio.name}`}
          </p>
        )
      )}
    </div>
  );
}
