'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Plus, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToLibrary } from '@/lib/api/library';
import { TMDB_IMG, TMDB_IMG_ORIGINAL, GENRE_ID_TO_NAME } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

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
}

export default function MediaCard({
  item,
  mediaType = 'movie',
  showAdd = true,
  variant,
}: MediaCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);

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
  const landscapeImg = backdrop || poster;
  const displayImg = mode === 'landscape' ? landscapeImg : poster;

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
        className="group/card relative cursor-pointer shrink-0 w-[240px] sm:w-[280px] min-w-0 z-0 hover:z-30"
      >
        <div
          className="relative aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-white/10 transition-all duration-300 ease-out group-hover/card:scale-[1.08] group-hover/card:ring-white/20 group-hover/card:shadow-2xl group-hover/card:shadow-black/60"
          onClick={handleClick}
        >
          {displayImg ? (
            <img
              src={displayImg}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
              {'\u{1F3AC}'}
            </div>
          )}

          {/* Gradient — stronger on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover/card:from-black/80 group-hover/card:via-black/30 transition-all duration-300" />

          {/* Rating badge */}
          {rating != null && (
            <div
              className="absolute top-2 right-2 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5 backdrop-blur-md border border-white/10"
              style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
            >
              <Star size={10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
              <span className="text-xs font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
                {typeof rating === 'number' ? rating.toFixed(1) : rating}
              </span>
            </div>
          )}

          {/* Title + year — always visible */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
              {title}
            </p>
            {year && <p className="text-[10px] text-white/40 mt-0.5">{year}</p>}
          </div>

          {/* Hover action buttons — small, top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
            {showAdd && user && !added ? (
              <button
                onClick={handleAdd}
                className="w-7 h-7 rounded-full border border-white/50 bg-black/50 backdrop-blur-sm flex items-center justify-center hover:border-white hover:bg-black/70 transition-all active:scale-90"
                title="Add to Library"
              >
                <Plus size={14} className="text-white" />
              </button>
            ) : added ? (
              <div className="w-7 h-7 rounded-full border border-green-500/60 bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                <Check size={14} className="text-green-400" />
              </div>
            ) : null}
          </div>

          {/* Genre tags — bottom, on hover */}
          {genreNames.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
              <p className="text-[10px] text-white/60 drop-shadow-lg truncate">
                {genreNames.join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Poster card (2:3 vertical) — premium book style ──
  return (
    <div
      className="group cursor-pointer shrink-0 w-[150px] sm:w-[170px]"
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
            style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
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
        {year && <p className="text-[11px] text-white/30 mt-0.5">{year}</p>}
      </div>
    </div>
  );
}
