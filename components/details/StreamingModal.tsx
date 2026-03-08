'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Check, Server, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Tv } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_STILL = 'https://image.tmdb.org/t/p/w300';

interface ProviderResult {
  id: string;
  name: string;
  url: string;
  working: boolean;
}

interface EpisodeInfo {
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
}

interface SeasonInfo {
  season_number: number;
  episode_count: number;
  episodes?: EpisodeInfo[];
}

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
  seasons?: SeasonInfo[];
  onEpisodeChange?: (season: number, episode: number) => void;
  onStartWatching?: () => void;
}

export default function StreamingModal({
  isOpen, onClose, tmdbId, imdbId, mediaType, title, year,
  season: initialSeason, episode: initialEpisode,
  backdropPath, backdropImages, seasons,
  onEpisodeChange, onStartWatching,
}: StreamingModalProps) {
  const [phase, setPhase] = useState<'resolving' | 'playing'>('resolving');
  const [statusText, setStatusText] = useState('Finding best server...');
  const [workingProviders, setWorkingProviders] = useState<ProviderResult[]>([]);
  const [currentProviderIdx, setCurrentProviderIdx] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  // TV episode state
  const [currentSeason, setCurrentSeason] = useState(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode || 1);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allBackdrops = (backdropImages?.length ? backdropImages : (backdropPath ? [backdropPath] : []))
    .map(p => `${TMDB_BACKDROP}${p}`);

  // Cycle backdrop images during resolving
  useEffect(() => {
    if (phase !== 'resolving' || allBackdrops.length <= 1) return;
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % allBackdrops.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phase, allBackdrops.length]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPhase('resolving');
      setStatusText('Finding best server...');
      setWorkingProviders([]);
      setCurrentProviderIdx(0);
      setEmbedUrl(null);
      setShowSettings(false);
      setShowEpisodes(false);
      setControlsVisible(false);
      setBgIndex(0);
      setCurrentSeason(initialSeason || 1);
      setCurrentEpisode(initialEpisode || 1);
    }
  }, [isOpen, initialSeason, initialEpisode]);

  // Resolve stream server-side when modal opens or episode changes
  const resolveStream = useCallback(async (s?: number, e?: number) => {
    setPhase('resolving');
    setStatusText('Checking servers...');

    const params = new URLSearchParams({ tmdbId, mediaType });
    if (mediaType === 'tv') {
      params.set('season', String(s ?? currentSeason));
      params.set('episode', String(e ?? currentEpisode));
    }

    try {
      const res = await fetch(`/api/resolve-stream?${params}`);
      const data = await res.json();
      const all: ProviderResult[] = data.allProviders || [];
      const working = all.filter(p => p.working);

      setWorkingProviders(working.length > 0 ? working : all);

      if (working.length > 0) {
        setStatusText(`Stream ready!`);
        setCurrentProviderIdx(0);
        setEmbedUrl(working[0].url);

        // Brief delay for the "Stream ready!" message
        await new Promise(r => setTimeout(r, 800));
        setPhase('playing');
        onStartWatching?.();
      } else {
        // No confirmed working providers — try first one anyway
        setStatusText('Loading stream...');
        setEmbedUrl(all[0]?.url || null);
        await new Promise(r => setTimeout(r, 1000));
        setPhase('playing');
        onStartWatching?.();
      }
    } catch {
      setStatusText('Connection error. Retrying...');
      // Retry once after short delay
      await new Promise(r => setTimeout(r, 2000));
      setPhase('playing');
    }
  }, [tmdbId, mediaType, currentSeason, currentEpisode, onStartWatching]);

  useEffect(() => {
    if (!isOpen) return;
    resolveStream();
  }, [isOpen]); // Only on initial open

  // Auto-hide controls
  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettings(false);
      setShowEpisodes(false);
    }, 4000);
  };

  const switchServer = (index: number) => {
    const providers = workingProviders;
    if (index >= 0 && index < providers.length) {
      setCurrentProviderIdx(index);
      setEmbedUrl(providers[index].url);
      setPhase('resolving');
      setStatusText(`Switching to ${providers[index].name}...`);
      setTimeout(() => setPhase('playing'), 1500);
    }
    setShowSettings(false);
  };

  const changeEpisode = (s: number, e: number) => {
    setCurrentSeason(s);
    setCurrentEpisode(e);
    setShowEpisodes(false);
    onEpisodeChange?.(s, e);
    resolveStream(s, e);
  };

  const nextEpisode = () => {
    const currentSeasonData = seasons?.find(s => s.season_number === currentSeason);
    if (!currentSeasonData) return;

    if (currentEpisode < currentSeasonData.episode_count) {
      changeEpisode(currentSeason, currentEpisode + 1);
    } else {
      // Next season
      const nextSeason = seasons?.find(s => s.season_number === currentSeason + 1);
      if (nextSeason) {
        changeEpisode(currentSeason + 1, 1);
      }
    }
  };

  const prevEpisode = () => {
    if (currentEpisode > 1) {
      changeEpisode(currentSeason, currentEpisode - 1);
    } else {
      const prevSeason = seasons?.find(s => s.season_number === currentSeason - 1);
      if (prevSeason) {
        changeEpisode(currentSeason - 1, prevSeason.episode_count);
      }
    }
  };

  if (!isOpen) return null;

  const currentSeasonData = seasons?.find(s => s.season_number === currentSeason);
  const currentEpisodeData = currentSeasonData?.episodes?.find(e => e.episode_number === currentEpisode);
  const displayTitle = mediaType === 'tv'
    ? `${title} · S${String(currentSeason).padStart(2, '0')}E${String(currentEpisode).padStart(2, '0')}`
    : title;
  const episodeTitle = currentEpisodeData?.name || '';

  return (
    <div
      className="fixed inset-0 z-[200] bg-black"
      onMouseMove={showControls}
      onClick={() => { setShowSettings(false); setShowEpisodes(false); }}
    >
      {/* ── Resolving / Loading Screen ── */}
      <AnimatePresence>
        {phase === 'resolving' && (
          <m.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          >
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

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_100%)]" />

            <div className="relative z-10 flex flex-col items-center text-center px-8">
              <m.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-8"
              >
                <Play size={28} fill="white" className="text-white ml-1" />
              </m.div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2 drop-shadow-lg">{title}</h2>
              <p className="text-sm text-white/40 mb-6">
                {year || ''}
                {mediaType === 'tv' ? ` · Season ${currentSeason}, Episode ${currentEpisode}` : ''}
                {episodeTitle ? ` · ${episodeTitle}` : ''}
              </p>

              <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mb-3">
                <m.div
                  className="h-full bg-white/60 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: statusText.includes('ready') ? '100%' : '70%' }}
                  transition={{ duration: statusText.includes('ready') ? 0.3 : 3, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-[12px] text-white/30">{statusText}</p>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Embedded Player ── */}
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="origin"
        />
      )}

      {/* ── Top Controls (hover) ── */}
      <AnimatePresence>
        {phase === 'playing' && controlsVisible && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate">{displayTitle}</p>
              {episodeTitle && <p className="text-white/40 text-[11px] truncate">{episodeTitle}</p>}
            </div>

            {/* TV: Episode navigation */}
            {mediaType === 'tv' && (
              <>
                <button
                  onClick={prevEpisode}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Previous episode"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Episodes panel toggle */}
                <div className="relative">
                  <button
                    onClick={() => { setShowEpisodes(!showEpisodes); setShowSettings(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors"
                  >
                    <Tv size={13} />
                    Episodes
                  </button>

                  {/* Episodes dropdown */}
                  <AnimatePresence>
                    {showEpisodes && currentSeasonData && (
                      <m.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                      >
                        {/* Season selector */}
                        {seasons && seasons.filter(s => s.season_number > 0).length > 1 && (
                          <div className="flex gap-1 p-2 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
                            {seasons.filter(s => s.season_number > 0).map(s => (
                              <button
                                key={s.season_number}
                                onClick={() => setCurrentSeason(s.season_number)}
                                className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  s.season_number === currentSeason
                                    ? 'bg-accent/20 text-accent'
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                }`}
                              >
                                S{s.season_number}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Episode list */}
                        <div className="overflow-y-auto max-h-72 p-1.5">
                          {Array.from({ length: currentSeasonData.episode_count }, (_, i) => {
                            const epNum = i + 1;
                            const ep = currentSeasonData.episodes?.find(e => e.episode_number === epNum);
                            const isActive = currentSeason === (initialSeason || 1) && epNum === currentEpisode;
                            return (
                              <button
                                key={epNum}
                                onClick={() => changeEpisode(currentSeason, epNum)}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                  isActive ? 'bg-accent/15' : 'hover:bg-white/5'
                                }`}
                              >
                                {ep?.still_path && (
                                  <img
                                    src={`${TMDB_STILL}${ep.still_path}`}
                                    alt=""
                                    className="w-20 h-12 rounded-md object-cover bg-dark-700 shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${isActive ? 'text-accent' : 'text-white/50'}`}>
                                      E{epNum}
                                    </span>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                                  </div>
                                  <p className="text-[11px] text-white/70 truncate">{ep?.name || `Episode ${epNum}`}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={nextEpisode}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Next episode"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            {/* Server switch */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowEpisodes(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors"
              >
                <Server size={13} />
                {workingProviders[currentProviderIdx]?.name || 'Server'}
                <ChevronDown size={12} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <m.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-1">
                      {workingProviders.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => switchServer(i)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            i === currentProviderIdx
                              ? 'bg-accent/15 text-accent'
                              : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                          }`}
                        >
                          {i === currentProviderIdx ? <Check size={12} /> : <div className="w-3" />}
                          <span className="font-medium">{p.name}</span>
                          {p.working && <span className="ml-auto text-[9px] text-green-400/60">online</span>}
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => resolveStream(currentSeason, currentEpisode)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              title="Reload"
            >
              <RefreshCw size={15} />
            </button>

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
