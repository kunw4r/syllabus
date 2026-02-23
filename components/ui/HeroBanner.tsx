'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Info } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { extractDominantColor } from '@/lib/utils/color-extract';

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
  const [ambientColor, setAmbientColor] = useState('233, 69, 96');
  const [progressKey, setProgressKey] = useState(0);

  const heroItems = items.filter((i) => i.backdrop_path).slice(0, 5);

  const advance = useCallback(() => {
    if (heroItems.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % heroItems.length);
    setProgressKey((k) => k + 1);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(advance, 8000);
    return () => clearInterval(interval);
  }, [advance, heroItems.length]);

  // Extract dominant color from current backdrop
  useEffect(() => {
    const current = heroItems[currentIndex];
    if (current?.backdrop_path) {
      extractDominantColor(`${TMDB_IMG_ORIGINAL}${current.backdrop_path}`).then(
        setAmbientColor
      );
    }
  }, [currentIndex, heroItems]);

  if (heroItems.length === 0) return null;

  const current = heroItems[currentIndex];
  const title = current.title || current.name || 'Unknown';
  const mt = current.media_type || 'movie';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden group">
      {/* Ambient glow */}
      <div
        className="absolute -inset-8 -z-10 opacity-30 blur-3xl transition-colors duration-[1200ms]"
        style={{ backgroundColor: `rgb(${ambientColor})` }}
      />

      {/* Backdrop images with crossfade */}
      <div className="relative h-[50vh] min-h-[300px]">
        <AnimatePresence mode="sync">
          <m.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={`${TMDB_IMG_ORIGINAL}${current.backdrop_path}`}
              alt={title}
              className={`w-full h-full object-cover ${
                currentIndex % 2 === 0
                  ? 'animate-ken-burns-zoom'
                  : 'animate-ken-burns-zoom-alt'
              }`}
              loading="eager"
            />
          </m.div>
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />

        {/* Ambient radial gradient */}
        <div
          className="absolute inset-0 opacity-20 transition-colors duration-[1200ms]"
          style={{
            background: `radial-gradient(ellipse at 30% 80%, rgb(${ambientColor}) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <div className="max-w-lg">
          <AnimatePresence mode="wait">
            <m.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Rating badge */}
              {current.vote_average != null && current.vote_average > 0 && (
                <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 mb-3">
                  <Star size={14} className="text-gold fill-gold" />
                  <span className="text-sm font-bold text-gold">
                    {current.vote_average.toFixed(1)}
                  </span>
                </div>
              )}

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-2">
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
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar indicators */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-2 items-center">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                setProgressKey((k) => k + 1);
              }}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === currentIndex ? '32px' : '12px' }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              {i === currentIndex && (
                <div
                  key={progressKey}
                  className="absolute inset-0 bg-accent rounded-full animate-progress-fill"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
