'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Play, Plus, Check, Maximize2, ChevronDown, Star } from 'lucide-react';
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
  getTVSeasonDetails,
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

function getTrailerKey(details: any): string | null {
  const videos = details?.videos?.results || [];
  const trailer =
    videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser');
  return trailer?.key || null;
}

export default function PreviewModal({ item, mediaType, onClose }: PreviewModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [certification, setCertification] = useState<string | null>(null);
  const [playingTrailer, setPlayingTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState<any>(null);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

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

  const trailerKey = getTrailerKey(details);

  // Reset state when item changes
  useEffect(() => {
    setAdded(false);
    setPlayingTrailer(false);
    setDetails(null);
    setCertification(null);
    setSeasonData(null);
    setSelectedSeason(1);
  }, [item?.id]);

  // Fetch details
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

  // Fetch season episodes for TV
  useEffect(() => {
    if (mediaType !== 'tv' || !item?.id || !details) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getTVSeasonDetails(item.id!, selectedSeason);
        if (!cancelled) setSeasonData(data);
      } catch { /* best-effort */ }
    })();

    return () => { cancelled = true; };
  }, [item?.id, mediaType, selectedSeason, details]);

  const cast = (details?.credits?.cast || details?.aggregate_credits?.cast || [])
    .slice(0, 5)
    .map((c: any) => c.name);
  const directors = (details?.credits?.crew || [])
    .filter((c: any) => c.job === 'Director')
    .slice(0, 2)
    .map((c: any) => c.name);
  const creators = (details?.created_by || []).slice(0, 2).map((c: any) => c.name);
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : details?.episode_run_time?.[0]
      ? `${details.episode_run_time[0]}m`
      : null;
  const seasons = details?.number_of_seasons;
  const seasonsList = (details?.seasons || []).filter((s: any) => s.season_number > 0);
  const episodes = seasonData?.episodes || [];

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

  const handlePlayTrailer = () => {
    if (trailerKey) {
      setPlayingTrailer(true);
    } else {
      handleGoToDetail();
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
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto pt-[3vh] sm:pt-[5vh] pb-10"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-3xl rounded-xl overflow-hidden bg-[#181818] shadow-[0_20px_80px_rgba(0,0,0,0.8)] mx-4"
          >
            {/* ── Hero: Backdrop or Trailer ── */}
            <div className="relative aspect-[16/9] overflow-hidden">
              {playingTrailer && trailerKey ? (
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : backdrop ? (
                <img
                  src={backdrop}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dark-700" />
              )}

              {/* Gradients (hidden during trailer) */}
              {!playingTrailer && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent via-[55%] to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#181818] to-transparent" />
                </>
              )}

              {/* Top-right buttons */}
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

              {/* Title + action buttons overlaid at bottom */}
              {!playingTrailer && (
                <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 z-10">
                  <h2
                    className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)' }}
                  >
                    {title}
                  </h2>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayTrailer}
                      className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded-md hover:bg-white/85 transition-all active:scale-[0.97]"
                    >
                      <Play size={20} className="fill-black" />
                      {trailerKey ? 'Trailer' : 'Play'}
                    </button>

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
              )}
            </div>

            {/* ── Details body ── */}
            <div className="px-8 pb-8 pt-2">
              <div className="flex gap-8">
                <div className="flex-1 min-w-0">
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

                  {overview && (
                    <p className="text-sm text-white/60 leading-relaxed">
                      {overview}
                    </p>
                  )}
                </div>

                <div className="w-48 shrink-0 hidden sm:block">
                  {cast.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">Starring: </span>
                      <span className="text-xs text-white/60">{cast.join(', ')}</span>
                    </div>
                  )}
                  {(directors.length > 0 || creators.length > 0) && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">
                        {mediaType === 'tv' ? 'Creator: ' : 'Director: '}
                      </span>
                      <span className="text-xs text-white/60">
                        {(mediaType === 'tv' ? creators : directors).join(', ')}
                      </span>
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

              {/* Mobile meta */}
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

            {/* ── Episodes section (TV only) ── */}
            {mediaType === 'tv' && seasonsList.length > 0 && (
              <div className="px-8 pb-8">
                <div className="border-t border-white/[0.06] pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Episodes</h3>

                    {/* Season selector */}
                    <div className="relative">
                      <button
                        onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 bg-[#242424] text-sm text-white hover:border-white/40 transition-colors"
                      >
                        Season {selectedSeason}
                        <ChevronDown size={14} className={`text-white/50 transition-transform ${seasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {seasonDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-[#242424] border border-white/10 rounded-md shadow-2xl z-20 max-h-60 overflow-y-auto min-w-[160px]">
                          {seasonsList.map((s: any) => (
                            <button
                              key={s.season_number}
                              onClick={() => { setSelectedSeason(s.season_number); setSeasonDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                selectedSeason === s.season_number ? 'text-white bg-white/5' : 'text-white/60'
                              }`}
                            >
                              Season {s.season_number}
                              {s.episode_count ? <span className="text-white/30 ml-2">({s.episode_count} eps)</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Season info */}
                  {seasonData && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-semibold text-white">
                        Season {selectedSeason}
                      </span>
                      {seasonData.air_date && (
                        <span className="text-sm text-white/40">{seasonData.air_date.slice(0, 4)}</span>
                      )}
                    </div>
                  )}

                  {/* Episode list */}
                  {episodes.length > 0 ? (
                    <div className="space-y-0">
                      {episodes.map((ep: any, i: number) => (
                        <div
                          key={ep.id}
                          className={`flex gap-4 py-5 ${i > 0 ? 'border-t border-white/[0.06]' : ''} hover:bg-white/[0.03] transition-colors rounded-lg px-2 -mx-2`}
                        >
                          {/* Episode number */}
                          <div className="shrink-0 w-8 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white/20">{ep.episode_number}</span>
                          </div>

                          {/* Episode still */}
                          <div className="shrink-0 w-[140px] sm:w-[180px] aspect-[16/9] rounded-md overflow-hidden bg-[#242424]">
                            {ep.still_path ? (
                              <img
                                src={`${TMDB_IMG}${ep.still_path}`}
                                alt={ep.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10">
                                <Play size={24} />
                              </div>
                            )}
                          </div>

                          {/* Episode info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold text-white truncate">
                                {ep.name}
                              </h4>
                              <span className="text-xs text-white/30 shrink-0">
                                {ep.runtime ? `${ep.runtime} min` : ''}
                              </span>
                            </div>
                            {ep.overview && (
                              <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2">
                                {ep.overview}
                              </p>
                            )}
                            {ep.vote_average > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <Star size={10} className="fill-current text-yellow-500" />
                                <span className="text-xs text-white/40">{ep.vote_average.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : seasonData === null && details ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* ── More Like This (Movies) — Netflix-style cards ── */}
            {mediaType === 'movie' && details?.recommendations?.results?.length > 0 && (
              <div className="px-8 pb-8">
                <div className="border-t border-white/[0.06] pt-6">
                  <h3 className="text-xl font-bold text-white mb-4">More Like This</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {details.recommendations.results
                      .filter((r: any) => r.backdrop_path)
                      .slice(0, 9)
                      .map((rec: any) => {
                        const recRuntime = rec.runtime
                          ? `${Math.floor(rec.runtime / 60)}h ${rec.runtime % 60}m`
                          : null;
                        const recYear = (rec.release_date || '').slice(0, 4);
                        return (
                          <div
                            key={rec.id}
                            className="rounded-lg overflow-hidden bg-[#2b2b2b] hover:bg-[#333] transition-colors cursor-pointer"
                            onClick={() => { onClose(); router.push(`/details/movie/${rec.id}`); }}
                          >
                            {/* Backdrop with runtime badge */}
                            <div className="relative aspect-[16/9] overflow-hidden">
                              <img
                                src={`${TMDB_IMG}${rec.backdrop_path}`}
                                alt={rec.title || rec.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {recRuntime && (
                                <span className="absolute top-2 right-2 text-[11px] text-white/70 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                                  {recRuntime}
                                </span>
                              )}
                            </div>

                            {/* Meta row: cert, HD, year, + button */}
                            <div className="px-3 pt-2.5 pb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                {rec.vote_average > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star size={10} className="fill-current text-yellow-500" />
                                    <span className="text-xs text-white/50">{rec.vote_average.toFixed(1)}</span>
                                  </div>
                                )}
                                <span className="text-[10px] font-bold text-white/40 border border-white/15 rounded px-1 py-px leading-none">
                                  HD
                                </span>
                                {recYear && <span className="text-xs text-white/40">{recYear}</span>}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="shrink-0 w-7 h-7 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors"
                              >
                                <Plus size={14} className="text-white/60" />
                              </button>
                            </div>

                            {/* Overview blurb */}
                            {rec.overview && (
                              <p className="px-3 pb-3 text-xs text-white/40 leading-relaxed line-clamp-3">
                                {rec.overview}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* ── About section (Movies) ── */}
            {mediaType === 'movie' && details && (
              <div className="px-8 pb-8">
                <div className="border-t border-white/[0.06] pt-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    About {title}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {directors.length > 0 && (
                      <p>
                        <span className="text-white/30">Director: </span>
                        <span className="text-white/60">{directors.join(', ')}</span>
                      </p>
                    )}
                    {(details?.credits?.cast || []).length > 0 && (
                      <p>
                        <span className="text-white/30">Cast: </span>
                        <span className="text-white/60">
                          {(details.credits.cast || []).slice(0, 10).map((c: any) => c.name).join(', ')}
                        </span>
                      </p>
                    )}
                    {(details?.credits?.crew || []).filter((c: any) => c.job === 'Screenplay' || c.job === 'Writer').length > 0 && (
                      <p>
                        <span className="text-white/30">Writer: </span>
                        <span className="text-white/60">
                          {(details.credits.crew || [])
                            .filter((c: any) => c.job === 'Screenplay' || c.job === 'Writer')
                            .slice(0, 3)
                            .map((c: any) => c.name)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                    {genreNames.length > 0 && (
                      <p>
                        <span className="text-white/30">Genres: </span>
                        <span className="text-white/60">{genreNames.join(', ')}</span>
                      </p>
                    )}
                    {certification && (
                      <p>
                        <span className="text-white/30">Maturity rating: </span>
                        <span className="text-[11px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5">
                          {certification}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
