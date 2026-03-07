'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';

interface EditorialRowProps {
  title: string;
  items: any[];
  mediaType?: 'movie' | 'tv' | 'book';
}

export default function EditorialRow({ title, items, mediaType = 'movie' }: EditorialRowProps) {
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

      <div ref={ref} className="flex gap-4 overflow-x-auto overflow-y-visible scrollbar-hide pt-10 pb-12 -mt-8 -mb-10 px-14 -mx-14">
        {items.map((item: any) => (
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
