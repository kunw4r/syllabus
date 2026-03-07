'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Plus, Check, Play, Info, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToLibrary } from '@/lib/api/library';
import { TMDB_IMG, TMDB_IMG_ORIGINAL, GENRE_ID_TO_NAME } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex, sampleImageBrightness } from '@/lib/utils/rating-colors';
import { usePreviewModal } from '@/components/providers/PreviewModalProvider';

interface MediaItem {
  id?: number | string;
  key?: string;
  openlibrary_key?: string;
  google_books_id?: string;
  title?: string;
  name?: string;
  volumeInfo?: { title?: string };
  unified_rating?: number;
  vote_average?: number;
  rating?: number | string;
  release_date?: string;
  first_air_date?: string;
  first_publish_year?: string | number;
  poster_path?: string;
  backdrop_path?: string;
  cover_url?: string;
  cover_urls?: string[];
  genre_ids?: number[];
  genres?: { name: string }[];
  subject?: string[];
  media_type?: string;
}

interface MediaCardProps {
  item: MediaItem;
  mediaType?: 'movie' | 'tv' | 'book';
  showAdd?: boolean;
  variant?: 'landscape' | 'poster';
  size?: 'default' | 'small';
  onRemove?: () => void;
  progressLabel?: string; // e.g. "S2 E5" or "1h 23m"
}

