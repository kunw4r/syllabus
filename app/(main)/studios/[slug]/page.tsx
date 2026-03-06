'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Star, X } from 'lucide-react';
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
} from '@/lib/api/tmdb';
import {
  applyStoredScores,
  loadStaticScoreDB,
  enrichItemsWithRatings,
} from '@/lib/scoring';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import { STUDIOS, TMDB_IMG_ORIGINAL, type Studio } from '@/lib/constants';


type Tab = 'movies' | 'tv';

// ── Hero Banner — uses the top movie's backdrop ──

function StudioHero({
  movie,
  studio,
  searchQuery,
  onSearchChange,
  tab,
  onTabChange,
}: {
  movie: any | null;
  studio: Studio;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const router = useRouter();
  const backdrop = movie?.backdrop_path
    ? `${TMDB_IMG_ORIGINAL}${movie.backdrop_path}`
    : null;

  return (
    <div className="relative -mx-[clamp(20px,5vw,64px)] mb-8" style={{ width: 'calc(100% + 2 * clamp(20px, 5vw, 64px))' }}>
      <div className="relative w-full aspect-[2.8/1] sm:aspect-[3/1] overflow-hidden">
        {backdrop ? (
          <img
            src={backdrop}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-700 to-dark-900" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1117] via-[#0e1117]/50 to-[#0e1117]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e1117]/80 via-[#0e1117]/20 to-transparent" />

        {/* Top bar: Back button */}
        <div className="absolute top-0 left-0 right-0 px-[clamp(20px,5vw,64px)] pt-4">
          <button
            onClick={() => router.push('/studios')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Studios
          </button>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-[clamp(20px,5vw,64px)] pb-6 sm:pb-8">
          {/* Studio name */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none mb-1">
            {studio.name}
          </h1>
          <p className="text-white/30 text-sm mb-5">
            {studio.tmdb_id ? 'Production Company' : studio.language === 'hi' ? 'Indian Film Industry' : studio.language === 'ko' ? 'South Korean Cinema' : 'Japanese Animation'}
          </p>

          {/* Search + Tabs inline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`Search in ${studio.name}...`}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.08] text-sm text-white placeholder-white/25 outline-none focus:border-white/15 focus:bg-white/[0.12] backdrop-blur-md transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-white/[0.06] backdrop-blur-md rounded-xl p-1 border border-white/[0.08]">
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

          {/* Featured movie info */}
          {movie && !searchQuery && (
            <Link href={`/details/movie/${movie.id}`} className="group mt-5 block max-w-lg">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">
                Featured
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight mb-1 group-hover:text-accent transition-colors">
                {movie.title}
              </h2>
              {(() => {
                const rating = movie.unified_rating || movie.vote_average;
                if (!rating || rating <= 0) return null;
                return (
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{
                        background: getRatingBg(Number(rating)),
                        boxShadow: getRatingGlow(Number(rating)),
                      }}
                    >
                      <Star size={10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                      <span style={{ color: getRatingHex(Number(rating)) }}>
                        {Number(rating).toFixed(1)}
                      </span>
                    </span>
                    {movie.release_date && (
                      <span className="text-xs text-white/35">{movie.release_date.slice(0, 4)}</span>
                    )}
                  </div>
                );
              })()}
            </Link>
          )}
        </div>
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

  // Hero movie — best rated from popular that has a backdrop
  const heroMovie = useMemo(() => {
    if (popular.length === 0) return null;
    const withBackdrop = popular.filter((m: any) => m.backdrop_path);
    if (withBackdrop.length === 0) return null;
    // Pick the one with highest vote average from the first 5
    return withBackdrop.slice(0, 5).sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))[0];
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
      {/* ── Integrated Hero with back, title, search, tabs ── */}
      <StudioHero
        movie={heroMovie}
        studio={studio}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        tab={tab}
        onTabChange={setTab}
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
