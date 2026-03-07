'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Play, Plus, Check, Maximize2 } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { TMDB_IMG_ORIGINAL, TMDB_IMG, GENRE_ID_TO_NAME } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToLibrary } from '@/lib/api/library';
import {
  getMovieDetails,
  getTVDetails,
  getMovieContentRating,
  getTVContentRating,
} from '@/lib/api/tmdb';

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
  const [details, setDetails] = useState<any>(null);
  const [certification, setCertification] = useState<string | null>(null);

  const title = item?.title || item?.name || '';
  const rating = item?.unified_rating || item?.vote_average;
  const year = (item?.release_date || item?.first_air_date || '').slice(0, 4);
  const overview = (item as any)?.overview || details?.overview || '';
  const backdrop = item?.backdrop_path
    ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}`
    : null;

  const genreNames = (
    item?.genre_ids?.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean) ||
    item?.genres?.map((g) => g.name) ||
    details?.genres?.map((g: any) => g.name) ||
    []
  ).slice(0, 4);

  // Fetch extra details (cast, runtime, certification) when modal opens
  useEffect(() => {
    if (!item?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const [det, cert] = await Promise.all([
          mediaType === 'tv' ? getTVDetails(item.id!) : getMovieDetails(item.id!),
          mediaType === 'tv' ? getTVContentRating(item.id!) : getMovieContentRating(item.id!),
        ]);
        if (cancelled) return;
        setDetails(det);
        setCertification(cert);
      } catch { /* best-effort */ }
    })();

    return () => { cancelled = true; };
  }, [item?.id, mediaType]);

  const cast = (details?.credits?.cast || []).slice(0, 5).map((c: any) => c.name);
  const directors = (details?.credits?.crew || [])
    .filter((c: any) => c.job === 'Director')
    .slice(0, 2)
    .map((c: any) => c.name);
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : details?.episode_run_time?.[0]
      ? `${details.episode_run_time[0]}m`
      : null;
  const seasons = details?.number_of_seasons;

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

  return createPortal(
    <AnimatePresence>
      {item && (
        <m.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto pt-[5vh] pb-10"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-3xl rounded-xl overflow-hidden bg-[#181818] shadow-[0_20px_80px_rgba(0,0,0,0.8)] mx-4"
          >
            {/* ── Backdrop hero ── */}
            <div className="relative aspect-[16/9] overflow-hidden">
              {backdrop ? (
                <img
                  src={backdrop}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dark-700" />
              )}

              {/* Gradient: bottom fade into body */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent via-[55%] to-transparent" />
              {/* Extra bottom gradient for smooth blend */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#181818] to-transparent" />

              {/* Top-right buttons: expand + close */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={handleGoToDetail}
                  className="w-9 h-9 rounded-full bg-[#181818]/70 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-[#181818]/90 hover:border-white/30 transition-all"
                  title="Full Details"
                >
                  <Maximize2 size={15} className="text-white/70" />
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-[#181818]/70 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-[#181818]/90 hover:border-white/30 transition-all"
                >
                  <X size={16} className="text-white/70" />
                </button>
              </div>

              {/* Title + action buttons overlaid at bottom of backdrop */}
              <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 z-10">
                <h2
                  className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)' }}
                >
                  {title}
                </h2>

                <div className="flex items-center gap-3">
                  {/* Play button */}
                  <button
                    onClick={handleGoToDetail}
                    className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded-md hover:bg-white/85 transition-all active:scale-[0.97]"
                  >
                    <Play size={20} className="fill-black" />
                    Play
                  </button>

                  {/* Add button */}
                  {user && !added ? (
                    <button
                      onClick={handleAdd}
                      className="w-10 h-10 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm flex items-center justify-center hover:border-white hover:bg-black/50 transition-all active:scale-90"
                      title="Add to Watchlist"
                    >
                      <Plus size={20} className="text-white" />
                    </button>
                  ) : added ? (
                    <div className="w-10 h-10 rounded-full border-2 border-green-500/50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                      <Check size={20} className="text-green-400" />
                    </div>
                  ) : null}

                  {/* Rating badge */}
                  {rating != null && rating > 0 && (
                    <div
                      className="ml-2 rounded-md px-2.5 py-1 flex items-center gap-1.5 backdrop-blur-md border border-white/10"
                      style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
                    >
                      <span className="text-sm font-bold" style={{ color: getRatingHex(Number(rating)) }}>
                        {Number(rating).toFixed(1)}
                      </span>
                      <span className="text-[11px] text-white/30">/10</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Details body ── */}
            <div className="px-8 pb-8 pt-2">
              <div className="flex gap-8">
                {/* Left column: metadata + overview */}
                <div className="flex-1 min-w-0">
                  {/* Meta row: year, HD, runtime, certification */}
                  <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                    {year && (
                      <span className="text-sm text-white/60 font-medium">{year}</span>
                    )}
                    <span className="text-[10px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5 leading-none">
                      HD
                    </span>
                    {runtime && (
                      <span className="text-sm text-white/40">{runtime}</span>
                    )}
                    {seasons && mediaType === 'tv' && (
                      <span className="text-sm text-white/40">
                        {seasons} Season{seasons > 1 ? 's' : ''}
                      </span>
                    )}
                    {certification && (
                      <span className="text-[10px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5 leading-none">
                        {certification}
                      </span>
                    )}
                  </div>

                  {/* Overview */}
                  {overview && (
                    <p className="text-sm text-white/60 leading-relaxed">
                      {overview}
                    </p>
                  )}
                </div>

                {/* Right column: cast + genres */}
                <div className="w-48 shrink-0 hidden sm:block">
                  {cast.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">Starring: </span>
                      <span className="text-xs text-white/60">{cast.join(', ')}</span>
                    </div>
                  )}
                  {directors.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">
                        {mediaType === 'tv' ? 'Creator: ' : 'Director: '}
                      </span>
                      <span className="text-xs text-white/60">{directors.join(', ')}</span>
                    </div>
                  )}
                  {genreNames.length > 0 && (
                    <div>
                      <span className="text-xs text-white/30">Genres: </span>
                      <span className="text-xs text-white/60">{genreNames.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: cast + genres below overview */}
              <div className="sm:hidden mt-4 pt-3 border-t border-white/[0.06]">
                {cast.length > 0 && (
                  <p className="text-xs text-white/40 mb-1">
                    <span className="text-white/25">Starring: </span>
                    {cast.join(', ')}
                  </p>
                )}
                {genreNames.length > 0 && (
                  <p className="text-xs text-white/40">
                    <span className="text-white/25">Genres: </span>
                    {genreNames.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
