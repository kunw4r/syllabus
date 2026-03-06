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
} from '@/lib/api/tmdb';
import {
  applyStoredScores,
  loadStaticScoreDB,
  enrichItemsWithRatings,
} from '@/lib/scoring';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import { STUDIOS, TMDB_IMG_ORIGINAL, type Studio } from '@/lib/constants';
import { STUDIO_LOGOS } from '@/components/ui/StudioLogos';

type Tab = 'movies' | 'tv';

// ── Hero Banner — uses the top movie's backdrop ──

function StudioHero({ movie, studio }: { movie: any; studio: Studio }) {
  const backdrop = movie.backdrop_path
    ? `${TMDB_IMG_ORIGINAL}${movie.backdrop_path}`
    : null;

  if (!backdrop) return null;

  return (
    <Link
      href={`/details/movie/${movie.id}`}
      className="group relative block w-full aspect-[2.4/1] sm:aspect-[2.8/1] rounded-2xl overflow-hidden mb-8"
    >
      <img
        src={backdrop}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-700 group-hover:scale-[1.02]"
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1117] via-[#0e1117]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0e1117]/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-5 sm:p-8 max-w-lg">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">
          Featured from {studio.name}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-1.5">
          {movie.title}
        </h2>
        {movie.overview && (
          <p className="text-sm text-white/45 line-clamp-2 leading-relaxed hidden sm:block">
            {movie.overview}
          </p>
        )}
        {(() => {
          const rating = movie.unified_rating || movie.vote_average;
          if (!rating || rating <= 0) return null;
          return (
            <div className="flex items-center gap-2.5 mt-2.5">
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
                <span className="text-xs text-white/40">{movie.release_date.slice(0, 4)}</span>
              )}
            </div>
          );
        })()}
      </div>
    </Link>
  );
}

// ── Search Input ──

function StudioSearch({
  query,
  onChange,
  onClear,
  studioName,
}: {
  query: string;
  onChange: (q: string) => void;
  onClear: () => void;
  studioName: string;
}) {
  return (
    <div className="relative mb-6">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Search in ${studioName}...`}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/25 outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all"
      />
      {query && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>
      )}
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

  const Logo = STUDIO_LOGOS[studio.slug];

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/studios')}
          className="flex items-center gap-1.5 text-white/35 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          All Studios
        </button>

        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${studio.tint}, #0b0f15)`,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {Logo ? <Logo size={32} /> : <span className="text-2xl sm:text-3xl">{studio.icon || studio.name[0]}</span>}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{studio.name}</h1>
            <p className="text-white/35 text-sm mt-0.5">
              {studio.tmdb_id ? 'Production Company' : studio.language === 'hi' ? 'Indian Film Industry' : studio.language === 'ko' ? 'South Korean Cinema' : 'Japanese Animation'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <StudioSearch
        query={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        studioName={studio.name}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['movies', 'tv'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white/10 text-white'
                : 'text-white/35 hover:text-white hover:bg-white/5'
            }`}
          >
            {t === 'movies' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {tab === 'movies' ? (
        loading ? (
          <div className="space-y-8">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {/* Hero Banner — only when not searching */}
            {!searchQuery && heroMovie && (
              <StudioHero movie={heroMovie} studio={studio} />
            )}

            {/* New Releases */}
            {filterBySearch(newReleases).length > 0 && (
              <ScrollRow title="New Releases">
                {filterBySearch(newReleases).map((m: any) => (
                  <div key={m.id} className="flex-shrink-0 w-[150px]">
                    <MediaCard item={m} mediaType="movie" />
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* Top Rated */}
            {filterBySearch(topRated).length > 0 && (
              <ScrollRow title="Top Rated">
                {filterBySearch(topRated).map((m: any) => (
                  <div key={m.id} className="flex-shrink-0 w-[150px]">
                    <MediaCard item={m} mediaType="movie" />
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* Popular */}
            {filterBySearch(popular).length > 0 && (
              <ScrollRow title="Popular">
                {filterBySearch(popular).map((m: any) => (
                  <div key={m.id} className="flex-shrink-0 w-[150px]">
                    <MediaCard item={m} mediaType="movie" />
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* More movies grid — deduplicated */}
            {(() => {
              const shownIds = new Set([...popular, ...topRated, ...newReleases].map((m: any) => m.id));
              const moreItems = filterBySearch([...page2, ...page3].filter((m: any) => !shownIds.has(m.id)));
              if (moreItems.length === 0) return null;
              return (
                <div className="mt-8">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4">More from {studio.name}</h2>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                    {moreItems.map((m: any) => (
                      <MediaCard key={m.id} item={m} mediaType="movie" />
                    ))}
                  </div>
                </div>
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
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">TV Shows</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {filterBySearch(tvPopular).map((s: any) => (
                <MediaCard key={s.id} item={s} mediaType="tv" />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-sm py-10 text-center">
            {searchQuery ? `No TV shows matching "${searchQuery}"` : `No TV shows found for ${studio.name}`}
          </p>
        )
      )}
    </div>
  );
}
