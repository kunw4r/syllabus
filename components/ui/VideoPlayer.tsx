'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, X,
  PictureInPicture2, ChevronLeft, Check, Upload, Loader2,
  Languages, Monitor, AudioLines,
} from 'lucide-react';

// ─── Types ───

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src?: string;          // VTT/SRT URL
  jellyfinIndex?: number; // Jellyfin stream index
  isExternal?: boolean;
  isDefault?: boolean;
}

export interface AudioTrack {
  id: string;
  label: string;
  language?: string;
  index: number;
  isDefault?: boolean;
}

export interface QualityOption {
  label: string;
  bitrate: number;
  width?: number;
  height?: number;
}

export interface SourceOption {
  id: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  posterUrl?: string;
  startPositionSeconds?: number;
  subtitleTracks?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
  qualityOptions?: QualityOption[];
  sourceOptions?: SourceOption[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onBack?: () => void;
  onSubtitleRequest?: () => void; // Trigger external subtitle fetch
  onSourceChange?: (source: SourceOption) => void;
  onError?: () => void; // Called when playback fails fatally
}

// ─── Settings Panel Views ───
type SettingsView = 'main' | 'quality' | 'subtitles' | 'subtitleStyles' | 'audio';

// ─── Subtitle Style Presets ───
interface SubtitleStyle {
  fontSize: number;       // rem
  color: string;
  background: string;
  fontFamily: string;
}

const DEFAULT_SUB_STYLE: SubtitleStyle = {
  fontSize: 1.5,
  color: '#FFFFFF',
  background: 'rgba(0,0,0,0.7)',
  fontFamily: 'sans-serif',
};

export default function VideoPlayer({
  src,
  title,
  subtitle,
  posterUrl,
  startPositionSeconds = 0,
  subtitleTracks = [],
  audioTracks = [],
  qualityOptions = [],
  sourceOptions = [],
  onTimeUpdate,
  onEnded,
  onBack,
  onSubtitleRequest,
  onSourceChange,
  onError: onErrorCallback,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playback state
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

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  // Subtitles
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState('');
  const [subStyle, setSubStyle] = useState<SubtitleStyle>(DEFAULT_SUB_STYLE);
  const [subDelay, setSubDelay] = useState(0); // ms offset
  const [customSubs, setCustomSubs] = useState<SubtitleTrack[]>([]);

  // Audio
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  // Quality
  const [activeQuality, setActiveQuality] = useState<string>('auto');
  const [hlsQualities, setHlsQualities] = useState<QualityOption[]>([]);
  const hlsRef = useRef<any>(null);

  // PiP
  const [isPip, setIsPip] = useState(false);

  // Merge built-in + custom subtitle tracks
  const allSubtitles = [...subtitleTracks, ...customSubs];

  // ─── Auto-hide controls ───
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && !showSettings) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing, showSettings]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, resetHideTimer]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
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
        case 'c':
          // Toggle subtitles
          if (activeSubtitle) {
            setActiveSubtitle(null);
          } else if (allSubtitles.length > 0) {
            setActiveSubtitle(allSubtitles[0].id);
          }
          break;
        case 'p':
          togglePip();
          break;
        case 'Escape':
          if (showSettings) setShowSettings(false);
          else if (fullscreen) toggleFullscreen();
          else onBack?.();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen, resetHideTimer, onBack, showSettings, activeSubtitle, allSubtitles]);

  // ─── HLS support ───
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;

    setError(null);
    setLoading(true);

    let hlsInstance: any = null;

    if (src.includes('.m3u8') && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
            lowLatencyMode: false,
            xhrSetup: (xhr: XMLHttpRequest) => {
              // Some CDNs need specific headers
              xhr.withCredentials = false;
            },
          });
          hlsInstance = hls;
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            setError(null);
            if (startPositionSeconds > 0) v.currentTime = startPositionSeconds;
            v.play().catch(() => {});

            // Extract quality levels from HLS manifest
            const levels = hls.levels || [];
            if (levels.length > 1) {
              const qualities: QualityOption[] = levels.map((level: any, i: number) => {
                const h = level.height || 0;
                let label = `${h}p`;
                if (h >= 2160) label = '4K';
                else if (h === 0) label = `${Math.round((level.bitrate || 0) / 1000)}kbps`;
                return {
                  label,
                  bitrate: level.bitrate || 0,
                  width: level.width,
                  height: h,
                };
              }).sort((a: QualityOption, b: QualityOption) => (b.height || b.bitrate) - (a.height || a.bitrate));
              setHlsQualities(qualities);
              console.log('[HLS] Quality levels:', qualities.map((q: QualityOption) => q.label));
            }
          });
          // Track network retry count to avoid infinite retries
          let networkRetries = 0;
          const MAX_NETWORK_RETRIES = 3;

          hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean; type: string; details: string }) => {
            if (data.fatal) {
              console.error('[HLS] Fatal error:', data.type, data.details);
              if (data.type === 'networkError' && networkRetries < MAX_NETWORK_RETRIES) {
                networkRetries++;
                console.log(`[HLS] Network retry ${networkRetries}/${MAX_NETWORK_RETRIES}`);
                hls.startLoad();
              } else if (data.type === 'mediaError') {
                hls.recoverMediaError();
              } else {
                setError('Playback error. Try switching to a different source.');
                setLoading(false);
                onErrorCallback?.();
              }
            }
          });

          // Timeout: if manifest not parsed in 12s, fail
          const loadTimeout = setTimeout(() => {
            if (!v.readyState) {
              console.error('[HLS] Load timeout — manifest not parsed in 12s');
              hls.destroy();
              setError('Stream took too long to load. Try a different source.');
              setLoading(false);
              onErrorCallback?.();
            }
          }, 12000);
          hls.on(Hls.Events.MANIFEST_PARSED, () => clearTimeout(loadTimeout));
        }
      }).catch(() => {
        setError('HLS playback not supported in this browser.');
      });
    } else {
      v.src = src;
      v.load();
      if (startPositionSeconds > 0) v.currentTime = startPositionSeconds;
    }

    return () => {
      if (hlsInstance) hlsInstance.destroy();
      hlsRef.current = null;
      setHlsQualities([]);
    };
  }, [src, startPositionSeconds]);

  // ─── Subtitle rendering via cues ───
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Disable all existing text tracks
    for (let i = 0; i < v.textTracks.length; i++) {
      v.textTracks[i].mode = 'hidden';
    }

    if (!activeSubtitle) {
      setSubtitleText('');
      return;
    }

    const track = allSubtitles.find((s) => s.id === activeSubtitle);
    if (!track?.src) return;

    // Find or create the track element
    let trackEl = v.querySelector(`track[data-sub-id="${track.id}"]`) as HTMLTrackElement | null;
    if (!trackEl) {
      trackEl = document.createElement('track');
      trackEl.kind = 'subtitles';
      trackEl.label = track.label;
      trackEl.srclang = track.language;
      trackEl.src = track.src;
      trackEl.dataset.subId = track.id;
      v.appendChild(trackEl);
    }

    // Wait for track to load then enable it
    const textTrack = trackEl.track;
    textTrack.mode = 'hidden'; // We render manually for PiP support

    const onCueChange = () => {
      const cues = textTrack.activeCues;
      if (cues && cues.length > 0) {
        const cue = cues[0] as VTTCue;
        setSubtitleText(cue.text);
      } else {
        setSubtitleText('');
      }
    };

    textTrack.addEventListener('cuechange', onCueChange);
    return () => textTrack.removeEventListener('cuechange', onCueChange);
  }, [activeSubtitle, allSubtitles]);

  // ─── PiP with subtitles (canvas-based) ───
  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      setIsPip(false);
    } else {
      try {
        await v.requestPictureInPicture();
        setIsPip(true);
      } catch {
        // Fallback: some browsers block PiP
      }
    }
  };

  // Listen for PiP events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);
    v.addEventListener('enterpictureinpicture', onEnterPip);
    v.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnterPip);
      v.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  // ─── File upload for custom subtitles ───
  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result as string;
      // Convert SRT to VTT
      if (file.name.endsWith('.srt') && !text.trim().startsWith('WEBVTT')) {
        text = 'WEBVTT\n\n' + text
          .replace(/\r\n/g, '\n')
          .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
          .replace(/^\d+\n/gm, '');
      }
      const blob = new Blob([text], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      const id = `custom-${Date.now()}`;
      setCustomSubs((prev) => [
        ...prev,
        { id, label: file.name.replace(/\.(srt|vtt|ass|ssa)$/i, ''), language: 'custom', src: url, isExternal: true },
      ]);
      setActiveSubtitle(id);
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Controls ───
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

  // ─── Settings panel content ───
  const renderSettings = () => {
    switch (settingsView) {
      case 'main':
        return (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white/80 px-3 pt-2 pb-1">Settings</h3>

            {/* Quality/Source/Subtitles/Audio — xprime-style 2x2 grid */}
            <div className="grid grid-cols-2 gap-2 px-3 pb-2">
              <button
                onClick={() => setSettingsView('quality')}
                className="bg-white/5 hover:bg-white/10 rounded-xl p-3 text-center transition-colors border border-white/5"
              >
                <div className="text-xs font-semibold text-white">Quality</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {activeQuality === 'auto' ? 'Auto' : activeQuality}
                </div>
              </button>

              {sourceOptions.length > 1 && (
                <button
                  onClick={() => {/* cycle source */}}
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-3 text-center transition-colors border border-white/5"
                >
                  <div className="text-xs font-semibold text-white">Source</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {sourceOptions.find((s) => s.url === src)?.label || 'Default'}
                  </div>
                </button>
              )}

              <button
                onClick={() => setSettingsView('subtitles')}
                className={`rounded-xl p-3 text-center transition-colors border ${
                  activeSubtitle
                    ? 'bg-accent/10 border-accent/20'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-semibold text-white">Subtitles</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {activeSubtitle
                    ? allSubtitles.find((s) => s.id === activeSubtitle)?.label || 'On'
                    : 'Off'}
                </div>
              </button>

              {audioTracks.length > 1 && (
                <button
                  onClick={() => setSettingsView('audio')}
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-3 text-center transition-colors border border-white/5"
                >
                  <div className="text-xs font-semibold text-white">Audio</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {audioTracks.find((a) => a.id === activeAudio)?.label || 'Default'}
                  </div>
                </button>
              )}
            </div>

            {/* Enable Subtitles toggle */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
              <span className="text-xs text-white/60">Enable Subtitles</span>
              <button
                onClick={() => {
                  if (activeSubtitle) {
                    setActiveSubtitle(null);
                  } else if (allSubtitles.length > 0) {
                    // Auto-select best match
                    const browserLang = navigator.language.split('-')[0];
                    const match = allSubtitles.find((s) => s.language === browserLang)
                      || allSubtitles.find((s) => s.language === 'en')
                      || allSubtitles[0];
                    if (match) setActiveSubtitle(match.id);
                  }
                }}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  activeSubtitle ? 'bg-accent' : 'bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    activeSubtitle ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      case 'subtitles':
        return (
          <div>
            <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-white/5">
              <button
                onClick={() => setSettingsView('main')}
                className="text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold text-white/80">Subtitles</h3>
              <div className="flex-1" />
              <button
                onClick={() => setSettingsView('subtitleStyles')}
                className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
              >
                Delay & Styles
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
              {/* Off */}
              <button
                onClick={() => { setActiveSubtitle(null); setSettingsView('main'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  !activeSubtitle ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {!activeSubtitle && <Check size={14} className="text-accent" />}
                <span className={!activeSubtitle ? '' : 'ml-[22px]'}>Off</span>
              </button>

              {/* Auto select */}
              <button
                onClick={() => {
                  const browserLang = navigator.language.split('-')[0];
                  const match = allSubtitles.find((s) => s.language === browserLang)
                    || allSubtitles.find((s) => s.language === 'en')
                    || allSubtitles[0];
                  if (match) setActiveSubtitle(match.id);
                  setSettingsView('main');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Languages size={14} className="text-white/30" />
                Auto select
              </button>

              {/* Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Upload size={14} className="text-white/30" />
                Drop or upload file
              </button>

              {/* Separator */}
              {allSubtitles.length > 0 && <div className="border-t border-white/5 my-1" />}

              {/* Available tracks grouped by language */}
              {(() => {
                const grouped = new Map<string, SubtitleTrack[]>();
                for (const s of allSubtitles) {
                  const lang = s.language;
                  if (!grouped.has(lang)) grouped.set(lang, []);
                  grouped.get(lang)!.push(s);
                }
                return Array.from(grouped.entries()).map(([lang, tracks]) => (
                  <div key={lang}>
                    {tracks.length === 1 ? (
                      <button
                        onClick={() => { setActiveSubtitle(tracks[0].id); setSettingsView('main'); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          activeSubtitle === tracks[0].id
                            ? 'text-accent'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {activeSubtitle === tracks[0].id && <Check size={14} className="text-accent" />}
                        <span className={activeSubtitle === tracks[0].id ? '' : 'ml-[22px]'}>
                          {tracks[0].label}
                        </span>
                      </button>
                    ) : (
                      <>
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                          {tracks[0].label.split(' ')[0]}
                        </div>
                        {tracks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => { setActiveSubtitle(t.id); setSettingsView('main'); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
                              activeSubtitle === t.id
                                ? 'text-accent'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {activeSubtitle === t.id && <Check size={12} className="text-accent" />}
                            <span className={activeSubtitle === t.id ? '' : 'ml-[18px]'}>
                              {t.label}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ));
              })()}

              {/* Fetch from OpenSubtitles */}
              {onSubtitleRequest && allSubtitles.length === 0 && (
                <button
                  onClick={() => { onSubtitleRequest(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-accent/70 hover:text-accent hover:bg-accent/5 transition-colors"
                >
                  <Loader2 size={14} />
                  Search OpenSubtitles...
                </button>
              )}
            </div>
          </div>
        );

      case 'subtitleStyles':
        return (
          <div>
            <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-white/5">
              <button
                onClick={() => setSettingsView('subtitles')}
                className="text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold text-white/80">Subtitle Styles</h3>
            </div>

            <div className="p-3 space-y-4">
              {/* Delay */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Delay: {subDelay}ms</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubDelay((d) => d - 100)}
                    className="bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1 text-xs transition-colors"
                  >
                    -100ms
                  </button>
                  <button
                    onClick={() => setSubDelay(0)}
                    className="bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1 text-xs transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setSubDelay((d) => d + 100)}
                    className="bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1 text-xs transition-colors"
                  >
                    +100ms
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">
                  Font Size: {subStyle.fontSize.toFixed(1)}rem
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={3}
                  step={0.1}
                  value={subStyle.fontSize}
                  onChange={(e) => setSubStyle((s) => ({ ...s, fontSize: parseFloat(e.target.value) }))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full accent-accent h-1 cursor-pointer"
                />
              </div>

              {/* Color presets */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF69B4'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSubStyle((s) => ({ ...s, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        subStyle.color === c ? 'border-accent scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Background</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Dark', value: 'rgba(0,0,0,0.7)' },
                    { label: 'Light', value: 'rgba(0,0,0,0.4)' },
                    { label: 'None', value: 'transparent' },
                    { label: 'Solid', value: 'rgba(0,0,0,0.95)' },
                  ].map((bg) => (
                    <button
                      key={bg.label}
                      onClick={() => setSubStyle((s) => ({ ...s, background: bg.value }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${
                        subStyle.background === bg.value
                          ? 'border-accent text-accent bg-accent/10'
                          : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'quality': {
        // Merge prop qualityOptions with HLS-detected qualities
        const allQualities = hlsQualities.length > 0 ? hlsQualities : qualityOptions;
        return (
          <div>
            <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-white/5">
              <button
                onClick={() => setSettingsView('main')}
                className="text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold text-white/80">Quality</h3>
            </div>
            <div>
              <button
                onClick={() => {
                  setActiveQuality('auto');
                  if (hlsRef.current) hlsRef.current.currentLevel = -1; // auto
                  setSettingsView('main');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  activeQuality === 'auto' ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeQuality === 'auto' && <Check size={14} />}
                <span className={activeQuality === 'auto' ? '' : 'ml-[22px]'}>Auto</span>
              </button>
              {allQualities.map((q, i) => (
                <button
                  key={q.label}
                  onClick={() => {
                    setActiveQuality(q.label);
                    // Set HLS quality level if available
                    if (hlsRef.current && hlsQualities.length > 0) {
                      // Find the matching level index in hls.levels
                      const hls = hlsRef.current;
                      const levelIdx = (hls.levels || []).findIndex((l: any) =>
                        l.height === q.height || l.bitrate === q.bitrate
                      );
                      if (levelIdx >= 0) hls.currentLevel = levelIdx;
                    }
                    setSettingsView('main');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    activeQuality === q.label ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {activeQuality === q.label && <Check size={14} />}
                  <span className={activeQuality === q.label ? '' : 'ml-[22px]'}>{q.label}</span>
                  {q.bitrate > 0 && <span className="text-[10px] text-white/30 ml-auto">{Math.round(q.bitrate / 1000)}kbps</span>}
                </button>
              ))}
              {allQualities.length === 0 && (
                <p className="px-3 py-4 text-xs text-white/30 text-center">
                  Single quality stream
                </p>
              )}
            </div>
          </div>
        );
      }

      case 'audio':
        return (
          <div>
            <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-white/5">
              <button
                onClick={() => setSettingsView('main')}
                className="text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold text-white/80">Audio</h3>
            </div>
            <div>
              {audioTracks.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setActiveAudio(a.id); setSettingsView('main'); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    activeAudio === a.id ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {activeAudio === a.id && <Check size={14} />}
                  <span className={activeAudio === a.id ? '' : 'ml-[22px]'}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none"
      onMouseMove={resetHideTimer}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, [data-panel]')) return;
        if (showSettings) { setShowSettings(false); return; }
        const v = videoRef.current;
        if (v) v.paused ? v.play() : v.pause();
        resetHideTimer();
      }}
    >
      {/* Hidden file input for subtitle upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt,.ass,.ssa"
        className="hidden"
        onChange={handleSubtitleUpload}
      />

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        playsInline
        crossOrigin="anonymous"
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
        onError={() => {
          setError('Failed to load video. Try switching to a different source.');
          onErrorCallback?.();
        }}
      />

      {/* Subtitle overlay (rendered manually for PiP/style support) */}
      {subtitleText && activeSubtitle && (
        <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 flex justify-center pointer-events-none z-[5] px-4">
          <p
            className="text-center px-3 py-1 rounded-lg max-w-[80%] leading-relaxed"
            style={{
              fontSize: `${subStyle.fontSize}rem`,
              color: subStyle.color,
              backgroundColor: subStyle.background,
              fontFamily: subStyle.fontFamily,
              textShadow: subStyle.background === 'transparent' ? '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' : 'none',
            }}
            dangerouslySetInnerHTML={{ __html: subtitleText }}
          />
        </div>
      )}

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-[4]">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[6]">
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
        className={`absolute inset-0 transition-opacity duration-300 z-[8] ${
          showControls || showSettings ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
        {!showSettings && (
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
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-16">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/bar mb-3 hover:h-2.5 transition-all"
            onClick={handleProgressClick}
          >
            <div
              className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
              style={{ width: `${bufPct}%` }}
            />
            <div
              className="absolute top-0 left-0 h-full bg-accent rounded-full"
              style={{ width: `${pct}%` }}
            />
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

            {/* Subtitles quick toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(true);
                setSettingsView('subtitles');
              }}
              className={`transition-colors ${activeSubtitle ? 'text-accent' : 'hover:text-accent'}`}
            >
              <Subtitles size={20} />
            </button>

            {/* PiP */}
            {'pictureInPictureEnabled' in document && (
              <button
                onClick={(e) => { e.stopPropagation(); togglePip(); }}
                className={`transition-colors ${isPip ? 'text-accent' : 'hover:text-accent'}`}
              >
                <PictureInPicture2 size={20} />
              </button>
            )}

            {/* Settings gear */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings((prev) => !prev);
                setSettingsView('main');
              }}
              className={`transition-colors ${showSettings ? 'text-accent' : 'hover:text-accent'}`}
            >
              <Settings size={20} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="hover:text-accent transition-colors"
            >
              {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>

        {/* Settings panel (slides up from bottom-right) */}
        {showSettings && (
          <div
            data-panel
            className="absolute bottom-16 right-4 w-[280px] max-h-[400px] bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-[10]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSettings()}
          </div>
        )}
      </div>
    </div>
  );
}
