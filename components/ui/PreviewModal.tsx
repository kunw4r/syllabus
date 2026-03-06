'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Play, Plus, Check, Star, ChevronRight } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { TMDB_IMG_ORIGINAL, TMDB_IMG, GENRE_ID_TO_NAME } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToLibrary } from '@/lib/api/library';
import { useState } from 'react';

interface PreviewItem {
  id?: number | string;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  unified_rating?: number;
  genre_ids?: number[];
  genres?: { name: string }[];
  media_type?: string;
}

interface PreviewModalProps {
  item: PreviewItem | null;
  mediaType: 'movie' | 'tv' | 'book';
  onClose: () => void;
}

export default function PreviewModal({ item, mediaType, onClose }: PreviewModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState(false);

  const title = item?.title || item?.name || '';
  const rating = item?.unified_rating || item?.vote_average;
  const year = (item?.release_date || item?.first_air_date || '').slice(0, 4);
  const overview = (item as any)?.overview || '';
  const backdrop = item?.backdrop_path
    ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}`
    : item?.poster_path
      ? `${TMDB_IMG}${item.poster_path}`
      : null;

  const genreNames = (
    item?.genre_ids?.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean) ||
    item?.genres?.map((g) => g.name) ||
    []
  ).slice(0, 4);

  // Close on Escape
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleGoToDetail = useCallback(() => {
    onClose();
    router.push(`/details/${mediaType}/${item?.id}`);
  }, [item, mediaType, onClose, router]);

  const handleAdd = async () => {
    if (!user || added || !item) return;
    try {
      const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null;
      await addToLibrary({
        tmdb_id: item.id ?? null,
        media_type: mediaType,
        title,
        poster_url: poster,
        genres: genreNames.join(', '),
        external_rating: rating ?? null,
        status: 'want',
      });
      setAdded(true);
    } catch {
      // silently fail
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <m.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-dark-800 border border-white/[0.08] shadow-2xl shadow-black/60"
          >
            {/* Backdrop image */}
            <div className="relative aspect-[16/9] overflow-hidden">
              {backdrop ? (
                <img
                  src={backdrop}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-5xl">
                  {'\u{1F3AC}'}
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/40 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/70 transition-all z-10"
              >
                <X size={16} className="text-white/70" />
              </button>

              {/* Title over backdrop */}
              <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">
                  {title}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Rating badge */}
                  {rating != null && rating > 0 && (
                    <div
                      className="rounded-md px-2 py-0.5 flex items-center gap-1 backdrop-blur-md border border-white/10"
                      style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
                    >
                      <Star size={11} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
                      <span className="text-xs font-bold" style={{ color: getRatingHex(Number(rating)) }}>
                        {Number(rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {year && <span className="text-sm text-white/50 font-medium">{year}</span>}
                  {year && genreNames.length > 0 && <span className="text-white/20">|</span>}
                  {genreNames.map((g, i) => (
                    <span key={g} className="text-sm text-white/40">
                      {i > 0 && <span className="mr-1">&middot;</span>}
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 pt-2">
              {/* Overview */}
              {overview && (
                <p className="text-[13px] text-white/50 leading-relaxed line-clamp-4 mb-4">
                  {overview}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleGoToDetail}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-2.5 rounded-xl hover:bg-white/90 transition-all active:scale-[0.97]"
                >
                  <Play size={18} className="fill-black" />
                  Play
                </button>
                {user && !added ? (
                  <button
                    onClick={handleAdd}
                    className="w-11 h-11 rounded-xl border-2 border-white/30 bg-white/[0.06] flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-all active:scale-90"
                    title="Add to Watchlist"
                  >
                    <Plus size={20} className="text-white" />
                  </button>
                ) : added ? (
                  <div className="w-11 h-11 rounded-xl border-2 border-green-500/40 bg-green-500/10 flex items-center justify-center">
                    <Check size={20} className="text-green-400" />
                  </div>
                ) : null}
              </div>

              {/* More info link */}
              <button
                onClick={handleGoToDetail}
                className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors py-2"
              >
                More Details <ChevronRight size={14} />
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
