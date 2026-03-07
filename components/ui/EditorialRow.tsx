'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';

interface EditorialRowProps {
  title: string;
  items: any[];
  mediaType?: 'movie' | 'tv' | 'book';
  showRank?: boolean;
}

export default function EditorialRow({ title, items, mediaType = 'movie', showRank = false }: EditorialRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
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

      <div ref={ref} className={`flex overflow-x-auto overflow-y-visible scrollbar-hide pt-14 pb-16 -mt-12 -mb-14 px-5 sm:px-8 lg:px-14 -mx-5 sm:-mx-8 lg:-mx-14 ${showRank ? 'gap-0' : 'gap-4'}`}>
        {items.map((item: any, idx: number) => (
          showRank ? (
            <div key={item.id || item.key || item.google_books_id} className="relative shrink-0 flex items-end">
              {/* Large rank number */}
              <span
                className="relative z-[1] text-[120px] sm:text-[150px] lg:text-[180px] font-black leading-[0.8] select-none pointer-events-none -mr-4 sm:-mr-5"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  color: 'transparent',
                  WebkitTextStroke: '2px rgba(255,255,255,0.15)',
                  textShadow: '0 0 40px rgba(0,0,0,0.8)',
                  paintOrder: 'stroke fill',
                }}
              >
                {idx + 1}
              </span>
              <div className="relative z-[2]">
                <MediaCard
                  item={item}
                  mediaType={item.media_type || mediaType}
                />
              </div>
            </div>
          ) : (
            <MediaCard
              key={item.id || item.key || item.google_books_id}
              item={item}
              mediaType={item.media_type || mediaType}
            />
          )
        ))}
      </div>
    </section>
  );
}
