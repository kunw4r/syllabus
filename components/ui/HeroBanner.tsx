'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Info, Play, Plus } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { extractDominantColor } from '@/lib/utils/color-extract';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

interface HeroItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  vote_average?: number;
  unified_rating?: number | null;
  media_type?: string;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
}

interface HeroBannerProps {
  items: HeroItem[];
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10765: 'Sci-Fi & Fantasy',
};

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
  const year = (current.release_date || current.first_air_date || '').slice(0, 4);
  const genres = (current.genre_ids || []).slice(0, 3).map((id) => GENRE_MAP[id]).filter(Boolean);
  const displayScore = current.unified_rating ?? current.vote_average;

  return (
    <div className="relative w-full overflow-hidden -mx-[clamp(20px,5vw,64px)] px-0" style={{ width: 'calc(100% + 2 * clamp(20px, 5vw, 64px))' }}>
      {/* Ambient glow */}
      <div
        className="absolute -inset-12 -z-10 opacity-25 blur-3xl transition-colors duration-[1200ms]"
        style={{ backgroundColor: `rgb(${ambientColor})` }}
      />

      {/* Backdrop images */}
      <div className="relative h-[75vh] min-h-[450px] max-h-[800px]">
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
              className={`w-full h-full object-cover object-[center_20%] ${
                currentIndex % 2 === 0
                  ? 'animate-ken-burns-zoom'
                  : 'animate-ken-burns-zoom-alt'
              }`}
              loading="eager"
            />
          </m.div>
        </AnimatePresence>

        {/* Premium gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/70 via-transparent to-transparent" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(14,17,23,0.3) 100%)' }} />
        {/* Ambient color tint */}
        <div
          className="absolute inset-0 opacity-15 transition-colors duration-[1200ms]"
          style={{
            background: `radial-gradient(ellipse at 30% 80%, rgb(${ambientColor}) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 pb-16 sm:pb-20" style={{ paddingLeft: 'clamp(20px, 5vw, 64px)', paddingRight: 'clamp(20px, 5vw, 64px)' }}>
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <m.div
              key={current.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Meta info */}
              <div className="flex items-center gap-2 mb-3 text-sm text-white/50">
                {year && <span>{year}</span>}
                {genres.length > 0 && (
                  <>
                    <span className="text-white/20">|</span>
                    <span>{genres.join(' \u00B7 ')}</span>
                  </>
                )}
                {displayScore != null && displayScore > 0 && (
                  <>
                    <span className="text-white/20">|</span>
                    <span
                      className="inline-flex items-center gap-1 font-bold"
                      style={{ color: getRatingHex(displayScore) }}
                    >
                      <Star size={12} className="fill-current" />
                      {displayScore.toFixed(1)}
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-3 drop-shadow-lg">
                {title}
              </h2>

              {current.overview && (
                <p className="text-[15px] text-white/55 line-clamp-3 mb-6 max-w-xl leading-relaxed">
                  {current.overview}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/details/${mt}/${current.id}`)}
                  className="inline-flex items-center gap-2.5 bg-white hover:bg-white/90 text-black rounded-xl px-7 py-3 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-black/20"
                >
                  <Play size={18} fill="black" />
                  Play
                </button>
                <button
                  onClick={() => router.push(`/details/${mt}/${current.id}`)}
                  className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-xl px-7 py-3 text-sm font-bold transition-all active:scale-95"
                >
                  <Info size={18} />
                  More Info
                </button>
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress indicators */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-6 right-0 flex gap-2 items-center" style={{ paddingRight: 'clamp(20px, 5vw, 64px)' }}>
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                setProgressKey((k) => k + 1);
              }}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === currentIndex ? '36px' : '12px' }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              {i === currentIndex && (
                <div
                  key={progressKey}
                  className="absolute inset-0 bg-white rounded-full animate-progress-fill"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
