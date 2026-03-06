'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Trophy, Film, Tv, BookOpen, Grid3X3, Rows3 } from 'lucide-react';
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
import { MOVIE_GENRES, TV_GENRES, TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex, sampleImageBrightness } from '@/lib/utils/rating-colors';

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

// ─── View layout type ───

type ViewLayout = 'poster' | 'landscape';

// ─── RankedCard sub-component ───

function RankedCard({
  rank,
  item,
  title,
  year,
  poster,
  backdrop,
  mediaType,
  layout,
}: {
  rank: number;
  item: any;
  title: string;
  year: string;
  poster: string | null;
  backdrop: string | null;
  mediaType: string;
  layout: ViewLayout;
}) {
  const router = useRouter();
  const [imgBroken, setImgBroken] = useState(false);
  const [isBright, setIsBright] = useState(false);
  const [isBrightTR, setIsBrightTR] = useState(false);

  const checkBrightness = useCallback((img: HTMLImageElement) => {
    // Bottom-left for rank number
    try {
      const canvas = document.createElement('canvas');
      const size = 40;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const sx = 0;
      const sy = img.naturalHeight - Math.min(img.naturalHeight * 0.35, img.naturalHeight);
      const sw = Math.min(img.naturalWidth * 0.3, img.naturalWidth);
      const sh = img.naturalHeight - sy;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let totalLum = 0;
      const pixels = size * size;
      for (let i = 0; i < data.length; i += 4) {
        totalLum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      }
      setIsBright(totalLum / pixels > 160);
    } catch { /* CORS */ }
    // Top-right for rating badge
    setIsBrightTR(sampleImageBrightness(img, 'top-right'));
  }, []);

  const isBook = mediaType === 'book';
  const rating = isBook
    ? item.rating
    : (item.unified_rating ?? item.vote_average);

  const handleClick = () => {
    if (isBook) {
      const workKey = item.key?.replace('/works/', '') || '';
      if (workKey) router.push(`/details/book/${workKey}`);
    } else {
      router.push(`/details/${mediaType}/${item.id}`);
    }
  };

  const ringClass =
    rank === 1 ? 'ring-yellow-500/40'
    : rank === 2 ? 'ring-gray-300/30'
    : rank === 3 ? 'ring-amber-600/30'
    : 'ring-white/[0.06]';

  const rankColor =
    rank === 1 ? (isBright ? 'text-yellow-600' : 'text-yellow-400')
    : rank === 2 ? (isBright ? 'text-gray-500' : 'text-gray-300')
    : rank === 3 ? (isBright ? 'text-amber-700' : 'text-amber-500')
    : isBright ? 'text-black/50' : 'text-white/60';

  const isLandscape = layout === 'landscape';
  const hasBackdrop = !isBook && backdrop && !imgBroken;
  const displayImg = isLandscape && hasBackdrop ? backdrop : poster;
  // In landscape mode without a backdrop, show poster centered over blurred bg
  const posterFallbackLandscape = isLandscape && !isBook && !hasBackdrop && poster && !imgBroken;

  return (
    <div
      className="group relative cursor-pointer"
      onClick={handleClick}
    >
      <div className={`relative ${isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]'} rounded-xl overflow-hidden ring-1 ${ringClass} group-hover:ring-accent/50 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300`}>
        {isBook ? (
          <div className="absolute inset-0 bg-dark-700 flex items-center justify-center">
            <BookCover
              coverUrls={item.cover_urls || (poster ? [poster] : [])}
              alt={title}
              className="h-full w-auto max-w-[90%] object-contain"
            />
          </div>
        ) : posterFallbackLandscape ? (
          /* Poster centered over blurred version for landscape cards without backdrops */
          <div className="absolute inset-0 bg-dark-800">
            <img
              src={poster!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={poster!}
                alt={title}
                className="h-full w-auto max-w-[45%] object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgBroken(true)}
                loading="lazy"
              />
            </div>
          </div>
        ) : displayImg && !imgBroken ? (
          <img
            src={displayImg}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            crossOrigin="anonymous"
            onLoad={(e) => checkBrightness(e.currentTarget)}
            onError={() => setImgBroken(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-5xl">
            {isBook ? '\u{1F4DA}' : '\u{1F3AC}'}
          </div>
        )}

        {/* Bottom gradient */}
        <div className={`absolute inset-x-0 bottom-0 ${isLandscape ? 'h-3/4' : 'h-2/3'} bg-gradient-to-t from-black/90 via-black/40 to-transparent`} />

        {/* Rating badge — top-right */}
        {rating > 0 && (
          <div
            className={`absolute ${isLandscape ? 'top-3 right-3 px-2 py-1' : 'top-2.5 right-2.5 px-1.5 py-0.5'} flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg`}
            style={{ background: getRatingBg(Number(rating), isBrightTR), boxShadow: getRatingGlow(Number(rating)) }}
          >
            <Star size={isLandscape ? 12 : 10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
            <span className={`${isLandscape ? 'text-sm' : 'text-xs'} font-bold`} style={{ color: getRatingHex(Number(rating)) }}>
              {Number(rating).toFixed(1)}
            </span>
          </div>
        )}

        {/* Rank number */}
        <div className={`absolute ${isLandscape ? 'bottom-3 left-4' : 'bottom-2 left-2.5'}`}>
          <span
            className={`${isLandscape ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'} font-black ${rankColor} leading-none transition-colors duration-300`}
            style={{
              textShadow: isBright
                ? '0 0 12px rgba(255,255,255,0.6), 0 2px 8px rgba(255,255,255,0.4)'
                : '0 0 16px rgba(0,0,0,1), 0 2px 10px rgba(0,0,0,0.9), 0 0 0 3px rgba(0,0,0,0.7)',
              paintOrder: 'stroke fill',
              WebkitTextStroke: rank <= 3 ? 'none' : isBright ? '1px rgba(0,0,0,0.15)' : '1px rgba(255,255,255,0.15)',
            }}
          >
            {rank}
          </span>
        </div>

        {/* Title + year */}
        <div className={`absolute ${isLandscape ? 'bottom-3 left-20 sm:left-24' : 'bottom-2 left-14 sm:left-16'} right-3`}>
          <p className={`font-bold ${isLandscape ? 'text-base sm:text-lg' : 'text-sm'} text-white truncate drop-shadow-lg group-hover:text-accent transition-colors`}>
            {title}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5 truncate">
            {year}
            {isBook && item.author ? ` \u00b7 ${item.author}` : ''}
          </p>
        </div>
      </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.02] animate-pulse" />
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

  const [tab, setTab] = useState<string>(
    () => searchParams.get('tab') || 'movies',
  );
  const [genre, setGenre] = useState<number | string | null>(() => {
    const g = searchParams.get('genre');
    if (!g) return null;
    const parsed = Number(g);
    return isNaN(parsed) ? g : parsed;
  });
  const [viewLayout, setViewLayout] = useState<ViewLayout>('landscape');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (t: string, g: number | string | null) => {
    const thisRequest = ++requestIdRef.current;
    const stale = () => requestIdRef.current !== thisRequest;

    setLoading(true);
    setProgress(null);

    const mediaType = t === 'movies' ? 'movie' : t === 'shows' ? 'tv' : 'book';
    const chartKey = `${mediaType}:${g || 'all'}`;

    const onProgress = ({ completed, total }: { completed: number; total: number }) => {
      if (stale()) return;
      setProgress(total > 0 ? Math.round((completed / total) * 100) : 100);
    };

    if (t !== 'books') {
      const cachedItems = getCachedChart(chartKey);
      if (cachedItems && cachedItems.length > 0) {
        if (stale()) return;
        setItems(cachedItems.slice(0, 100));
        setLoading(false);
        const age = getChartAge(chartKey);
        setLastUpdated(age);

        if (age < 24 * 60 * 60 * 1000) return;

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

    let result: any[] = [];
    if (t === 'movies') result = await getTop100Movies(g as number | null);
    else if (t === 'shows') result = await getTop100TV(g as number | null);
    else result = await getTop100Books(g as string | null);

    if (stale()) return;

    if (t !== 'books') {
      applyStoredScores(result, mediaType);
      result.sort((a, b) => {
        const ra = a.unified_rating ?? a.vote_average ?? 0;
        const rb = b.unified_rating ?? b.vote_average ?? 0;
        return rb - ra;
      });
      setItems(result.slice(0, 100));
      setLoading(false);

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

      {/* Genre Filter Pills + View Toggle */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
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
        <div className="flex gap-1 shrink-0 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
          <button
            onClick={() => setViewLayout('poster')}
            className={`p-1.5 rounded-md transition-all ${viewLayout === 'poster' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            title="Poster view"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewLayout('landscape')}
            className={`p-1.5 rounded-md transition-all ${viewLayout === 'landscape' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            title="Landscape view"
          >
            <Rows3 size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {progress !== null && progress < 100 && (
        <div className="mb-6">
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
        <div className={viewLayout === 'poster'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          {Array.from({ length: viewLayout === 'poster' ? 10 : 9 }, (_, i) => (
            <div key={i} className={`${viewLayout === 'poster' ? 'aspect-[2/3]' : 'aspect-[16/9]'} rounded-xl bg-white/[0.02] animate-pulse`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No results for this genre</p>
          <p className="text-sm mt-1">Try a different category</p>
        </div>
      ) : (
        <div className={viewLayout === 'poster'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
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
            const backdrop = !isBook && item.backdrop_path
              ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}`
              : null;

            return (
              <RankedCard
                key={item.id || item.key || i}
                rank={i + 1}
                item={item}
                title={title}
                year={year}
                poster={poster}
                backdrop={backdrop}
                mediaType={mediaType}
                layout={viewLayout}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
