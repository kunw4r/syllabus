'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Check, Server, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Tv, SkipForward } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import VideoPlayer, { SubtitleTrack, SourceOption } from '@/components/ui/VideoPlayer';
import { searchSubtitles, fetchSubtitleAsVttUrl } from '@/lib/api/opensubtitles';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_STILL = 'https://image.tmdb.org/t/p/w300';

interface ProviderResult {
  id: string;
  name: string;
  url: string;
  working: boolean;
}

interface ExtractedStream {
  url: string;
  format: 'hls' | 'mp4';
  provider: string;
  subtitles?: { label: string; file: string; language?: string }[];
  skips?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
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
  const [bgIndex, setBgIndex] = useState(0);

  // Stream state
  const [directStream, setDirectStream] = useState<ExtractedStream | null>(null);
  const [allStreams, setAllStreams] = useState<ExtractedStream[]>([]);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [workingProviders, setWorkingProviders] = useState<ProviderResult[]>([]);
  const [currentProviderIdx, setCurrentProviderIdx] = useState(0);
  const [useDirectPlayer, setUseDirectPlayer] = useState(false);

  // Subtitle state
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [loadingSubtitles, setLoadingSubtitles] = useState(false);

  // Skip intro state
  const [skipData, setSkipData] = useState<ExtractedStream['skips']>(undefined);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // TV episode state
  const [currentSeason, setCurrentSeason] = useState(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode || 1);

  const allBackdrops = (backdropImages?.length ? backdropImages : (backdropPath ? [backdropPath] : []))
    .map(p => `${TMDB_BACKDROP}${p}`);

  // ─── Cycle backdrop images during resolving ───
  useEffect(() => {
    if (phase !== 'resolving' || allBackdrops.length <= 1) return;
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % allBackdrops.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phase, allBackdrops.length]);

  // ─── Reset on open ───
  useEffect(() => {
    if (isOpen) {
      setPhase('resolving');
      setStatusText('Finding best server...');
      setDirectStream(null);
      setAllStreams([]);
      setEmbedUrl(null);
      setWorkingProviders([]);
      setCurrentProviderIdx(0);
      setUseDirectPlayer(false);
      setSubtitleTracks([]);
      setSkipData(undefined);
      setShowSkipIntro(false);
      setShowSkipOutro(false);
      setShowSettings(false);
      setShowEpisodes(false);
      setControlsVisible(false);
      setBgIndex(0);
      setCurrentSeason(initialSeason || 1);
      setCurrentEpisode(initialEpisode || 1);
    }
  }, [isOpen, initialSeason, initialEpisode]);

  // ─── Load OpenSubtitles ───
  const loadSubtitles = useCallback(async (s?: number, e?: number) => {
    if (loadingSubtitles) return;
    setLoadingSubtitles(true);
    try {
      const results = await searchSubtitles({
        imdbId: imdbId || undefined,
        tmdbId: tmdbId ? parseInt(tmdbId) : undefined,
        type: mediaType === 'movie' ? 'movie' : 'episode',
        season: mediaType === 'tv' ? (s ?? currentSeason) : undefined,
        episode: mediaType === 'tv' ? (e ?? currentEpisode) : undefined,
        languages: 'en',
      });

      const topResults = results.slice(0, 5);
      const tracks: SubtitleTrack[] = [];

      for (const sub of topResults) {
        try {
          const vttUrl = await fetchSubtitleAsVttUrl(sub.fileId);
          if (vttUrl) {
            tracks.push({
              id: `os-${sub.fileId}`,
              label: `${sub.languageName}${sub.hearingImpaired ? ' (CC)' : ''} — ${sub.release}`,
              language: sub.language,
              src: vttUrl,
              isExternal: true,
              isDefault: tracks.length === 0,
            });
          }
        } catch {
          // Skip failed subtitle
        }
      }

      setSubtitleTracks(prev => [...prev, ...tracks]);
    } catch (err) {
      console.error('[StreamingModal] Subtitle load failed:', err);
    } finally {
      setLoadingSubtitles(false);
    }
  }, [imdbId, tmdbId, mediaType, currentSeason, currentEpisode, loadingSubtitles]);

