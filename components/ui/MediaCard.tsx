'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Plus, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToLibrary } from '@/lib/api/library';
import { TMDB_IMG } from '@/lib/constants';

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
  cover_url?: string;
  cover_urls?: string[];
  genre_ids?: number[];
  genres?: { name: string }[];
  subject?: string[];
}

interface MediaCardProps {
  item: MediaItem;
  mediaType?: 'movie' | 'tv' | 'book';
  showAdd?: boolean;
}

export default function MediaCard({
  item,
  mediaType = 'movie',
  showAdd = true,
}: MediaCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);

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

  let poster: string | null = null;
  if (mediaType === 'book') {
    poster =
      item.poster_path ||
      item.cover_url ||
      (item.cover_urls && item.cover_urls[0]) ||
      null;
  } else {
    poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null;
  }

  const handleClick = () => {
    if (mediaType === 'book') {
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
        tmdb_id: mediaType !== 'book' ? item.id ?? null : null,
        openlibrary_key:
          mediaType === 'book'
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

  const isBook = mediaType === 'book';

  return (
    <div
      className="group cursor-pointer shrink-0 w-[140px] sm:w-[160px]"
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
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
            <Star size={12} className="text-gold fill-gold" />
            <span className="text-xs font-bold text-gold">
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
