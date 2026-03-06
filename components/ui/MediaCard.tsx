'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Plus, Check, Play, Info } from 'lucide-react';
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
        {/* Main card — scales up on hover */}
        <div
          className="relative aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-white/10 transition-all duration-300 ease-out group-hover/card:scale-[1.15] group-hover/card:ring-0 group-hover/card:shadow-2xl group-hover/card:shadow-black/60 group-hover/card:rounded-b-none"
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

          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
              {title}
            </p>
            {year && <p className="text-[10px] text-white/40 mt-0.5">{year}</p>}
          </div>
        </div>

        {/* Expanded bottom panel — appears on hover */}
        <div
          className="absolute left-0 right-0 top-full opacity-0 scale-x-[0.87] origin-top pointer-events-none transition-all duration-300 ease-out group-hover/card:opacity-100 group-hover/card:scale-x-100 group-hover/card:pointer-events-auto z-30"
          style={{ marginTop: '-1px' }}
        >
          <div className="bg-[#181818] rounded-b-xl px-3 py-2.5 shadow-2xl shadow-black/70 border-x border-b border-white/[0.06]">
            {/* Action buttons row */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleClick}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/80 transition-colors active:scale-90"
                title="Play"
              >
                <Play size={16} className="text-black fill-black ml-0.5" />
              </button>

              {showAdd && user && !added ? (
                <button
                  onClick={handleAdd}
                  className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-white transition-colors active:scale-90"
                  title="Add to Library"
                >
                  <Plus size={16} className="text-white" />
                </button>
              ) : added ? (
                <div
                  className="w-8 h-8 rounded-full border-2 border-green-500/60 bg-green-500/20 flex items-center justify-center"
                  title="In Library"
                >
                  <Check size={16} className="text-green-400" />
                </div>
              ) : null}

              <button
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-white transition-colors active:scale-90 ml-auto"
                title="More Info"
              >
                <Info size={14} className="text-white" />
              </button>
            </div>

            {/* Genre tags */}
            {genreNames.length > 0 && (
              <p className="text-[11px] text-white/50 truncate">
                {genreNames.join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Poster card (2:3 vertical) ──
  return (
    <div
      className="group cursor-pointer shrink-0 w-[170px] sm:w-[200px]"
      onClick={handleClick}
    >
      <div
        className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/30"
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
            {isBook ? '\u{1F4DA}' : '\u{1F3AC}'}
          </div>
        )}

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

        {/* Hover info overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {year && <p className="text-[10px] text-white/60">{year}</p>}
        </div>

        {showAdd && user && !added && (
          <button
            onClick={handleAdd}
            className="absolute bottom-2 right-2 bg-accent/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent active:scale-90 z-10"
          >
            <Plus size={16} className="text-white" />
          </button>
        )}

        {added && (
          <div className="absolute bottom-2 right-2 bg-green-500/80 backdrop-blur-sm rounded-full p-1.5 z-10">
            <Check size={16} className="text-white" />
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-sm text-white/70 truncate group-hover:text-accent transition-colors">
          {title}
        </p>
        {year && <p className="text-xs text-white/30">{year}</p>}
      </div>
    </div>
  );
}
