'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, HardDrive, Wifi, Clock, Check, ChevronDown, Loader2 } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

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
}

type DownloadPhase = 'loading' | 'select' | 'downloading' | 'error';

export default function DownloadModal({
  isOpen, onClose, imdbId, mediaType, title,
  season, episode, backdropPath,
}: DownloadModalProps) {
  const [phase, setPhase] = useState<DownloadPhase>('loading');
  const [sources, setSources] = useState<TorrentSource[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Download progress
  const [torrentHash, setTorrentHash] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dlSpeed, setDlSpeed] = useState(0);
  const [eta, setEta] = useState('');
  const [torrentState, setTorrentState] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch sources when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPhase('loading');
    setSources([]);
    setSelectedIdx(0);
    setTorrentHash(null);
    setProgress(0);

    const params = new URLSearchParams({ imdbId, mediaType });
    if (mediaType === 'tv' && season) params.set('season', String(season));
    if (mediaType === 'tv' && episode) params.set('episode', String(episode));

    fetch(`/api/sources?${params}`)
      .then(r => r.json())
      .then(data => {
        const srcs: TorrentSource[] = (data.sources || [])
          .filter((s: TorrentSource) => s.sizeBytes < 5 * 1024 * 1024 * 1024); // Cap at 5GB
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

  // Poll download progress
  useEffect(() => {
    if (!torrentHash || phase !== 'downloading') return;

    const poll = () => {
      fetch(`/api/torrent?hash=${torrentHash}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) return;
          const pct = Math.round((data.progress || 0) * 100);
          setProgress(pct);
          setDlSpeed(data.dlspeed || 0);
          setTorrentState(data.state || '');

          // Calculate ETA
          if (data.dlspeed > 0 && data.size > 0) {
            const remaining = data.size * (1 - (data.progress || 0));
            const seconds = Math.round(remaining / data.dlspeed);
            if (seconds < 60) setEta(`${seconds}s`);
            else if (seconds < 3600) setEta(`${Math.round(seconds / 60)}m`);
            else setEta(`${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`);
          } else {
            setEta('Calculating...');
          }

          if (pct >= 100) {
            clearInterval(pollRef.current);
          }
        })
        .catch(() => {});
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [torrentHash, phase]);

  const startDownload = async () => {
    const source = sources[selectedIdx];
    if (!source) return;

    setPhase('downloading');
    try {
      const res = await fetch('/api/torrent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetUrl: source.magnetUrl, category: 'syllabus' }),
      });
      const data = await res.json();
      if (data.hash) {
        setTorrentHash(data.hash);
      } else {
        setErrorMsg('Failed to start download. Is qBittorrent running?');
        setPhase('error');
      }
    } catch {
      setErrorMsg('Connection to download client failed.');
      setPhase('error');
    }
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg mx-4 bg-[#13161d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with backdrop */}
        {backdropPath && (
          <div className="relative h-24 overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/w780${backdropPath}`}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#13161d]" />
          </div>
        )}

        <div className="px-6 pb-6 pt-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors z-10"
          >
            <X size={16} />
          </button>

          <h3 className="text-lg font-semibold text-white mb-1 pr-8">{title}</h3>
          {mediaType === 'tv' && season && episode && (
            <p className="text-xs text-white/40 mb-4">Season {season}, Episode {episode}</p>
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
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
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
                onClick={startDownload}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                <Download size={16} />
                Download {sources[selectedIdx]?.quality} ({sources[selectedIdx]?.size})
              </button>
            </>
          )}

          {/* Downloading Progress */}
          {phase === 'downloading' && (
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

              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <Wifi size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">Speed</p>
                    <p className="text-xs text-white/70 font-medium">{formatSpeed(dlSpeed)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <Clock size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">ETA</p>
                    <p className="text-xs text-white/70 font-medium">{eta || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                  <HardDrive size={13} className="text-white/30" />
                  <div>
                    <p className="text-[10px] text-white/30">Size</p>
                    <p className="text-xs text-white/70 font-medium">{sources[selectedIdx]?.size || '—'}</p>
                  </div>
                </div>
              </div>

              {progress >= 100 && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-green-500/20 text-green-400 font-semibold text-sm py-3 rounded-xl border border-green-500/20"
                >
                  <Check size={16} />
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