  // ─── Resolve stream ───
  const resolveStream = useCallback(async (s?: number, e?: number) => {
    setPhase('resolving');
    setStatusText('Extracting stream...');
    setDirectStream(null);
    setAllStreams([]);
    setEmbedUrl(null);
    setUseDirectPlayer(false);
    setSubtitleTracks([]);
    setSkipData(undefined);

    const params = new URLSearchParams({ tmdbId, mediaType });
    if (mediaType === 'tv') {
      params.set('season', String(s ?? currentSeason));
      params.set('episode', String(e ?? currentEpisode));
    }

    try {
      // Try direct extraction and embed fallback in parallel
      setStatusText('Extracting stream...');
      const [extractRes, resolveRes] = await Promise.allSettled([
        fetch(`/api/extract-stream?${params}`).then(r => r.json()),
        fetch(`/api/resolve-stream?${params}`).then(r => r.json()),
      ]);

      console.log('[StreamingModal] extractRes:', extractRes);
      console.log('[StreamingModal] resolveRes:', resolveRes);

      // Check direct extraction result
      if (extractRes.status === 'fulfilled' && extractRes.value.extracted && extractRes.value.stream) {
        const stream: ExtractedStream = extractRes.value.stream;
        // Proxy the stream URL through our server to avoid CORS issues
        const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(stream.url)}`;
        console.log('[StreamingModal] ✅ Using direct player, proxied URL:', proxiedUrl);
        const proxiedStream = { ...stream, url: proxiedUrl };
        setDirectStream(proxiedStream);
        const proxiedAllStreams = (extractRes.value.allStreams || [stream]).map((s: ExtractedStream) => ({
          ...s,
          url: `/api/proxy-stream?url=${encodeURIComponent(s.url)}`,
        }));
        setAllStreams(proxiedAllStreams);
        setUseDirectPlayer(true);
        setSkipData(stream.skips);

        // Use provider subtitles if available
        if (stream.subtitles?.length) {
          setSubtitleTracks(stream.subtitles.map((sub: { label?: string; language?: string; file: string }, i: number) => ({
            id: `provider-${i}`,
            label: sub.label || sub.language || `Subtitle ${i + 1}`,
            language: sub.language || 'en',
            src: sub.file,
            isExternal: true,
            isDefault: i === 0,
          })));
        }

        // Also store embed providers for fallback switching
        if (resolveRes.status === 'fulfilled') {
          const all: ProviderResult[] = resolveRes.value.allProviders || [];
          setWorkingProviders(all.filter((p: ProviderResult) => p.working));
        }

        setStatusText('Stream ready!');
        await new Promise(r => setTimeout(r, 600));
        setPhase('playing');
        onStartWatching?.();

        // Load OpenSubtitles in background if no provider subs
        if (!stream.subtitles?.length) {
          loadSubtitles(s, e);
        }
        return;
      }

      // Fallback: use iframe embed providers
      console.log('[StreamingModal] ⚠️ Direct extraction failed, falling back to iframe');
      if (resolveRes.status === 'fulfilled') {
        const data = resolveRes.value;
        const all: ProviderResult[] = data.allProviders || [];
        const working = all.filter((p: ProviderResult) => p.working);
        setWorkingProviders(working.length > 0 ? working : all);

        const best = working[0] || all[0];
        if (best) {
          setCurrentProviderIdx(0);
          setEmbedUrl(best.url);
          setStatusText('Stream ready!');
          await new Promise(r => setTimeout(r, 600));
          setPhase('playing');
          onStartWatching?.();
          return;
        }
      }

      setStatusText('No servers available');
      await new Promise(r => setTimeout(r, 2000));
      setPhase('playing');
    } catch {
      setStatusText('Connection error. Retrying...');
      await new Promise(r => setTimeout(r, 2000));
      setPhase('playing');
    }
  }, [tmdbId, mediaType, currentSeason, currentEpisode, onStartWatching, loadSubtitles]);

  useEffect(() => {
    if (!isOpen) return;
    resolveStream();
  }, [isOpen]); // Only on initial open

  // ─── Skip intro/outro detection ───
  const handleTimeUpdate = useCallback((time: number, _dur: number) => {
    if (skipData?.intro) {
      setShowSkipIntro(time >= skipData.intro.start && time < skipData.intro.end);
    }
    if (skipData?.outro) {
      setShowSkipOutro(time >= skipData.outro.start && time < skipData.outro.end);
    }
  }, [skipData]);

  const handleSkipIntro = useCallback(() => {
    if (skipData?.intro) {
      const video = document.querySelector('video');
      if (video) video.currentTime = skipData.intro.end;
      setShowSkipIntro(false);
    }
  }, [skipData]);

  const handleSkipOutro = useCallback(() => {
    if (skipData?.outro) {
      const video = document.querySelector('video');
      if (video) video.currentTime = skipData.outro.end;
      setShowSkipOutro(false);
    }
  }, [skipData]);

  // ─── Auto-hide controls (iframe mode) ───
  const showControlsFn = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettings(false);
      setShowEpisodes(false);
    }, 4000);
  };

  // ─── Server switching ───
  const switchToDirectStream = (index: number) => {
    if (index >= 0 && index < allStreams.length) {
      const stream = allStreams[index];
      setDirectStream(stream);
      setUseDirectPlayer(true);
      setEmbedUrl(null);
      setSkipData(stream.skips);
      if (stream.subtitles?.length) {
        setSubtitleTracks(stream.subtitles.map((sub, i) => ({
          id: `provider-${i}`,
          label: sub.label || sub.language || `Subtitle ${i + 1}`,
          language: sub.language || 'en',
          src: sub.file,
          isExternal: true,
          isDefault: i === 0,
        })));
      }
    }
    setShowSettings(false);
  };

  const switchToEmbed = (index: number) => {
    if (index >= 0 && index < workingProviders.length) {
      setCurrentProviderIdx(index);
      setEmbedUrl(workingProviders[index].url);
      setUseDirectPlayer(false);
      setDirectStream(null);
      setPhase('resolving');
      setStatusText(`Switching to ${workingProviders[index].name}...`);
      setTimeout(() => setPhase('playing'), 1200);
    }
    setShowSettings(false);
  };

  // ─── Episode navigation ───
  const changeEpisode = (s: number, e: number) => {
    setCurrentSeason(s);
    setCurrentEpisode(e);
    setShowEpisodes(false);
    onEpisodeChange?.(s, e);
    resolveStream(s, e);
  };

  const nextEpisode = () => {
    const csData = seasons?.find(s => s.season_number === currentSeason);
    if (!csData) return;
    if (currentEpisode < csData.episode_count) {
      changeEpisode(currentSeason, currentEpisode + 1);
    } else {
      const ns = seasons?.find(s => s.season_number === currentSeason + 1);
      if (ns) changeEpisode(currentSeason + 1, 1);
    }
  };

  const prevEpisode = () => {
    if (currentEpisode > 1) {
      changeEpisode(currentSeason, currentEpisode - 1);
    } else {
      const ps = seasons?.find(s => s.season_number === currentSeason - 1);
      if (ps) changeEpisode(currentSeason - 1, ps.episode_count);
    }
  };

  // ─── Escape key to close ───
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSeasonData = seasons?.find(s => s.season_number === currentSeason);
  const currentEpisodeData = currentSeasonData?.episodes?.find(e => e.episode_number === currentEpisode);
  const displayTitle = mediaType === 'tv'
    ? `${title} · S${String(currentSeason).padStart(2, '0')}E${String(currentEpisode).padStart(2, '0')}`
    : title;
  const episodeTitle = currentEpisodeData?.name || '';

  // Build source options for VideoPlayer
  const sourceOptions: SourceOption[] = allStreams.map((s, i) => ({
    id: `stream-${i}`,
    label: s.provider,
    url: s.url,
    isDefault: s.url === directStream?.url,
  }));
  workingProviders.forEach((p) => {
    sourceOptions.push({
      id: `embed-${p.id}`,
      label: `${p.name} (embed)`,
      url: p.url,
    });
  });

  // ─── Episode browser panel ───
  const EpisodeBrowser = () => (
    currentSeasonData ? (
      <m.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
      >
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
        <div className="overflow-y-auto max-h-[60vh] p-1.5">
          {Array.from({ length: currentSeasonData.episode_count }, (_, i) => {
            const epNum = i + 1;
            const ep = currentSeasonData.episodes?.find(e => e.episode_number === epNum);
            const isActive = epNum === currentEpisode && currentSeasonData.season_number === currentSeason;
            return (
              <button
                key={epNum}
                onClick={() => changeEpisode(currentSeasonData.season_number, epNum)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-accent/15' : 'hover:bg-white/5'
                }`}
              >
                {ep?.still_path && (
                  <img src={`${TMDB_STILL}${ep.still_path}`} alt="" className="w-24 h-14 rounded-md object-cover bg-white/5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isActive ? 'text-accent' : 'text-white/50'}`}>E{epNum}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </div>
                  <p className="text-[11px] text-white/70 truncate">{ep?.name || `Episode ${epNum}`}</p>
                  {ep?.overview && <p className="text-[10px] text-white/30 truncate mt-0.5">{ep.overview}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </m.div>
    ) : null
  );

  return (
    <div
      className="fixed inset-0 z-[200] bg-black"
      onMouseMove={!useDirectPlayer ? showControlsFn : undefined}
      onClick={!useDirectPlayer ? () => { setShowSettings(false); setShowEpisodes(false); } : undefined}
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

            {/* Back button — always visible during resolving */}
            <button
              onClick={onClose}
              className="absolute top-5 left-5 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Direct VideoPlayer (custom player with full controls) ── */}
      {phase === 'playing' && useDirectPlayer && directStream && (
        <div className="absolute inset-0 z-10">
          <VideoPlayer
            src={directStream.url}
            title={displayTitle}
            subtitle={episodeTitle}
            posterUrl={allBackdrops[0]}
            subtitleTracks={subtitleTracks}
            sourceOptions={sourceOptions}
            onTimeUpdate={handleTimeUpdate}
            onEnded={mediaType === 'tv' ? nextEpisode : onClose}
            onBack={onClose}
            onSubtitleRequest={() => loadSubtitles()}
            onError={() => {
              // Direct stream failed — auto-fallback to iframe embed
              if (workingProviders.length > 0) {
                switchToEmbed(0);
              }
            }}
            onSourceChange={(source) => {
              if (source.id.startsWith('embed-')) {
                const idx = workingProviders.findIndex(p => source.id === `embed-${p.id}`);
                if (idx >= 0) switchToEmbed(idx);
              } else {
                const idx = allStreams.findIndex(s => s.url === source.url);
                if (idx >= 0) switchToDirectStream(idx);
              }
            }}
          />

          {/* Skip Intro Button */}
          <AnimatePresence>
            {showSkipIntro && (
              <m.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleSkipIntro}
                className="absolute bottom-24 right-8 z-50 flex items-center gap-2 px-5 py-2.5 bg-white/95 text-black text-sm font-semibold rounded-lg shadow-2xl hover:bg-white transition-colors"
              >
                <SkipForward size={16} />
                Skip Intro
              </m.button>
            )}
          </AnimatePresence>

          {/* Skip Outro / Next Episode */}
          <AnimatePresence>
            {showSkipOutro && (
              <m.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={mediaType === 'tv' ? nextEpisode : handleSkipOutro}
                className="absolute bottom-24 right-8 z-50 flex items-center gap-2 px-5 py-2.5 bg-white/95 text-black text-sm font-semibold rounded-lg shadow-2xl hover:bg-white transition-colors"
              >
                <SkipForward size={16} />
                {mediaType === 'tv' ? 'Next Episode' : 'Skip Outro'}
              </m.button>
            )}
          </AnimatePresence>

          {/* TV Episode Controls Overlay (direct player mode) */}
          {mediaType === 'tv' && (
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={prevEpisode} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white/60 hover:text-white transition-colors backdrop-blur-sm">
                <ChevronLeft size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowEpisodes(!showEpisodes)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/50 hover:bg-black/70 text-white/80 text-xs font-medium transition-colors backdrop-blur-sm"
                >
                  <Tv size={13} />
                  S{currentSeason}E{currentEpisode}
                  <ChevronDown size={12} className={`transition-transform ${showEpisodes ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showEpisodes && <EpisodeBrowser />}
                </AnimatePresence>
              </div>
              <button onClick={nextEpisode} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white/60 hover:text-white transition-colors backdrop-blur-sm">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Iframe Embed Fallback ── */}
      {phase === 'playing' && !useDirectPlayer && embedUrl && (
        <>
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0 z-10"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="origin"
          />
          {/* Invisible hover zone at top — sits above iframe to detect mouse */}
          <div
            className="absolute top-0 left-0 right-0 h-14 z-20"
            onMouseEnter={showControlsFn}
            onMouseMove={showControlsFn}
          />
          {/* Always-visible close button in top-left */}
          {!controlsVisible && (
            <button
              onClick={onClose}
              className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition-all backdrop-blur-sm border border-white/10 opacity-60 hover:opacity-100"
            >
              <ChevronLeft size={16} />
              <span className="text-xs font-medium">Back</span>
            </button>
          )}
        </>
      )}

      {/* ── Top Controls for iframe mode (hover) ── */}
      <AnimatePresence>
        {phase === 'playing' && !useDirectPlayer && controlsVisible && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
            onMouseEnter={showControlsFn}
            onMouseMove={showControlsFn}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate">{displayTitle}</p>
              {episodeTitle && <p className="text-white/40 text-[11px] truncate">{episodeTitle}</p>}
            </div>

            {mediaType === 'tv' && (
              <>
                <button onClick={prevEpisode} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => { setShowEpisodes(!showEpisodes); setShowSettings(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors"
                  >
                    <Tv size={13} />
                    Episodes
                  </button>
                  <AnimatePresence>
                    {showEpisodes && <EpisodeBrowser />}
                  </AnimatePresence>
                </div>
                <button onClick={nextEpisode} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
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
                          onClick={() => switchToEmbed(i)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            i === currentProviderIdx && !useDirectPlayer
                              ? 'bg-accent/15 text-accent'
                              : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                          }`}
                        >
                          {i === currentProviderIdx && !useDirectPlayer ? <Check size={12} /> : <div className="w-3" />}
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
