'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Info } from 'lucide-react';
import { TMDB_IMG_ORIGINAL } from '@/lib/constants';

interface HeroItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  vote_average?: number;
  media_type?: string;
}

interface HeroBannerProps {
  items: HeroItem[];
}

export default function HeroBanner({ items }: HeroBannerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter to items with backdrops
  const heroItems = items.filter((i) => i.backdrop_path).slice(0, 5);

  const advance = useCallback(() => {
    if (heroItems.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % heroItems.length);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(advance, 8000);
    return () => clearInterval(interval);
  }, [advance, heroItems.length]);

  if (heroItems.length === 0) return null;

  const current = heroItems[currentIndex];
  const title = current.title || current.name || 'Unknown';
  const mt = current.media_type || 'movie';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden group">
      {/* Backdrop image */}
      <div className="relative h-[280px] sm:h-[360px] lg:h-[420px]">
        {heroItems.map((item, i) => (
          <img
            key={item.id}
            src={`${TMDB_IMG_ORIGINAL}${item.backdrop_path}`}
            alt={item.title || item.name || ''}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <div className="max-w-lg">
          {/* Rating badge */}
          {current.vote_average != null && current.vote_average > 0 && (
            <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 mb-3">
              <Star size={14} className="text-gold fill-gold" />
              <span className="text-sm font-bold text-gold">
                {current.vote_average.toFixed(1)}
              </span>
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-2">
            {title}
          </h2>

          {current.overview && (
            <p className="text-sm text-white/60 line-clamp-2 mb-4 max-w-md">
              {current.overview}
            </p>
          )}

          <button
            onClick={() => router.push(`/details/${mt}/${current.id}`)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/80 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all active:scale-95"
          >
            <Info size={16} />
            Details
          </button>
        </div>
      </div>

      {/* Dot indicators */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-accent w-6'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
