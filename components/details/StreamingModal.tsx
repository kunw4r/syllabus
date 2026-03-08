'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Download, Loader2, HardDrive, Check, Settings, ChevronDown, MonitorPlay, Server } from 'lucide-react';
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

// ─── Props ───

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
  backdropImages?: string[]; // array of backdrop file_paths from TMDB images
}

export default function StreamingModal({
  isOpen, onClose, tmdbId, imdbId, mediaType, title, year, season, episode,
  backdropPath, backdropImages,
}: StreamingModalProps) {
  const [phase, setPhase] = useState<'loading' | 'playing'>('loading');
  const [currentProvider, setCurrentProvider] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cycle backdrop images during loading
  const allBackdrops = (backdropImages?.length ? backdropImages : (backdropPath ? [backdropPath] : []))
    .map(p => `${TMDB_BACKDROP}${p}`);

  useEffect(() => {
    if (phase !== 'loading' || allBackdrops.length <= 1) return;
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % allBackdrops.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, allBackdrops.length]);

  // Start auto-trying providers when modal opens
  useEffect(() => {
    if (!isOpen) {
      setPhase('loading');
      setCurrentProvider(0);
      setIframeLoaded(false);
      setIframeError(false);
      setShowSettings(false);
      setBgIndex(0);
      return;
    }
    setPhase('loading');
    setIframeLoaded(false);
    setIframeError(false);
  }, [isOpen]);

  // When provider changes, give it time to load, then move to next if it fails
  useEffect(() => {
    if (!isOpen || phase === 'playing') return;

    setIframeLoaded(false);
    setIframeError(false);

    // Timeout: if iframe doesn't signal load in 8s, try next
    loadTimerRef.current = setTimeout(() => {
      if (!iframeLoaded) {
        tryNextProvider();
      }
    }, 8000);

    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current); };
  }, [currentProvider, isOpen]);

  const tryNextProvider = useCallback(() => {
    if (currentProvider < STREAM_PROVIDERS.length - 1) {
      setCurrentProvider(prev => prev + 1);
    } else {
      // Cycled through all — stay on last one, user can manually switch
      setPhase('playing');
    }
  }, [currentProvider]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    // Short delay to let the iframe's content actually render
    setTimeout(() => setPhase('playing'), 500);
  };

  const switchServer = (index: number) => {
    setCurrentProvider(index);
    setPhase('loading');
    setIframeLoaded(false);
    setShowSettings(false);
  };

  if (!isOpen) return null;

  const provider = STREAM_PROVIDERS[currentProvider];
  const embedUrl = provider.buildUrl({ tmdbId, imdbId, mediaType, season, episode });

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {/* ── Loading Screen ── */}
      <AnimatePresence>
        {phase === 'loading' && (
          <m.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          >
            {/* Cycling backdrop images */}
            {allBackdrops.length > 0 && (
              <AnimatePresence mode="wait">
                <m.img
                  key={bgIndex}
                  src={allBackdrops[bgIndex]}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 0.3, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

            {/* Loading content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-2 border-white/10 border-t-accent mb-6"
              />
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h2>
              {year && <p className="text-sm text-white/40 mb-6">{year}{mediaType === 'tv' && season ? ` · Season ${season}, Episode ${episode}` : ''}</p>}
              <p className="text-sm text-white/30">
                Finding best server<span className="animate-pulse">...</span>
              </p>
              <p className="text-xs text-white/15 mt-2">
                Trying {provider.name} ({currentProvider + 1}/{STREAM_PROVIDERS.length})
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Iframe (loads in background during loading phase) ── */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className={`w-full h-full border-0 transition-opacity duration-500 ${phase === 'playing' ? 'opacity-100' : 'opacity-0'}`}
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="origin"
        onLoad={handleIframeLoad}
        onError={() => tryNextProvider()}
      />

      {/* ── Player overlay controls (only when playing) ── */}
      {phase === 'playing' && (
        <>
          {/* Top bar — title + close */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 p-3 bg-gradient-to-b from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm font-medium truncate">{title}</p>
              <p className="text-white/30 text-[10px]">
                {provider.name}
                {year ? ` · ${year}` : ''}
                {mediaType === 'tv' && season ? ` · S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : ''}
              </p>
            </div>

            {/* Server switch button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors"
              >
                <Server size={14} /> Server
                <ChevronDown size={12} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {/* Server dropdown */}
              <AnimatePresence>
                {showSettings && (
                  <m.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {STREAM_PROVIDERS.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => switchServer(i)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                          i === currentProvider
                            ? 'bg-accent/10 text-accent'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                        }`}
                      >
                        {i === currentProvider && <Check size={12} className="text-accent" />}
                        {i !== currentProvider && <div className="w-3" />}
                        <span className="font-medium">{p.name}</span>
                      </button>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
