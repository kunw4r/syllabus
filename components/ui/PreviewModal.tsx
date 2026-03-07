'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Play, Plus, Check, Maximize2, ChevronDown, ChevronLeft, ChevronRight, Star } from 'lucide-react';
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

const BG = '#0c0c0c';
const CARD_BG = '#151515';

function RatingBadge({ value, size = 'sm' }: { value: number; size?: 'sm' | 'xs' }) {
  if (!value || value <= 0) return null;
  const v = Number(value);
  const isSm = size === 'sm';
  return (
    <div
      className={`rounded-md flex items-center gap-1 backdrop-blur-md border border-white/10 ${
        isSm ? 'px-2.5 py-1' : 'px-1.5 py-0.5'
      }`}
      style={{ background: getRatingBg(v), boxShadow: getRatingGlow(v) }}
    >
      <span
        className={`font-bold ${isSm ? 'text-sm' : 'text-[11px]'}`}
        style={{ color: getRatingHex(v) }}
      >
        {v.toFixed(1)}
      </span>
      <span className={`text-white/30 ${isSm ? 'text-[11px]' : 'text-[9px]'}`}>/10</span>
    </div>
  );
}

function RatingBar({ value }: { value: number }) {
  if (!value || value <= 0) return null;
  const v = Number(value);
  const pct = Math.min((v / 10) * 100, 100);
  const color = getRatingHex(v);
  return (
    <div className="flex items-center gap-2.5 mt-2.5 w-full">
      <div className="flex-1 h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
        <m.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 8px ${color}40` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-bold" style={{ color }}>{v.toFixed(1)}</span>
        <span className="text-[9px] text-white/25">/10</span>
      </div>
    </div>
  );
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
  const [showAllRecs, setShowAllRecs] = useState(false);
  const recScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setAdded(false);
    setPlayingTrailer(false);
    setDetails(null);
    setCertification(null);
    setSeasonData(null);
    setSelectedSeason(1);
    setShowAllRecs(false);
  }, [item?.id]);

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
    .slice(0, 5).map((c: any) => c.name);
  const directors = (details?.credits?.crew || [])
    .filter((c: any) => c.job === 'Director').slice(0, 2).map((c: any) => c.name);
  const creators = (details?.created_by || []).slice(0, 2).map((c: any) => c.name);
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : details?.episode_run_time?.[0] ? `${details.episode_run_time[0]}m` : null;
  const seasons = details?.number_of_seasons;
  const seasonsList = (details?.seasons || []).filter((s: any) => s.season_number > 0);
  const episodes = seasonData?.episodes || [];

  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
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
        tmdb_id: item.id ?? null, media_type: mediaType, title,
        poster_url: poster, genres: genreNames.join(', '),
        external_rating: rating ?? null, status: 'want',
      });
      setAdded(true);
    } catch { /* silently fail */ }
  };

  const handlePlayTrailer = () => {
    if (trailerKey) setPlayingTrailer(true);
    else handleGoToDetail();
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
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/90 backdrop-blur-sm overflow-y-auto pt-[2vh] sm:pt-[3vh] pb-10"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-6xl rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.95)] mx-4"
            style={{ background: BG }}
          >
            {/* ── Extended backdrop behind entire modal ── */}
            {backdrop && !playingTrailer && (
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img src={backdrop} alt="" className="w-full h-[70%] object-cover object-[center_20%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/95 via-[55%] to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-[30%] to-[#0c0c0c]" />
              </div>
            )}

            {/* ── Hero ── */}
            <div className="relative aspect-[16/9] overflow-hidden z-[1]">
              {playingTrailer && trailerKey ? (
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : backdrop ? (
                <img src={backdrop} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-dark-700" />
              )}

              {!playingTrailer && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent via-[40%] to-black/30" />
                  <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-[#0c0c0c]/90 to-transparent" />
                </>
              )}

              {/* Top buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={handleGoToDetail}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70 hover:border-white/30 transition-all"
                  title="Full Details"
                >
                  <Maximize2 size={16} className="text-white/80" />
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70 hover:border-white/30 transition-all"
                >
                  <X size={18} className="text-white/80" />
                </button>
              </div>

              {/* Title + actions at bottom */}
              {!playingTrailer && (
                <div className="absolute bottom-0 left-0 right-0 px-10 pb-8 z-10">
                  <h2
                    className="text-4xl sm:text-5xl font-black text-white leading-[1.1] mb-5"
                    style={{ textShadow: '0 2px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.5)' }}
                  >
                    {title}
                  </h2>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayTrailer}
                      className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-md hover:bg-white/85 transition-all active:scale-[0.97] text-base"
                    >
                      <Play size={22} className="fill-black" />
                      {trailerKey ? 'Trailer' : 'Play'}
                    </button>

                    {user && !added ? (
                      <button
                        onClick={handleAdd}
                        className="w-11 h-11 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm flex items-center justify-center hover:border-white hover:bg-black/50 transition-all active:scale-90"
                        title="Add to Watchlist"
                      >
                        <Plus size={22} className="text-white" />
                      </button>
                    ) : added ? (
                      <div className="w-11 h-11 rounded-full border-2 border-green-500/50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <Check size={22} className="text-green-400" />
                      </div>
                    ) : null}

                    {rating != null && rating > 0 && <RatingBadge value={Number(rating)} />}
                  </div>
                </div>
              )}
            </div>

            {/* ── Details body ── */}
            <div className="relative z-[1] px-10 pb-10 pt-3">
              <div className="flex gap-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    {year && <span className="text-sm text-white/60 font-medium">{year}</span>}
                    <span className="text-[10px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5 leading-none">HD</span>
                    {runtime && <span className="text-sm text-white/40">{runtime}</span>}
                    {seasons && mediaType === 'tv' && (
                      <span className="text-sm text-white/40">{seasons} Season{seasons > 1 ? 's' : ''}</span>
                    )}
                    {certification && (
                      <span className="text-[10px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5 leading-none">{certification}</span>
                    )}
                  </div>
                  {overview && (
                    <p className="text-[15px] text-white/60 leading-relaxed">{overview}</p>
                  )}
                </div>

                <div className="w-56 shrink-0 hidden sm:block">
                  {cast.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">Starring: </span>
                      <span className="text-xs text-white/60">{cast.join(', ')}</span>
                    </div>
                  )}
                  {(directors.length > 0 || creators.length > 0) && (
                    <div className="mb-3">
                      <span className="text-xs text-white/30">{mediaType === 'tv' ? 'Creator: ' : 'Director: '}</span>
                      <span className="text-xs text-white/60">{(mediaType === 'tv' ? creators : directors).join(', ')}</span>
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

              <div className="sm:hidden mt-5 pt-4 border-t border-white/[0.05]">
                {cast.length > 0 && (
                  <p className="text-xs text-white/40 mb-1"><span className="text-white/25">Starring: </span>{cast.join(', ')}</p>
                )}
                {genreNames.length > 0 && (
                  <p className="text-xs text-white/40"><span className="text-white/25">Genres: </span>{genreNames.join(', ')}</p>
                )}
              </div>
            </div>

            {/* ── Episodes (TV) ── */}
            {mediaType === 'tv' && seasonsList.length > 0 && (
              <div className="relative z-[1] px-10 pb-10">
                <div className="border-t border-white/[0.05] pt-8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-2xl font-bold text-white">Episodes</h3>
                    <div className="relative">
                      <button
                        onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-sm text-white hover:border-white/30 transition-colors"
                        style={{ background: CARD_BG }}
                      >
                        Season {selectedSeason}
                        <ChevronDown size={14} className={`text-white/50 transition-transform ${seasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {seasonDropdownOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 border border-white/10 rounded-lg shadow-2xl z-20 max-h-64 overflow-y-auto min-w-[180px]"
                          style={{ background: CARD_BG }}
                        >
                          {seasonsList.map((s: any) => (
                            <button
                              key={s.season_number}
                              onClick={() => { setSelectedSeason(s.season_number); setSeasonDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition-colors ${
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

                  {seasonData && (
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-sm font-semibold text-white">Season {selectedSeason}</span>
                      {seasonData.air_date && <span className="text-sm text-white/40">{seasonData.air_date.slice(0, 4)}</span>}
                      {(() => {
                        const rated = episodes.filter((ep: any) => ep.vote_average > 0);
                        if (rated.length === 0) return null;
                        const avg = rated.reduce((s: number, ep: any) => s + ep.vote_average, 0) / rated.length;
                        return (
                          <div
                            className="flex items-center gap-1.5 ml-auto rounded-md px-2 py-0.5 backdrop-blur-md border border-white/10"
                            style={{ background: getRatingBg(avg), boxShadow: getRatingGlow(avg) }}
                          >
                            <Star size={11} className="fill-current" style={{ color: getRatingHex(avg) }} />
                            <span className="text-xs font-bold" style={{ color: getRatingHex(avg) }}>{avg.toFixed(1)}</span>
                            <span className="text-[9px] text-white/25">/10</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {episodes.length > 0 ? (
                    <div>
                      {episodes.map((ep: any, i: number) => (
                        <div
                          key={ep.id}
                          className={`flex gap-4 sm:gap-5 py-5 ${i > 0 ? 'border-t border-white/[0.05]' : ''} hover:bg-white/[0.04] transition-colors rounded-lg px-3 -mx-3`}
                        >
                          <div className="shrink-0 w-8 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white/15">{ep.episode_number}</span>
                          </div>
                          <div className="shrink-0 w-[160px] sm:w-[200px] aspect-[16/9] rounded-lg overflow-hidden" style={{ background: CARD_BG }}>
                            {ep.still_path ? (
                              <img src={`${TMDB_IMG}${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/10"><Play size={24} /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm font-semibold text-white truncate">{ep.name}</h4>
                              <span className="text-xs text-white/30 shrink-0">{ep.runtime ? `${ep.runtime} min` : ''}</span>
                            </div>
                            {ep.overview && (
                              <p className="text-xs text-white/40 mt-2 leading-relaxed line-clamp-2">{ep.overview}</p>
                            )}
                            {ep.vote_average > 0 && (
                              <RatingBar value={ep.vote_average} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : seasonData === null && details ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* ── More Like This (Movies) ── */}
            {mediaType === 'movie' && details?.recommendations?.results?.length > 0 && (() => {
              const allRecs = details.recommendations.results.filter((r: any) => r.backdrop_path);
              const visibleRecs = showAllRecs ? allRecs : allRecs.slice(0, 9);
              const scrollRec = (dir: number) => {
                recScrollRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });
              };
              return (
                <div className="px-10 pb-4">
                  <div className="border-t border-white/[0.05] pt-8">
                    <h3 className="text-2xl font-bold text-white mb-5">More Like This</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {visibleRecs.map((rec: any) => {
                        const recRuntime = rec.runtime
                          ? `${Math.floor(rec.runtime / 60)}h ${rec.runtime % 60}m`
                          : null;
                        const recYear = (rec.release_date || '').slice(0, 4);
                        return (
                          <div
                            key={rec.id}
                            className="group/mlt rounded-lg overflow-hidden hover:ring-1 hover:ring-white/10 transition-all cursor-pointer"
                            style={{ background: CARD_BG }}
                            onClick={() => { onClose(); router.push(`/details/movie/${rec.id}`); }}
                          >
                            <div className="relative aspect-[16/9] overflow-hidden">
                              <img
                                src={`${TMDB_IMG}${rec.backdrop_path}`}
                                alt={rec.title || rec.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {recRuntime && (
                                <span className="absolute top-2 right-2 text-[11px] text-white/80 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                                  {recRuntime}
                                </span>
                              )}
                            </div>
                            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                {rec.vote_average > 0 && <RatingBadge value={rec.vote_average} size="xs" />}
                                <span className="text-[10px] font-bold text-white/40 border border-white/15 rounded px-1 py-px leading-none">HD</span>
                                {recYear && <span className="text-xs text-white/40">{recYear}</span>}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="shrink-0 w-8 h-8 rounded-full border border-white/25 flex items-center justify-center hover:border-white/50 transition-colors"
                              >
                                <Plus size={15} className="text-white/50" />
                              </button>
                            </div>
                            {rec.overview && (
                              <div className="px-3 pb-3 relative">
                                <p className="text-xs text-white/40 leading-relaxed line-clamp-3 group-hover/mlt:line-clamp-none transition-all duration-300">{rec.overview}</p>
                                <div className="absolute bottom-3 left-3 right-3 h-6 bg-gradient-to-t from-[#151515] to-transparent group-hover/mlt:opacity-0 transition-opacity duration-300 pointer-events-none" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Show more / show less chevron */}
                    {allRecs.length > 9 && (
                      <div className="flex justify-center mt-6 mb-2">
                        <button
                          onClick={() => setShowAllRecs(!showAllRecs)}
                          className="w-12 h-12 rounded-full border-2 border-white/20 bg-white/[0.04] flex items-center justify-center hover:border-white/40 hover:bg-white/[0.08] transition-all"
                        >
                          <ChevronDown size={24} className={`text-white/60 transition-transform duration-300 ${showAllRecs ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── About (Movies) ── */}
            {mediaType === 'movie' && details && (
              <div className="relative z-[1] px-10 pb-10">
                <div className="border-t border-white/[0.05] pt-8">
                  <h3 className="text-2xl font-bold text-white mb-5">About {title}</h3>
                  <div className="space-y-2.5 text-sm">
                    {directors.length > 0 && (
                      <p><span className="text-white/30">Director: </span><span className="text-white/60">{directors.join(', ')}</span></p>
                    )}
                    {(details?.credits?.cast || []).length > 0 && (
                      <p><span className="text-white/30">Cast: </span><span className="text-white/60">{(details.credits.cast || []).slice(0, 10).map((c: any) => c.name).join(', ')}</span></p>
                    )}
                    {(details?.credits?.crew || []).filter((c: any) => c.job === 'Screenplay' || c.job === 'Writer').length > 0 && (
                      <p>
                        <span className="text-white/30">Writer: </span>
                        <span className="text-white/60">
                          {(details.credits.crew || []).filter((c: any) => c.job === 'Screenplay' || c.job === 'Writer').slice(0, 3).map((c: any) => c.name).join(', ')}
                        </span>
                      </p>
                    )}
                    {genreNames.length > 0 && (
                      <p><span className="text-white/30">Genres: </span><span className="text-white/60">{genreNames.join(', ')}</span></p>
                    )}
                    {certification && (
                      <p className="flex items-center gap-2">
                        <span className="text-white/30">Maturity rating: </span>
                        <span className="text-[11px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5">{certification}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── About (TV) ── */}
            {mediaType === 'tv' && details && (
              <div className="relative z-[1] px-10 pb-10">
                <div className="border-t border-white/[0.05] pt-8">
                  <h3 className="text-2xl font-bold text-white mb-5">About {title}</h3>
                  <div className="space-y-2.5 text-sm">
                    {creators.length > 0 && (
                      <p><span className="text-white/30">Creator: </span><span className="text-white/60">{creators.join(', ')}</span></p>
                    )}
                    {(details?.aggregate_credits?.cast || details?.credits?.cast || []).length > 0 && (
                      <p><span className="text-white/30">Cast: </span><span className="text-white/60">{(details.aggregate_credits?.cast || details.credits?.cast || []).slice(0, 10).map((c: any) => c.name).join(', ')}</span></p>
                    )}
                    {genreNames.length > 0 && (
                      <p><span className="text-white/30">Genres: </span><span className="text-white/60">{genreNames.join(', ')}</span></p>
                    )}
                    {certification && (
                      <p className="flex items-center gap-2">
                        <span className="text-white/30">Maturity rating: </span>
                        <span className="text-[11px] font-bold text-white/50 border border-white/20 rounded px-1.5 py-0.5">{certification}</span>
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
