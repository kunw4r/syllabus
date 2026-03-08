'use client';

import { useState, useEffect } from 'react';
import { X, Download, HardDrive, Wifi, Clock, Check, Loader2 } from 'lucide-react';
import { m } from 'framer-motion';
import { useDownload } from '@/components/providers/DownloadProvider';

interface TorrentSource {
  title: string;
  quality: string;
  size: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  magnetUrl: string;
  source: string;
  type: string;
  codec?: string;
  audio?: string; // e.g. "Dual Audio", "English", "Japanese"
}

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  imdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  season?: number;
  episode?: number;
  backdropPath?: string;
  tmdbId?: number | string;
  isAnime?: boolean;
}

type ModalPhase = 'loading' | 'select' | 'downloading' | 'error';

export default function DownloadModal({
  isOpen, onClose, imdbId, mediaType, title,
  season, episode, backdropPath, tmdbId, isAnime,
}: DownloadModalProps) {
  const { activeDownload, startDownload, cancelDownload } = useDownload();
  const [phase, setPhase] = useState<ModalPhase>('loading');
  const [sources, setSources] = useState<TorrentSource[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // If there's already an active download, show its progress
  const showingActive = activeDownload != null && phase !== 'select' && phase !== 'loading';

  // Fetch sources when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // If already downloading, show progress immediately
    if (activeDownload) {
      setPhase('downloading');
      return;
    }

    setPhase('loading');
    setSources([]);
    setSelectedIdx(0);

    const params = new URLSearchParams({ imdbId, mediaType, title });
    if (mediaType === 'tv' && season) params.set('season', String(season));
    if (mediaType === 'tv' && episode) params.set('episode', String(episode));
    if (isAnime) params.set('isAnime', '1');

    fetch(`/api/sources?${params}`)
      .then(r => r.json())
      .then(data => {
        const srcs: TorrentSource[] = (data.sources || []);
        if (srcs.length === 0) {
          setErrorMsg('No download sources found for this title.');
          setPhase('error');
        } else {
          setSources(srcs);
          setPhase('select');
        }
      })
      .catch(() => {
        setErrorMsg('Failed to search for sources. Check your connection.');
        setPhase('error');
      });
  }, [isOpen, imdbId, mediaType, season, episode]);

  const handleStartDownload = async () => {
    const source = sources[selectedIdx];
    if (!source) return;

    setPhase('downloading');
    const ok = await startDownload({
      magnetUrl: source.magnetUrl,
      title,
      backdropPath,
      quality: source.quality,
      totalSize: source.size,
      mediaType,
      tmdbId,
    });

    if (!ok) {
      setErrorMsg('Failed to start download. Is qBittorrent running?');
      setPhase('error');
    }
  };

  const handleCancel = () => {
    cancelDownload();
    onClose();
  };

  const formatSpeed = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const qualityColor = (q: string) => {
    if (q.includes('2160') || q.includes('4K')) return 'text-purple-400';
    if (q.includes('1080')) return 'text-blue-400';
    if (q.includes('720')) return 'text-green-400';
    return 'text-white/50';
  };

  if (!isOpen) return null;

  const dl = activeDownload;
  const progress = dl?.progress ?? 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl mx-4 bg-[#13161d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Bigger backdrop header */}
        {backdropPath && (
          <div className="relative h-44 sm:h-52 overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/w1280${backdropPath}`}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#13161d]" />
            <div className="absolute bottom-4 left-6 right-16">
              <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{title}</h3>
              {mediaType === 'tv' && season && episode && (
                <p className="text-xs text-white/60 mt-1 drop-shadow">Season {season}, Episode {episode}</p>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white/60 hover:text-white transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="px-6 pb-6 pt-3">
          {!backdropPath && (
            <>
              <h3 className="text-lg font-semibold text-white mb-1 pr-8">{title}</h3>
              {mediaType === 'tv' && season && episode && (
                <p className="text-xs text-white/40 mb-4">Season {season}, Episode {episode}</p>
              )}
            </>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="text-accent animate-spin mb-3" />
              <p className="text-sm text-white/40">Searching for sources...</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center py-8">
              <p className="text-sm text-red-400 mb-3">{errorMsg}</p>
              <button onClick={onClose} className="text-xs text-white/40 hover:text-white/60">Close</button>
            </div>
          )}

          {/* Source Selection */}
          {phase === 'select' && (
            <>
              <p className="text-xs text-white/30 mb-3">{sources.length} source{sources.length !== 1 ? 's' : ''} found</p>
              <div className="space-y-2 max-h-72 overflow-y-auto mb-4 pr-1 scrollbar-hide">
                {sources.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      i === selectedIdx
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${qualityColor(src.quality)}`}>{src.quality}</span>
                        {src.codec && <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{src.codec}</span>}
                        <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded uppercase">{src.type}</span>
                        {src.audio && <span className="text-[10px] text-cyan-400/70 bg-cyan-400/10 px-1.5 py-0.5 rounded">{src.audio}</span>}
                      </div>
                      <p className="text-[11px] text-white/40 truncate">{src.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white/60 font-medium">{src.size}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-green-400">{src.seeders} seeds</span>
                      </div>
                    </div>
                    {i === selectedIdx && (
                      <Check size={16} className="text-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartDownload}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                <Download size={16} />
                Download {sources[selectedIdx]?.quality} ({sources[selectedIdx]?.size})
              </button>
            </>
          )}

          {/* Downloading Progress */}
          {phase === 'downloading' && dl && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80 font-medium">
                  {progress >= 100 ? 'Download Complete!' : 'Downloading...'}
                </span>
                <span className="text-sm text-accent font-bold">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <m.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <Wifi size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">Speed</p>
                    <p className="text-xs text-white/70 font-medium">{formatSpeed(dl.dlSpeed)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <Clock size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">ETA</p>
                    <p className="text-xs text-white/70 font-medium">{dl.eta || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <HardDrive size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">Size</p>
                    <p className="text-xs text-white/70 font-medium">{dl.totalSize || '—'}</p>
                  </div>
                </div>
              </div>

              {progress >= 100 ? (
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 bg-green-500/20 text-green-400 font-semibold text-sm py-3 rounded-xl border border-green-500/20"
                >
                  <Check size={16} />
                  Done
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 font-medium text-sm py-2.5 rounded-xl border border-white/[0.06] hover:border-red-500/20 transition-colors"
                >
                  Cancel Download
                </button>
              )}
            </div>
          )}

          {/* Downloading state without active download (just started) */}
          {phase === 'downloading' && !dl && (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="text-accent animate-spin mb-3" />
              <p className="text-sm text-white/40">Starting download...</p>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
