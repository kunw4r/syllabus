'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Download, Loader2, HardDrive, Wifi, Check, ChevronDown, ArrowUpDown } from 'lucide-react';
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

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  year?: string;
  season?: number;
  episode?: number;
  onPlay?: (streamUrl: string) => void;
}

type Mode = 'sources' | 'downloading' | 'ready';

export default function StreamingModal({
  isOpen, onClose, imdbId, mediaType, title, year, season, episode, onPlay,
}: StreamingModalProps) {
  const [sources, setSources] = useState<TorrentSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('sources');
  const [selectedSource, setSelectedSource] = useState<TorrentSource | null>(null);
  const [torrentHash, setTorrentHash] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dlSpeed, setDlSpeed] = useState(0);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch sources when modal opens
  useEffect(() => {
    if (!isOpen || !imdbId) return;
    setLoading(true);
    setError(null);
    setSources([]);
    setMode('sources');
    setSelectedSource(null);
    setTorrentHash(null);
    setVideoPath(null);

    const params = new URLSearchParams({ imdbId, mediaType });
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));

    fetch(`/api/sources?${params}`)
      .then(r => r.json())
      .then(data => {
        setSources(data.sources || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to search for sources');
        setLoading(false);
      });
  }, [isOpen, imdbId, mediaType, season, episode]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleDownload = async (source: TorrentSource) => {
    setSelectedSource(source);
    setMode('downloading');
    setProgress(0);
    setError(null);

    try {
      const res = await fetch('/api/torrent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetUrl: source.magnetUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start download');

      setTorrentHash(data.hash);

      // Poll for progress
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/torrent?hash=${data.hash}`);
          const status = await statusRes.json();
          if (status.error) return;

          setProgress(Math.round(status.progress * 100));
          setDlSpeed(status.dlspeed || 0);

          if (status.videoFile?.name) {
            setVideoPath(status.videoFile.name);
          }

          // Ready when we have enough to stream (5%+) or complete
          if (status.progress >= 0.05 && status.videoFile?.name) {
            setMode('ready');
          }
          if (status.progress >= 1) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* ignore poll errors */ }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to start download');
      setMode('sources');
    }
  };

  const handleStream = () => {
    if (!videoPath) return;
    const streamUrl = `/api/stream?path=${encodeURIComponent(videoPath)}`;
    onPlay?.(streamUrl);
    onClose();
  };

  const handleDownloadToMac = () => {
    if (!videoPath) return;
    const streamUrl = `/api/stream?path=${encodeURIComponent(videoPath)}`;
    const a = document.createElement('a');
    a.href = streamUrl;
    a.download = videoPath.split('/').pop() || 'download';
    a.click();
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
    if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    return `${bytesPerSec} B/s`;
  };

  const qualityColor = (q: string) => {
    if (q === '2160p') return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    if (q === '1080p') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    if (q === '720p') return 'text-green-400 bg-green-400/10 border-green-400/20';
    return 'text-white/50 bg-white/5 border-white/10';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg mx-4 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{title}</h2>
              <p className="text-xs text-white/40">
                {year && `${year} · `}
                {mediaType === 'tv' && season ? `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}` : 'Movie'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-sm text-white/40">Searching for sources...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Sources list */}
            {mode === 'sources' && !loading && sources.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/30 mb-3">{sources.length} sources found</p>
                {sources.map((source, i) => (
                  <button
                    key={i}
                    onClick={() => handleDownload(source)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group text-left"
                  >
                    <div className={`px-2 py-1 rounded-md text-xs font-bold border ${qualityColor(source.quality)}`}>
                      {source.quality}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{source.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-white/30 mt-0.5">
                        <span>{source.size}</span>
                        <span>·</span>
                        <span className="text-green-400/70">{source.seeders} seeds</span>
                        {source.codec && <><span>·</span><span>{source.codec}</span></>}
                        <span>·</span>
                        <span className="uppercase">{source.source}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 rounded-lg bg-accent/10 text-accent" title="Download & Stream">
                        <Download size={16} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No sources */}
            {mode === 'sources' && !loading && sources.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <HardDrive className="w-10 h-10 text-white/20" />
                <p className="text-sm text-white/40">No sources found</p>
                <p className="text-xs text-white/20">Try a different title or check back later</p>
              </div>
            )}

            {/* Downloading state */}
            {mode === 'downloading' && selectedSource && (
              <div className="py-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`px-2 py-1 rounded-md text-xs font-bold border ${qualityColor(selectedSource.quality)}`}>
                    {selectedSource.quality}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 truncate">{selectedSource.title}</p>
                    <p className="text-xs text-white/30">{selectedSource.size}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/50">Downloading...</span>
                    <span className="text-accent font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <m.div
                      className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
                    <span>{formatSpeed(dlSpeed)}</span>
                    <span>Stream available at 5%</span>
                  </div>
                </div>

                {progress >= 5 && videoPath && (
                  <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <p className="text-xs text-green-400 mb-3 flex items-center gap-1.5">
                      <Check size={14} /> Ready to stream
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleStream}
                        className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition-colors">
                        <Play size={18} fill="white" /> Watch Now
                      </button>
                    </div>
                  </m.div>
                )}
              </div>
            )}

            {/* Ready state */}
            {mode === 'ready' && (
              <div className="py-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Check size={24} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Ready to play</p>
                    <p className="text-xs text-white/40">{selectedSource?.quality} · {selectedSource?.size} · {progress}% downloaded</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleStream}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition-colors">
                    <Play size={18} fill="white" /> Watch Now
                  </button>
                  <button onClick={handleDownloadToMac}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 font-medium py-3 px-5 rounded-xl transition-colors border border-white/[0.06]">
                    <Download size={16} /> Save
                  </button>
                </div>

                {progress < 100 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-white/30 mb-1">
                      <span>Still downloading in background</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent/60 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
