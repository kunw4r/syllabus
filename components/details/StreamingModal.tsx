'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Download, Loader2, HardDrive, Check, MonitorPlay, Server, ChevronLeft } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

// ─── Embedded Streaming Providers ───
// These take TMDB/IMDB IDs and return an embeddable player with subtitles

interface StreamProvider {
  name: string;
  buildUrl: (opts: { tmdbId: string; imdbId: string; mediaType: 'movie' | 'tv'; season?: number; episode?: number }) => string;
  color: string;
}

const STREAM_PROVIDERS: StreamProvider[] = [
  {
    name: 'VidSrc PRO',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'VidSrc ICU',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.icu/embed/movie/${tmdbId}`
        : `https://vidsrc.icu/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    name: 'VidSrc CC',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    color: 'from-purple-500 to-purple-600',
  },
  {
    name: 'SuperEmbed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}`,
    color: 'from-orange-500 to-orange-600',
  },
  {
    name: 'Embed.su',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    name: 'AutoEmbed',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    color: 'from-rose-500 to-rose-600',
  },
];

const MAX_DOWNLOAD_SIZE = 4 * 1024 * 1024 * 1024; // 4GB cap

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
  tmdbId: string;
  imdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  year?: string;
  season?: number;
  episode?: number;
}

type Tab = 'stream' | 'download';

export default function StreamingModal({
  isOpen, onClose, tmdbId, imdbId, mediaType, title, year, season, episode,
}: StreamingModalProps) {
  const [tab, setTab] = useState<Tab>('stream');
  const [activeProvider, setActiveProvider] = useState<StreamProvider | null>(null);
  const [sources, setSources] = useState<TorrentSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [downloading, setDownloading] = useState<TorrentSource | null>(null);
  const [progress, setProgress] = useState(0);
  const [dlSpeed, setDlSpeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTab('stream');
      setActiveProvider(null);
      setDownloading(null);
      setProgress(0);
      setError(null);
      setSources([]);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Fetch download sources when download tab is selected
  useEffect(() => {
    if (tab !== 'download' || !imdbId || sources.length > 0) return;
    setLoadingSources(true);
    setError(null);

    const params = new URLSearchParams({ imdbId, mediaType });
    if (season !== undefined) params.set('season', String(season));
    if (episode !== undefined) params.set('episode', String(episode));

    fetch(`/api/sources?${params}`)
      .then(r => r.json())
      .then(data => {
        // Filter to max 4GB and sort
        const filtered = (data.sources || []).filter((s: TorrentSource) => s.sizeBytes <= MAX_DOWNLOAD_SIZE);
        setSources(filtered);
        setLoadingSources(false);
      })
      .catch(() => {
        setError('Failed to search for sources');
        setLoadingSources(false);
      });
  }, [tab, imdbId, mediaType, season, episode, sources.length]);

  const handleStream = (provider: StreamProvider) => {
    setActiveProvider(provider);
  };

  const handleDownload = async (source: TorrentSource) => {
    setDownloading(source);
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

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/torrent?hash=${data.hash}`);
          const status = await statusRes.json();
          if (status.error) return;
          setProgress(Math.round(status.progress * 100));
          setDlSpeed(status.dlspeed || 0);
          if (status.progress >= 1) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* ignore */ }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to start download');
      setDownloading(null);
    }
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

  // Full-screen player mode
  if (activeProvider) {
    const embedUrl = activeProvider.buildUrl({ tmdbId, imdbId, mediaType, season, episode });
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-3 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={() => setActiveProvider(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <span className="text-white/60 text-sm truncate">{title}</span>
          <span className="text-white/30 text-xs">via {activeProvider.name}</span>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Embedded player */}
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="origin"
        />

        {/* Server switcher — bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-4 px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-white/30 uppercase tracking-wider shrink-0 mr-1">Servers:</span>
            {STREAM_PROVIDERS.map((p) => (
              <button
                key={p.name}
                onClick={() => setActiveProvider(p)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  p.name === activeProvider.name
                    ? 'bg-white/20 text-white border border-white/20'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/[0.06]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab('stream')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'stream' ? 'text-accent border-b-2 border-accent' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <MonitorPlay size={16} /> Stream
            </button>
            <button
              onClick={() => setTab('download')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'download' ? 'text-accent border-b-2 border-accent' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Download size={16} /> Download
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {/* ─── Stream Tab ─── */}
            {tab === 'stream' && (
              <div className="space-y-2">
                <p className="text-xs text-white/30 mb-3">Choose a server — instant playback with subtitles</p>
                {STREAM_PROVIDERS.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleStream(provider)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-lg`}>
                      <Play size={18} fill="white" className="text-white ml-0.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/90">{provider.name}</p>
                      <p className="text-[10px] text-white/30">Instant · Subtitles · Multiple qualities</p>
                    </div>
                    <div className="p-2 rounded-lg bg-accent/10 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={14} fill="currentColor" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ─── Download Tab ─── */}
            {tab === 'download' && (
              <>
                {/* Loading */}
                {loadingSources && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-sm text-white/40">Searching for downloads...</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Downloading progress */}
                {downloading && (
                  <div className="mb-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`px-2 py-1 rounded-md text-xs font-bold border ${qualityColor(downloading.quality)}`}>
                        {downloading.quality}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 truncate">{downloading.title}</p>
                        <p className="text-xs text-white/30">{downloading.size}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/50">{progress >= 100 ? 'Complete!' : 'Downloading to ~/media-server/downloads...'}</span>
                      <span className="text-accent font-mono">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <m.div
                        className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: 'easeOut' }}
                      />
                    </div>
                    {progress < 100 && (
                      <p className="text-[10px] text-white/30 mt-1.5">{formatSpeed(dlSpeed)}</p>
                    )}
                    {progress >= 100 && (
                      <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
                        <Check size={14} /> Downloaded to your Mac
                      </p>
                    )}
                  </div>
                )}

                {/* Source list */}
                {!loadingSources && sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/30 mb-3">
                      {sources.length} sources (max 4 GB) — downloads to ~/media-server/downloads
                    </p>
                    {sources.map((source, i) => (
                      <button
                        key={i}
                        onClick={() => handleDownload(source)}
                        disabled={!!downloading}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group text-left disabled:opacity-40"
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
                          </div>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Download size={16} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No sources */}
                {!loadingSources && sources.length === 0 && !error && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <HardDrive className="w-10 h-10 text-white/20" />
                    <p className="text-sm text-white/40">No downloads available under 4 GB</p>
                    <p className="text-xs text-white/20">Try streaming instead</p>
                  </div>
                )}
              </>
            )}
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
