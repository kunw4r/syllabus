'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { TMDB_IMG_ORIGINAL, TMDB_IMG } from '@/lib/constants';
import MediaCard from './MediaCard';

interface EditorialRowProps {
  title: string;
  items: any[];
  mediaType?: 'movie' | 'tv' | 'book';
}

export default function EditorialRow({ title, items, mediaType = 'movie' }: EditorialRowProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const featured = items[0];
  const rest = items.slice(1);
  const featuredTitle = featured.title || featured.name || 'Unknown';
  const featuredMt = featured.media_type || mediaType;

  const scroll = (dir: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
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
        {/* Featured large card */}
        <div
          className="shrink-0 w-[280px] sm:w-[320px] cursor-pointer group relative rounded-xl overflow-hidden"
          onClick={() => {
            if (featuredMt === 'book') {
              const k = featured.key?.replace('/works/', '') || featured.openlibrary_key || featured.google_books_id;
              if (k) router.push(`/details/book/${k}`);
            } else {
              router.push(`/details/${featuredMt}/${featured.id}`);
            }
          }}
        >
          <div className="aspect-[16/10] relative overflow-hidden">
            {featured.backdrop_path ? (
              <img
                src={`${TMDB_IMG_ORIGINAL}${featured.backdrop_path}`}
                alt={featuredTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : featured.poster_path ? (
              <img
                src={mediaType === 'book' ? featured.poster_path : `${TMDB_IMG}${featured.poster_path}`}
                alt={featuredTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-dark-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/30 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {(featured.unified_rating ?? featured.vote_average) > 0 && (
              <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-0.5 mb-2">
                <Star size={12} className="text-gold fill-gold" />
                <span className="text-xs font-bold text-gold">{(featured.unified_rating ?? featured.vote_average).toFixed(1)}</span>
              </div>
            )}
            <h3 className="font-serif text-xl text-white leading-tight group-hover:text-accent transition-colors">
              {featuredTitle}
            </h3>
            {featured.overview && (
              <p className="text-xs text-white/50 line-clamp-1 mt-1">{featured.overview}</p>
            )}
          </div>
        </div>

        {/* Remaining standard cards */}
        {rest.map((item: any) => (
          <MediaCard
            key={item.id || item.key || item.google_books_id}
            item={item}
            mediaType={item.media_type || mediaType}
          />
        ))}
      </div>
    </section>
  );
}
