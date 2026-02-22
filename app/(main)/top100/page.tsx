'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Trophy, Film, Tv, BookOpen, Users } from 'lucide-react';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import BookCover from '@/components/ui/BookCover';
import { getTop100Movies, getTop100TV } from '@/lib/api/tmdb';
import { getTop100Books } from '@/lib/api/books';
import {
  enrichChart,
  getCachedChart,
  getChartAge,
  applyStoredScores,
} from '@/lib/scoring';
import { MOVIE_GENRES, TV_GENRES, TMDB_IMG } from '@/lib/constants';

// ─── Genre lists ───

const MOVIE_GENRE_PILLS = [
  { id: null as number | null, name: 'All' },
  ...MOVIE_GENRES,
];

const TV_GENRE_PILLS = [
  { id: null as number | null, name: 'All' },
  ...TV_GENRES,
];

const BOOK_GENRES = [
  { id: null, name: 'All' },
  { id: 'fiction', name: 'Fiction' },
  { id: 'science_fiction', name: 'Sci-Fi' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'horror', name: 'Horror' },
  { id: 'romance', name: 'Romance' },
  { id: 'history', name: 'History' },
  { id: 'biography', name: 'Biography' },
  { id: 'science', name: 'Science' },
  { id: 'philosophy', name: 'Philosophy' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'true_crime', name: 'True Crime' },
  { id: 'self-help', name: 'Self-Help' },
];

// ─── Tab definitions ───

const TABS = [
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'shows', label: 'TV Shows', icon: Tv },
  { key: 'books', label: 'Books', icon: BookOpen },
] as const;

// ─── RankedItem sub-component ───

