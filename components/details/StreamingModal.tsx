'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Check, Server, ChevronDown, RefreshCw } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

// ─── Embedded Streaming Providers ───

interface StreamProvider {
  name: string;
  id: string;
  buildUrl: (opts: { tmdbId: string; imdbId: string; mediaType: 'movie' | 'tv'; season?: number; episode?: number }) => string;
}

const STREAM_PROVIDERS: StreamProvider[] = [
  {
    name: 'Server 1',
    id: 'vidsrc-pro',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
  },
  {
    name: 'Server 2',
    id: 'vidsrc-icu',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.icu/embed/movie/${tmdbId}`
        : `https://vidsrc.icu/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
  },
  {
    name: 'Server 3',
    id: 'vidsrc-cc',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
  },
  {
    name: 'Server 4',
    id: 'superembed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`,
  },
  {
    name: 'Server 5',
    id: 'embed-su',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
  },
  {
    name: 'Server 6',
    id: 'autoembed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
  },
];

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: string;
  imdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  year?: string;
  season?: number;
  episode?: number;
  backdropPath?: string;
  backdropImages?: string[];
}

export default function StreamingModal({
  isOpen, onClose, tmdbId, imdbId, mediaType, title, year, season, episode,
  backdropPath, backdropImages,
}: StreamingModalProps) {
  const [loading, setLoading] = useState(true);
  const [currentProvider, setCurrentProvider] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allBackdrops = (backdropImages?.length ? backdropImages : (backdropPath ? [backdropPath] : []))
    .map(p => `${TMDB_BACKDROP}${p}`);

  // Cycle backdrop images during loading
  useEffect(() => {
    if (!loading || allBackdrops.length <= 1) return;
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % allBackdrops.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading, allBackdrops.length]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setCurrentProvider(0);
      setShowSettings(false);
      setBgIndex(0);
      setControlsVisible(false);
    }
  }, [isOpen]);

  // Loading screen — show for 3 seconds then reveal player
  useEffect(() => {
    if (!isOpen || !loading) return;
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [isOpen, loading, currentProvider]);

  // Auto-hide controls after 3s
  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettings(false);
    }, 3000);
  };

  const switchServer = (index: number) => {
    setCurrentProvider(index);
    setLoading(true);
    setShowSettings(false);
  };

  if (!isOpen) return null;

  const provider = STREAM_PROVIDERS[currentProvider];
  const embedUrl = provider.buildUrl({ tmdbId, imdbId, mediaType, season, episode });

  return (
    <div
      className="fixed inset-0 z-[200] bg-black"
      onMouseMove={showControls}
      onClick={() => { if (showSettings) setShowSettings(false); }}
    >
      {/* ── Loading Screen ── */}
      <AnimatePresence>
        {loading && (
          <m.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          >
            {/* Cycling backdrop images */}
            {allBackdrops.length > 0 && (
              <AnimatePresence mode="wait">
                <m.img
                  key={bgIndex}
                  src={allBackdrops[bgIndex]}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 0.35, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_100%)]" />

            {/* Loading content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8">
              <m.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-8"
              >
                <Play size={28} fill="white" className="text-white ml-1" />
              </m.div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2 drop-shadow-lg">{title}</h2>
              {year && (
                <p className="text-sm text-white/40 mb-8">
                  {year}
                  {mediaType === 'tv' && season ? ` · Season ${season}, Episode ${episode}` : ''}
                </p>
              )}

              {/* Loading bar */}
              <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <m.div
                  className="h-full bg-white/60 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.8, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-[11px] text-white/20 mt-3">Loading {provider.name}</p>
            </div>

            {/* Close during loading */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Iframe — always mounted, hidden behind loading screen ── */}
      <iframe
        key={`${provider.id}-${tmdbId}`}
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="origin"
      />

      {/* ── Top controls bar (hover to show) ── */}
      <AnimatePresence>
        {!loading && controlsVisible && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate">{title}</p>
              <p className="text-white/30 text-[10px]">
                {provider.name}
                {year ? ` · ${year}` : ''}
                {mediaType === 'tv' && season ? ` · S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : ''}
              </p>
            </div>

            {/* Server switch */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors"
              >
                <Server size={13} />
                {provider.name}
                <ChevronDown size={12} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <m.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-1">
                      {STREAM_PROVIDERS.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => switchServer(i)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            i === currentProvider
                              ? 'bg-accent/15 text-accent'
                              : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                          }`}
                        >
                          {i === currentProvider ? <Check size={12} /> : <div className="w-3" />}
                          <span className="font-medium">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setLoading(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              title="Reload"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
