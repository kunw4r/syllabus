'use client';

import { useDownload } from '@/components/providers/DownloadProvider';
import { Download, X, Wifi, Clock } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

export default function DownloadBar() {
  const { activeDownload, cancelDownload } = useDownload();

  if (!activeDownload) return null;

  const { title, progress, dlSpeed, eta, quality } = activeDownload;

  const formatSpeed = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-md"
      >
        <div className="bg-[#1a1d25]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Download size={14} className="text-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-semibold text-white truncate pr-2">
                  {title}
                  <span className="text-white/30 font-normal ml-1.5">{quality}</span>
                </p>
                <span className="text-[12px] font-bold text-accent shrink-0">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <m.div
                  className="h-full bg-accent rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="flex items-center gap-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <Wifi size={9} /> {formatSpeed(dlSpeed)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={9} /> {eta}
                </span>
                {progress >= 100 && (
                  <span className="text-green-400 font-bold">Complete!</span>
                )}
              </div>
            </div>

            {progress < 100 && (
              <button
                onClick={cancelDownload}
                className="shrink-0 p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                title="Cancel download"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
