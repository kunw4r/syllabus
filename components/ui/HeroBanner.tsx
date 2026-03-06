'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Info, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { extractDominantColor } from '@/lib/utils/color-extract';
import { getRatingHex } from '@/lib/utils/rating-colors';
import { getMovieTrailer, getTVTrailer, getMovieContentRating, getTVContentRating } from '@/lib/api/tmdb';

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

const TRAILER_DELAY = 3000;
const SLIDE_INTERVAL = 8000;

/** Send a command to a YouTube iframe via postMessage */
function ytCommand(iframe: HTMLIFrameElement | null, func: string) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func, args: '' }),
    '*'
  );
}

export default function HeroBanner({ items }: HeroBannerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ambientColor, setAmbientColor] = useState('233, 69, 96');
  const [progressKey, setProgressKey] = useState(0);

  // Trailer state
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerReady, setTrailerReady] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout>(undefined);

  // Content rating state
  const [contentRating, setContentRating] = useState<string | null>(null);

  const heroItems = items.filter((i) => i.backdrop_path).slice(0, 5);
  const currentItemId = heroItems[currentIndex]?.id;

  // Fetch trailer + content rating for current item
  useEffect(() => {
    setTrailerKey(null);
    setTrailerReady(false);
    setShowTrailer(false);
    setContentRating(null);
    setPaused(false);

    if (!currentItemId) return;
    const current = heroItems[currentIndex];
    if (!current) return;

    let cancelled = false;
    const mt = current.media_type || 'movie';
    const fetchTrailer = mt === 'tv' ? getTVTrailer : getMovieTrailer;
    const fetchRating = mt === 'tv' ? getTVContentRating : getMovieContentRating;

    fetchTrailer(currentItemId).then((key) => {
      if (!cancelled && key) setTrailerKey(key);
    }).catch(() => {});

    fetchRating(currentItemId).then((rating) => {
      if (!cancelled && rating) setContentRating(rating);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [currentItemId]);

  // Show trailer after delay
  useEffect(() => {
    if (!trailerKey) return;
    trailerTimerRef.current = setTimeout(() => setShowTrailer(true), TRAILER_DELAY);
    return () => { if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current); };
  }, [trailerKey]);

  // Auto-advance (pause when trailer playing or user paused)
  const advance = useCallback(() => {
    if (heroItems.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % heroItems.length);
    setProgressKey((k) => k + 1);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    if (showTrailer && trailerReady) return;
    const interval = setInterval(advance, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [advance, heroItems.length, showTrailer, trailerReady]);

  // Ambient color extraction
  useEffect(() => {
    const current = heroItems[currentIndex];
    if (current?.backdrop_path) {
      extractDominantColor(`${TMDB_IMG_ORIGINAL}${current.backdrop_path}`).then(setAmbientColor);
    }
  }, [currentItemId]);

  // Mute/unmute via postMessage
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    ytCommand(iframeRef.current, next ? 'mute' : 'unMute');
  };

  // Pause/play via postMessage
  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    ytCommand(iframeRef.current, next ? 'pauseVideo' : 'playVideo');
  };

  const goToSlide = (i: number) => {
    setCurrentIndex(i);
    setProgressKey((k) => k + 1);
  };

  if (heroItems.length === 0) return null;

  const current = heroItems[currentIndex];
  const title = current.title || current.name || 'Unknown';
  const mt = current.media_type || 'movie';
  const year = (current.release_date || current.first_air_date || '').slice(0, 4);
  const genres = (current.genre_ids || []).slice(0, 3).map((id) => GENRE_MAP[id]).filter(Boolean);
  const displayScore = current.unified_rating ?? current.vote_average;
  const trailerPlaying = showTrailer && trailerReady;

  return (
    <div className="relative w-full overflow-hidden -mx-[clamp(20px,5vw,64px)] px-0" style={{ width: 'calc(100% + 2 * clamp(20px, 5vw, 64px))' }}>
      {/* Ambient glow */}
      <div
        className="absolute -inset-12 -z-10 opacity-25 blur-3xl transition-colors duration-[1200ms]"
        style={{ backgroundColor: `rgb(${ambientColor})` }}
      />

      {/* Backdrop images + trailer */}
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

        {/* YouTube trailer iframe */}
        {showTrailer && trailerKey && (
          <div
            className={`absolute inset-0 z-[1] transition-opacity duration-1000 ${
              trailerReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0" style={{ transform: 'scale(1.2)' }}>
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${trailerKey}&playsinline=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full pointer-events-none"
                style={{ border: 'none' }}
                onLoad={() => {
                  setTimeout(() => setTrailerReady(true), 800);
                }}
              />
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] z-[2] bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-dark-900/70 via-transparent to-transparent" />
        <div className="absolute inset-0 z-[2]" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(14,17,23,0.3) 100%)' }} />
        <div
          className="absolute inset-0 z-[2] opacity-15 transition-colors duration-[1200ms]"
          style={{ background: `radial-gradient(ellipse at 30% 80%, rgb(${ambientColor}) 0%, transparent 70%)` }}
        />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-[3] pb-16 sm:pb-20 px-[clamp(20px,5vw,64px)]">
        <div className="flex items-end justify-between gap-6">
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
                  {contentRating && (
                    <span className="inline-block border border-white/30 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/70 leading-none">
                      {contentRating}
                    </span>
                  )}
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

                {!trailerPlaying && current.overview && (
                  <p className="text-[15px] text-white/55 line-clamp-3 mb-6 max-w-xl leading-relaxed">
                    {current.overview}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-6">
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

          {/* Trailer controls — right side */}
          {trailerPlaying && (
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 shrink-0 mb-2"
            >
              <button
                onClick={togglePause}
                className="w-11 h-11 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/15 transition-colors"
                title={paused ? 'Play trailer' : 'Pause trailer'}
              >
                {paused ? <Play size={18} fill="white" className="ml-0.5" /> : <Pause size={18} />}
              </button>
              <button
                onClick={toggleMute}
                className="w-11 h-11 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/15 transition-colors"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </m.div>
          )}
        </div>
      </div>

      {/* Progress indicators */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-6 right-0 z-[3] flex gap-2 items-center pr-[clamp(20px,5vw,64px)]">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
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
