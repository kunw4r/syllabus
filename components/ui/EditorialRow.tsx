'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { TMDB_IMG_ORIGINAL, TMDB_IMG } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

interface EditorialRowProps {
  title: string;
  items: any[];
  mediaType?: 'movie' | 'tv' | 'book';
}

export default function EditorialRow({ title, items, mediaType = 'movie' }: EditorialRowProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
    }
  };

  const handleClick = (item: any) => {
    const mt = item.media_type || mediaType;
    if (mt === 'book') {
      const k = item.key?.replace('/works/', '') || item.openlibrary_key || item.google_books_id;
      if (k) router.push(`/details/book/${k}`);
    } else {
      router.push(`/details/${mt}/${item.id}`);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item: any) => {
          const itemTitle = item.title || item.name || 'Unknown';
          const rating = item.unified_rating || item.vote_average;
          const backdrop = item.backdrop_path
            ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}`
            : item.poster_path
              ? `${TMDB_IMG}${item.poster_path}`
              : null;

          return (
            <div
              key={item.id || item.key || item.google_books_id}
              className="shrink-0 w-[260px] sm:w-[300px] cursor-pointer group"
              onClick={() => handleClick(item)}
            >
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/30">
                {backdrop ? (
                  <img
                    src={backdrop}
                    alt={itemTitle}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                    {mediaType === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
                  </div>
                )}

                {/* Bottom gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Rating badge */}
                {rating != null && rating > 0 && (
                  <div
                    className="absolute top-2 right-2 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5 backdrop-blur-md border border-white/10"
                    style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
                  >
                    <Star size={10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                    <span className="text-xs font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(rating)) }}>
                      {Number(rating).toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Title overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-semibold text-white truncate drop-shadow-lg group-hover:text-accent transition-colors">
                    {itemTitle}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