export default function MediaCard({
  item,
  mediaType = 'movie',
  showAdd = true,
  variant,
  size = 'default',
  onRemove,
  progressLabel,
}: MediaCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { openPreview } = usePreviewModal();
  const [added, setAdded] = useState(false);
  const [isBright, setIsBright] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsBright(sampleImageBrightness(e.currentTarget, 'top-right'));
  }, []);

  const isBook = mediaType === 'book';
  // Default: landscape for movie/tv, poster for books
  const mode = variant ?? (isBook ? 'poster' : 'landscape');

  const title =
    item.title || item.name || item.volumeInfo?.title || 'Unknown';
  const rating = item.unified_rating || item.vote_average || item.rating;
  const year = (
    item.release_date ||
    item.first_air_date ||
    item.first_publish_year ||
    ''
  )
    .toString()
    .slice(0, 4);

  // Image sources
  let poster: string | null = null;
  let backdrop: string | null = null;

  if (isBook) {
    poster =
      item.poster_path ||
      item.cover_url ||
      (item.cover_urls && item.cover_urls[0]) ||
      null;
  } else {
    poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null;
    backdrop = item.backdrop_path ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}` : null;
  }

  // For landscape mode, prefer backdrop, fall back to poster
  // If the primary image failed, try the fallback
  const landscapeImg = imgFailed ? (poster || null) : (backdrop || poster);
  const posterImg = imgFailed ? null : poster;
  const displayImg = mode === 'landscape' ? landscapeImg : posterImg;

  const handleClick = () => {
    if (isBook) {
      const bookId =
        item.key?.replace('/works/', '') ||
        item.openlibrary_key ||
        item.google_books_id;
      if (bookId) router.push(`/details/book/${bookId}`);
    } else {
      router.push(`/details/${mediaType}/${item.id}`);
    }
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || added) return;
    try {
      await addToLibrary({
        tmdb_id: !isBook ? item.id ?? null : null,
        openlibrary_key:
          isBook
            ? item.key?.replace('/works/', '') || item.openlibrary_key || null
            : null,
        media_type: mediaType,
        title,
        poster_url: poster,
        backdrop_url: backdrop,
        genres: (
          item.genre_ids?.map(String) ||
          item.genres?.map((g) => g.name) ||
          item.subject ||
          []
        )
          .slice(0, 5)
          .join(', '),
        external_rating: rating ?? null,
      });
      setAdded(true);
    } catch {
      // silently fail
    }
  };

  // Resolve genre names
  const genreNames = (
    item.genre_ids?.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean) ||
    item.genres?.map((g) => g.name) ||
    []
  ).slice(0, 3);

  // ── Landscape card (16:9 backdrop) — Netflix-style hover ──
  if (mode === 'landscape') {
    return (
      <div
        className={`group/card relative cursor-pointer min-w-0 z-0 hover:z-40 ${
          variant ? 'w-full' : `shrink-0 ${size === 'small' ? 'w-[200px] sm:w-[240px] lg:w-[280px]' : 'w-[260px] sm:w-[320px] lg:w-[380px]'}`
        }`}
        style={{ perspective: '800px' }}
        onClick={handleClick}
      >
        {/* 3D lift + scale — pops out toward the viewer */}
        <div
          className="transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-center group-hover/card:delay-150"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover/card:rounded-xl group-hover/card:shadow-[0_14px_50px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08)] group-hover/card:scale-[1.15] group-hover/card:-translate-y-2 group-hover/card:delay-300">
            {/* Image */}
            {displayImg ? (
              <img
                src={displayImg}
                alt={title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onLoad={handleImgLoad}
                onError={() => setImgFailed(true)}
                loading="lazy"
              />
            ) : poster ? (
              /* No backdrop available — show poster centered over blurred bg */
              <div className="w-full h-full bg-dark-800 relative">
                <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={poster} alt={title} className="h-full w-auto max-w-[40%] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                {'\u{1F3AC}'}
              </div>
            )}

            {/* Rating badge — always visible, top-right; hidden on hover so overlay is clean */}
            {rating != null && (
              <div
                className="absolute top-2 right-2 rounded-md px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-md border border-white/10 z-10 group-hover/card:opacity-0 transition-opacity duration-200"
                style={{ background: getRatingBg(Number(rating), isBright), boxShadow: getRatingGlow(Number(rating)) }}
              >
                <Star size={10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                <span className="text-[11px] font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
                  {typeof rating === 'number' ? rating.toFixed(1) : rating}
                </span>
              </div>
            )}

            {/* Resting state — title + year + progress at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/70 via-[40%] to-transparent group-hover/card:opacity-0 transition-opacity duration-200 pointer-events-none">
              <p className="text-[13px] font-semibold text-white truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                {title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {year && (
                  <p className="text-[11px] text-white/50" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{year}</p>
                )}
                {progressLabel && (
                  <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/20 border border-blue-500/30 rounded px-1.5 py-px leading-tight">
                    {progressLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Hover overlay — gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20" />

            {/* Hover controls overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20">
              {/* Top row — rating left, add + info right */}
              <div className="flex justify-between items-start">
                {rating != null ? (
                  <div
                    className="rounded-md px-1.5 py-0.5 flex items-center gap-1 backdrop-blur-md border border-white/10"
                    style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
                  >
                    <Star size={10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                    <span className="text-[11px] font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
                      {typeof rating === 'number' ? rating.toFixed(1) : rating}
                    </span>
                  </div>
                ) : <div />}
                <div className="flex gap-1.5">
                  {showAdd && user && !added ? (
                    <button
                      onClick={handleAdd}
                      className="w-8 h-8 rounded-full border-2 border-white/50 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:border-white hover:bg-black/60 transition-all active:scale-90"
                      title="Add to Library"
                    >
                      <Plus size={16} className="text-white" />
                    </button>
                  ) : added ? (
                    <div className="w-8 h-8 rounded-full border-2 border-green-500/60 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Check size={16} className="text-green-400" />
                    </div>
                  ) : null}
                  {onRemove && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(); }}
                      className="w-8 h-8 rounded-full border-2 border-white/50 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:border-red-400 hover:bg-red-500/20 transition-all active:scale-90"
                      title="Remove"
                    >
                      <Trash2 size={14} className="text-white hover:text-red-400" />
                    </button>
                  )}
                  {!isBook && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openPreview(item, mediaType); }}
                      className="w-8 h-8 rounded-full border-2 border-white/50 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:border-white hover:bg-black/60 transition-all"
                    >
                      <Info size={14} className="text-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Center — big play button */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); handleClick(); }}
                  className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white hover:scale-110 transition-all pointer-events-auto shadow-lg shadow-black/30"
                >
                  <Play size={22} className="text-black fill-black ml-0.5" />
                </button>
              </div>

              {/* Bottom — title + metadata */}
              <div>
                <p className="text-sm font-bold text-white truncate drop-shadow-lg leading-tight">
                  {title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/70">
                  {year && <span className="font-medium">{year}</span>}
                  {genreNames.length > 0 && year && <span className="text-white/30">&#8226;</span>}
                  {genreNames.map((g, i) => (
                    <span key={g} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-white/30">&#8226;</span>}
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Poster card (2:3 vertical) — premium book style ──
  return (
    <div
      className={`group cursor-pointer ${variant ? 'w-full' : 'shrink-0 w-[130px] sm:w-[150px] lg:w-[170px]'}`}
      onClick={handleClick}
    >
      <div
        className="relative aspect-[2/3] rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:shadow-black/50"
        style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4), -1px -1px 4px rgba(255,255,255,0.03)' }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onLoad={handleImgLoad}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dark-600 to-dark-800 flex items-center justify-center text-white/15 text-4xl">
            {isBook ? '\u{1F4DA}' : '\u{1F3AC}'}
          </div>
        )}

        {/* Spine edge effect for books */}
        {isBook && (
          <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-white/10 via-white/5 to-white/10" />
        )}

        {rating != null && (
          <div
            className="absolute top-2 right-2 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 backdrop-blur-md border border-white/10"
            style={{ background: getRatingBg(Number(rating), isBright), boxShadow: getRatingGlow(Number(rating)) }}
          >
            <Star size={9} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
            <span className="text-[11px] font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
              {typeof rating === 'number' ? rating.toFixed(1) : rating}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {showAdd && user && !added && (
          <button
            onClick={handleAdd}
            className="absolute bottom-2 right-2 bg-accent/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent active:scale-90 z-10"
          >
            <Plus size={14} className="text-white" />
          </button>
        )}

        {added && (
          <div className="absolute bottom-2 right-2 bg-green-500/80 backdrop-blur-sm rounded-full p-1.5 z-10">
            <Check size={14} className="text-white" />
          </div>
        )}
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-[13px] font-medium text-white/80 truncate group-hover:text-white transition-colors leading-tight">
          {title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {year && <span className="text-[11px] text-white/30">{year}</span>}
          {(item as any).certification && (
            <>
              {year && <span className="text-white/15 text-[11px]">&#8226;</span>}
              <span className="text-[10px] font-bold text-white/40 border border-white/15 rounded px-1 py-px leading-none">
                {(item as any).certification}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