function RankedItem({
  rank,
  item,
  title,
  year,
  poster,
  mediaType,
}: {
  rank: number;
  item: any;
  title: string;
  year: string;
  poster: string | null;
  mediaType: string;
}) {
  const router = useRouter();
  const [imgBroken, setImgBroken] = useState(false);

  const rankColor =
    rank === 1
      ? 'text-gold'
      : rank === 2
        ? 'text-gray-300'
        : rank === 3
          ? 'text-amber-600'
          : 'text-white/20';

  const isBook = mediaType === 'book';
  const rating = isBook
    ? item.rating
    : (item.unified_rating ?? item.vote_average);
  const ratingLabel = isBook
    ? ''
    : item.unified_rating != null
      ? 'Syllabus'
      : '';

  const handleClick = () => {
    if (isBook) {
      const workKey = item.key?.replace('/works/', '') || '';
      if (workKey) router.push(`/details/book/${workKey}`);
    } else {
      router.push(`/details/${mediaType}/${item.id}`);
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer group"
      onClick={handleClick}
    >
      {/* Rank */}
      <span
        className={`text-2xl sm:text-3xl font-black w-10 sm:w-14 text-center flex-shrink-0 ${rankColor}`}
      >
        {rank}
      </span>

      {/* Poster */}
      {isBook ? (
        <BookCover
          coverUrls={item.cover_urls || (poster ? [poster] : [])}
          alt={title}
          className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform object-cover aspect-[2/3]"
        />
      ) : poster && !imgBroken ? (
        <img
          src={poster}
          alt={title}
          className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform object-cover aspect-[2/3]"
          onError={() => setImgBroken(true)}
          onLoad={(e) => {
            if ((e.target as HTMLImageElement).naturalWidth <= 1)
              setImgBroken(true);
          }}
        />
      ) : (
        <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-dark-600 flex-shrink-0 flex items-center justify-center aspect-[2/3]">
          <BookOpen size={16} className="text-white/20" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base truncate">{title}</p>
        <p className="text-xs text-white/30 mt-0.5">
          {year}
          {isBook && item.author ? ` \u00b7 ${item.author}` : ''}
          {!isBook && item.genres?.length > 0
            ? ` \u00b7 ${item.genres.map((g: any) => g.name).join(', ')}`
            : ''}
        </p>
        {isBook &&
          (item.already_read > 0 || item.want_to_read > 0) && (
            <p className="text-[10px] text-white/20 mt-0.5 flex items-center gap-1">
              <Users size={12} />
              {(
                (item.already_read || 0) +
                (item.want_to_read || 0) +
                (item.currently_reading || 0)
              ).toLocaleString()}{' '}
              readers
            </p>
          )}
      </div>

      {/* Rating */}
      {rating > 0 && (
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-gold fill-gold" />
            <span className="text-sm font-bold">
              {Number(rating).toFixed(1)}
            </span>
            <span className="text-[10px] text-white/20 hidden sm:inline">
              / 10
            </span>
          </div>
          {ratingLabel && (
            <span className="text-[9px] text-white/15 mt-0.5">
              {ratingLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───

export default function Top100Page() {
  return (
    <Suspense fallback={
      <div className="min-w-0">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={28} className="text-gold" />
            <h1 className="text-3xl font-black">Top 100</h1>
          </div>
          <p className="text-white/40 text-sm">The highest rated of all time, ranked by Syllabus Score.</p>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] animate-pulse">
              <div className="w-10 sm:w-14 h-6 rounded bg-white/5" />
              <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-white/5" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-white/5 mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <Top100Content />
    </Suspense>
  );
}

function Top100Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore tab & genre from URL params (preserves state on back-nav)
  const [tab, setTab] = useState<string>(
    () => searchParams.get('tab') || 'movies',
  );
  const [genre, setGenre] = useState<number | string | null>(() => {
    const g = searchParams.get('genre');
    if (!g) return null;
    const parsed = Number(g);
    return isNaN(parsed) ? g : parsed;
  });
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Race-condition guard: increment on every fetch, ignore stale responses
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (t: string, g: number | string | null) => {
    const thisRequest = ++requestIdRef.current;
    const stale = () => requestIdRef.current !== thisRequest;

    setLoading(true);
    setProgress(null);

    const mediaType = t === 'movies' ? 'movie' : t === 'shows' ? 'tv' : 'book';
    const chartKey = `${mediaType}:${g || 'all'}`;

    // Progress callback
    const onProgress = ({
      completed,
      total,
    }: {
      completed: number;
      total: number;
    }) => {
      if (stale()) return;
      setProgress(total > 0 ? Math.round((completed / total) * 100) : 100);
    };

    // Phase 1: Try instant load from chart cache (0 API calls)
    if (t !== 'books') {
      const cachedItems = getCachedChart(chartKey);
      if (cachedItems && cachedItems.length > 0) {
        if (stale()) return;
        setItems(cachedItems.slice(0, 100));
        setLoading(false);
        const age = getChartAge(chartKey);
        setLastUpdated(age);

        // If cache is < 24h old, we're done
        if (age < 24 * 60 * 60 * 1000) return;

        // Cache is stale: re-fetch and re-enrich in background
        const raw =
          t === 'movies'
            ? await getTop100Movies(g as number | null)
            : await getTop100TV(g as number | null);
        if (stale()) return;
        const enriched = await enrichChart(raw, mediaType, chartKey, onProgress);
        if (stale()) return;
        setItems(enriched.slice(0, 100));
        setLastUpdated(0);
        return;
      }
    }

    // Phase 2: No cache -- fetch from APIs
    let result: any[] = [];
    if (t === 'movies') result = await getTop100Movies(g as number | null);
    else if (t === 'shows') result = await getTop100TV(g as number | null);
    else result = await getTop100Books(g as string | null);

    if (stale()) return;

    if (t !== 'books') {
      // Show immediately with any locally stored scores
      applyStoredScores(result, mediaType);
      result.sort((a, b) => {
        const ra = a.unified_rating ?? a.vote_average ?? 0;
        const rb = b.unified_rating ?? b.vote_average ?? 0;
        return rb - ra;
      });
      setItems(result.slice(0, 100));
      setLoading(false);

      // Enrich in background with progress bar
      const enriched = await enrichChart(result, mediaType, chartKey, onProgress);
      if (stale()) return;
      setItems(enriched.slice(0, 100));
      setLastUpdated(0);
    } else {
      setItems(result);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab, genre);
  }, [tab, genre, fetchData]);

  // Sync tab & genre to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'movies') params.set('tab', tab);
    if (genre != null) params.set('genre', String(genre));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '/top100', { scroll: false });
  }, [tab, genre, router]);

  const handleTabChange = (t: string) => {
    setTab(t);
    setGenre(null);
  };

  const genres =
    tab === 'movies'
      ? MOVIE_GENRE_PILLS
      : tab === 'shows'
        ? TV_GENRE_PILLS
        : BOOK_GENRES;
  const mediaType =
    tab === 'movies' ? 'movie' : tab === 'shows' ? 'tv' : 'book';

  // Format "last updated" time
  const updatedLabel = (() => {
    if (lastUpdated === null || lastUpdated === undefined) return null;
    if (lastUpdated === 0) return 'Just now';
    const mins = Math.floor(lastUpdated / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-gold" />
          <h1 className="text-3xl font-black">Top 100</h1>
        </div>
        <p className="text-white/40 text-sm">
          The highest rated of all time, ranked by Syllabus Score.
          {updatedLabel && (
            <span className="text-white/20 ml-2">
              &middot; Updated {updatedLabel}
            </span>
          )}
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Genre Filter Pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {genres.map((g) => (
          <button
            key={g.id ?? 'all'}
            onClick={() => setGenre(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              genre === g.id
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/[0.02] text-white/35 hover:text-white/60 hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Progress bar during background enrichment */}
      {progress !== null && progress < 100 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-white/30 mb-1.5">
            <span>Scoring titles...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] animate-pulse"
            >
              <div className="w-10 sm:w-14 h-6 rounded bg-white/5" />
              <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-white/5" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-white/5 mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No results for this genre</p>
          <p className="text-sm mt-1">Try a different category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const title = item.title || item.name;
            const isBook = mediaType === 'book';
            const year = isBook
              ? (item.first_publish_year || '').toString()
              : (item.release_date || item.first_air_date || '').slice(0, 4);
            const poster = isBook
              ? item.poster_path
              : item.poster_path
                ? `${TMDB_IMG}${item.poster_path}`
                : null;

            return (
              <RankedItem
                key={item.id || item.key || i}
                rank={i + 1}
                item={item}
                title={title}
                year={year}
                poster={poster}
                mediaType={mediaType}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
