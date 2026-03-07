'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, X,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  posterUrl?: string;
  startPositionSeconds?: number;
  subtitleTracks?: { label: string; src: string; lang: string }[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onBack?: () => void;
}

export default function VideoPlayer({
  src,
  title,
  subtitle,
  posterUrl,
  startPositionSeconds = 0,
  subtitleTracks = [],
  onTimeUpdate,
  onEnded,
  onBack,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          resetHideTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          resetHideTimer();
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        case 'Escape':
          if (fullscreen) toggleFullscreen();
          else onBack?.();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen, resetHideTimer, onBack]);

  // HLS support
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;

    setError(null);
    setLoading(true);

    if (src.includes('.m3u8') && !v.canPlayType('application/vnd.apple.mpegurl')) {
      // Dynamic import hls.js for non-Safari browsers
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
          hls.loadSource(src);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (startPositionSeconds > 0) v.currentTime = startPositionSeconds;
            v.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
            if (data.fatal) setError('Playback error. The server may need to transcode this file.');
          });
          return () => hls.destroy();
        }
      }).catch(() => {
        setError('HLS playback not supported in this browser.');
      });
    } else {
      v.src = src;
      v.load();
      if (startPositionSeconds > 0) v.currentTime = startPositionSeconds;
    }
  }, [src, startPositionSeconds]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none"
      onMouseMove={resetHideTimer}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const v = videoRef.current;
        if (v) v.paused ? v.play() : v.pause();
        resetHideTimer();
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setLoading(false);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          onTimeUpdate?.(t, e.currentTarget.duration);
        }}
        onProgress={(e) => {
          const buf = e.currentTarget.buffered;
          if (buf.length > 0) setBuffered(buf.end(buf.length - 1));
        }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => onEnded?.()}
        onError={() => setError('Failed to load video. Check your Jellyfin server connection.')}
      >
        {subtitleTracks.map((t, i) => (
          <track key={i} kind="subtitles" label={t.label} srcLang={t.lang} src={t.src} />
        ))}
      </video>

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center max-w-md px-6">
            <p className="text-white/70 text-sm mb-4">{error}</p>
            <button
              onClick={onBack}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top gradient + title */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 pb-16">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <div>
              {title && <h2 className="text-white font-semibold text-lg leading-tight">{title}</h2>}
              {subtitle && <p className="text-white/50 text-sm">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Center play/pause */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
          <button
            className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) v.currentTime -= 10; }}
          >
            <SkipBack size={22} />
          </button>
          <button
            className="pointer-events-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (v) v.paused ? v.play() : v.pause();
            }}
          >
            {playing ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
          </button>
          <button
            className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) v.currentTime += 10; }}
          >
            <SkipForward size={22} />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-16">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/bar mb-3 hover:h-2.5 transition-all"
            onClick={handleProgressClick}
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
              style={{ width: `${bufPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full"
              style={{ width: `${pct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
              style={{ left: `calc(${pct}% - 8px)` }}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (v) v.paused ? v.play() : v.pause();
              }}
              className="hover:text-accent transition-colors"
            >
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>

            {/* Skip buttons */}
            <button
              onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) v.currentTime -= 10; }}
              className="hover:text-accent transition-colors hidden sm:block"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) v.currentTime += 10; }}
              className="hover:text-accent transition-colors hidden sm:block"
            >
              <SkipForward size={18} />
            </button>

            {/* Time */}
            <span className="text-xs text-white/70 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const v = videoRef.current;
                  if (v) { v.muted = !v.muted; setMuted(v.muted); }
                }}
                className="hover:text-accent transition-colors"
              >
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  e.stopPropagation();
                  const v = videoRef.current;
                  const val = parseFloat(e.target.value);
                  if (v) { v.volume = val; v.muted = val === 0; }
                  setVolume(val);
                  setMuted(val === 0);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-accent h-1 cursor-pointer"
              />
            </div>

            {/* Subtitles */}
            {subtitleTracks.length > 0 && (
              <button className="hover:text-accent transition-colors">
                <Subtitles size={20} />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="hover:text-accent transition-colors"
            >
              {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
