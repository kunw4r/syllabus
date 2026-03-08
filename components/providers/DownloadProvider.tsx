'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface ActiveDownload {
  hash: string;
  title: string;
  backdropPath?: string;
  quality: string;
  totalSize: string;
  progress: number; // 0-100
  dlSpeed: number;
  eta: string;
  state: string;
  mediaType: 'movie' | 'tv';
  tmdbId?: number | string;
}

interface DownloadContextType {
  activeDownload: ActiveDownload | null;
  startDownload: (params: {
    magnetUrl: string;
    title: string;
    backdropPath?: string;
    quality: string;
    totalSize: string;
    mediaType: 'movie' | 'tv';
    tmdbId?: number | string;
  }) => Promise<boolean>;
  cancelDownload: () => void;
}

const DownloadContext = createContext<DownloadContextType>({
  activeDownload: null,
  startDownload: async () => false,
  cancelDownload: () => {},
});

export function useDownload() {
  return useContext(DownloadContext);
}

function formatSpeed(bytes: number) {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
}

export default function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  }, []);

  const poll = useCallback((hash: string) => {
    fetch(`/api/torrent?hash=${hash}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const pct = Math.round((data.progress || 0) * 100);
        let etaStr = 'Calculating...';
        if (data.dlspeed > 0 && data.size > 0) {
          const remaining = data.size * (1 - (data.progress || 0));
          const seconds = Math.round(remaining / data.dlspeed);
          if (seconds < 60) etaStr = `${seconds}s`;
          else if (seconds < 3600) etaStr = `${Math.round(seconds / 60)}m`;
          else etaStr = `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
        }

        setActiveDownload(prev => prev ? {
          ...prev,
          progress: pct,
          dlSpeed: data.dlspeed || 0,
          eta: etaStr,
          state: data.state || '',
        } : null);

        if (pct >= 100) {
          stopPolling();
          // Auto-clear after 10 seconds
          setTimeout(() => setActiveDownload(null), 10000);
        }
      })
      .catch(() => {});
  }, [stopPolling]);

  const startDownload = useCallback(async (params: {
    magnetUrl: string;
    title: string;
    backdropPath?: string;
    quality: string;
    totalSize: string;
    mediaType: 'movie' | 'tv';
    tmdbId?: number | string;
  }): Promise<boolean> => {
    stopPolling();
    try {
      const res = await fetch('/api/torrent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetUrl: params.magnetUrl, category: 'syllabus' }),
      });
      const data = await res.json();
      if (!data.hash) return false;

      setActiveDownload({
        hash: data.hash,
        title: params.title,
        backdropPath: params.backdropPath,
        quality: params.quality,
        totalSize: params.totalSize,
        progress: 0,
        dlSpeed: 0,
        eta: 'Starting...',
        state: '',
        mediaType: params.mediaType,
        tmdbId: params.tmdbId,
      });

      // Start polling
      poll(data.hash);
      pollRef.current = setInterval(() => poll(data.hash), 2000);
      return true;
    } catch {
      return false;
    }
  }, [poll, stopPolling]);

  const cancelDownload = useCallback(() => {
    stopPolling();
    if (activeDownload?.hash) {
      fetch(`/api/torrent?hash=${activeDownload.hash}`, { method: 'DELETE' }).catch(() => {});
    }
    setActiveDownload(null);
  }, [activeDownload, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <DownloadContext.Provider value={{ activeDownload, startDownload, cancelDownload }}>
      {children}
    </DownloadContext.Provider>
  );
}
