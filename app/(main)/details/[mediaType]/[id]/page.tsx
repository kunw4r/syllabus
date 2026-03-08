'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, Clock, Eye, CheckCircle2, Play, ExternalLink, Globe, Award,
  DollarSign, Film, Tv, BookOpen, Users, Calendar, X, Heart, Plus, Minus,
  ChevronLeft, ChevronRight, Check, Trash2, Info, Sparkles, Lightbulb, ShoppingCart,
  BookCopy, BookMarked, PenLine, ChevronDown, Download,
} from 'lucide-react';
import { m, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getMovieDetails, getTVDetails, getTrendingMovies, getTrendingTV, getTVSeasonDetails, getCollectionDetails } from '@/lib/api/tmdb';
import { getOMDbRatings, getOMDbSeasonEpisodes } from '@/lib/api/omdb';
import { getMALRating } from '@/lib/api/jikan';
import { getBookDetails, getBookRecommendations } from '@/lib/api/books';
import {
  addToLibrary, updateLibraryItem, removeFromLibrary,
  getLibraryItemByMediaId,
} from '@/lib/api/library';
import { computeUnifiedRating, setSyllabusScore, getSyllabusScore, getStaticRatings } from '@/lib/scoring';
import { TMDB_IMG, TMDB_IMG_ORIGINAL, TMDB_BACKDROP, STREAMING_PROVIDERS, SCENARIO_KEYWORDS } from '@/lib/constants';
import BookCover from '@/components/ui/BookCover';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { FadeInView } from '@/components/motion/FadeInView';
import HeroBackdrop from '@/components/details/HeroBackdrop';
import RatingCluster from '@/components/details/RatingCluster';
import CastRow from '@/components/details/CastRow';
import StreamingProviders from '@/components/details/StreamingProviders';
import QuickFactsCard from '@/components/details/QuickFactsCard';
import { getRatingHex, getRatingBg, getRatingGlow, getRatingTextGlow, getRatingTrackGlow } from '@/lib/utils/rating-colors';
import StreamingModal from '@/components/details/StreamingModal';
import DownloadModal from '@/components/details/DownloadModal';
import { useDownload } from '@/components/providers/DownloadProvider';

// ─── Image base URLs ───
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

// ─── Rating helpers ───

function AnimatedRatingNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });
  const display = useTransform(spring, (v) => v > 0 ? v.toFixed(1) : '\u2014');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => display.on('change', (v) => { if (ref.current) ref.current.textContent = v; }), [display]);

  return <span ref={ref}>{value > 0 ? value.toFixed(1) : '\u2014'}</span>;
}

function getRatingLabel(val: number): string {
  if (!val || val === 0) return '';
  if (val <= 2) return 'Terrible';
  if (val <= 4) return 'Not great';
  if (val <= 5) return 'Okay';
  if (val <= 6.5) return 'Decent';
  if (val <= 7.5) return 'Good';
  if (val <= 8.5) return 'Great';
  if (val <= 9.5) return 'Amazing';
  return 'Masterpiece';
}

// ─── Mood/Vibe tags derived from genres ───
const GENRE_TO_VIBES: Record<string, string[]> = {
  'Action': ['adrenaline', 'action'],
  'Comedy': ['funny', 'feel good'],
  'Drama': ['emotional'],
  'Horror': ['scary'],
  'Romance': ['romantic', 'date night'],
  'Thriller': ['suspense'],
  'Science Fiction': ['mind bending'],
  'Fantasy': ['magic', 'escape'],
  'Adventure': ['adventure'],
  'Animation': ['animated'],
  'Documentary': ['learn'],
  'Crime': ['heist'],
  'Mystery': ['mystery'],
  'War': ['war'],
  'Western': ['western'],
  'Music': ['music'],
  'Family': ['family', 'wholesome'],
};

/* ═══════════════════════════════════════════════════════════════════════════
   LibraryPanel -- inline status / rate / review
   ═══════════════════════════════════════════════════════════════════════════ */

interface LibraryPanelProps {
  mediaId: { tmdb_id?: number | string; openlibrary_key?: string };
  addPayload: Record<string, unknown>;
  mediaType?: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  runtime?: number; // movie runtime in minutes
}

function LibraryPanel({ mediaId, addPayload, mediaType: mType, totalSeasons, totalEpisodes, runtime }: LibraryPanelProps) {
  const [libItem, setLibItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('watching');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [progressSeason, setProgressSeason] = useState<number>(1);
  const [progressEpisode, setProgressEpisode] = useState<number>(1);
  const [progressTimestamp, setProgressTimestamp] = useState<number>(0);
  const toast = useToast();
  const { user } = useAuth();

  const stableKey = String(mediaId.tmdb_id || mediaId.openlibrary_key || '');

  useEffect(() => {
    let cancelled = false;
    async function lookup() {
      if (!user) { setLoading(false); return; }
      try {
        const item = await getLibraryItemByMediaId(mediaId);
        if (cancelled) return;
        if (item) {
          setLibItem(item);
          setStatus(item.status || 'watching');
          setRating(item.user_rating || 0);
          setReview(item.review || '');
          setProgressSeason(item.progress_season || 1);
          setProgressEpisode(item.progress_episode || 1);
          setProgressTimestamp(item.progress_timestamp || 0);
          setExpanded(true);
        }
      } catch (err) {
        console.error('Library lookup failed:', err);
      }
      if (!cancelled) setLoading(false);
    }
    lookup();
    return () => { cancelled = true; };
  }, [stableKey, user]);

  const handleAdd = async (chosenStatus: string) => {
    if (!user) return toast('Please log in first', 'error');
    try {
      const newItem = await addToLibrary({ ...addPayload, status: chosenStatus });
      setLibItem(newItem);
      setStatus(chosenStatus);
      setExpanded(true);
      setJustAdded(true);
      toast('Added to library!', 'success');
      setTimeout(() => setJustAdded(false), 600);
    } catch (err: any) {
      const msg = err?.message || 'Could not add';
      toast(msg === 'Already in your library' ? msg : `Could not add: ${msg}`, 'error');
      console.error('addToLibrary failed:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    if (libItem) {
      try {
        await updateLibraryItem(libItem.id, { status: newStatus });
        setLibItem((prev: any) => ({ ...prev, status: newStatus }));
        const labels: Record<string, string> = { want: 'Up Next', watching: 'In Progress', finished: 'Completed' };
        toast(`Moved to ${labels[newStatus]}`, 'info');
      } catch { toast('Failed to update status', 'error'); }
    }
  };

  const handleSave = async () => {
    if (!libItem) return;
    setSaving(true);
    try {
      const updated = await updateLibraryItem(libItem.id, {
        user_rating: rating || null,
        review: review || null,
        status,
        progress_season: mType === 'tv' ? progressSeason : null,
        progress_episode: mType === 'tv' ? progressEpisode : null,
        progress_timestamp: progressTimestamp || null,
      });
      setLibItem(updated);
      toast('Saved!', 'success');
    } catch (err: any) {
      console.error('Save failed:', err);
      toast(err?.message || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!libItem) return;
    try {
      await removeFromLibrary(libItem.id);
      setLibItem(null);
      setStatus('watching');
      setRating(0);
      setReview('');
      setExpanded(false);
      toast('Removed from library', 'success');
    } catch { toast('Failed to remove', 'error'); }
  };

  if (loading) return <div className="h-12 w-48 bg-dark-700 rounded-xl animate-pulse mt-2" />;
  if (!user) return <p className="text-xs text-white/30 mt-4">Log in to add to your library</p>;

  // Not in library: show add buttons
  if (!libItem) {
    return (
      <div className="mt-6">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Add to Library</p>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'watching', icon: Eye, label: 'In Progress', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25 hover:border-blue-400/50' },
            { key: 'want', icon: Clock, label: 'Up Next', cls: 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25 hover:border-purple-400/50' },
            { key: 'finished', icon: CheckCircle2, label: 'Completed', cls: 'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25 hover:border-green-400/50' },
          ] as const).map((s) => (
            <m.button
              key={s.key}
              onClick={() => handleAdd(s.key)}
              whileTap={{ scale: 0.95 }}
              className={`${s.cls} border px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]`}
            >
              <s.icon size={16} />
              {s.label}
            </m.button>
          ))}
        </div>
      </div>
    );
  }

  // In library: full control panel
  return (
    <m.div
      initial={justAdded ? { scale: 0.95, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="mt-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <m.div
            initial={justAdded ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check size={16} className="text-green-400" />
          </m.div>
          <span className="text-sm font-medium text-white/70">In Your Library</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setExpanded((e) => !e)}
            className="text-xs text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
            {expanded ? 'Collapse' : 'Edit'}
          </button>
          <button onClick={handleRemove}
            className="text-white/20 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-all" title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Status buttons (always visible) */}
      <div className="px-4 py-3 flex gap-2">
        {([
          { key: 'want', icon: Clock, label: 'Up Next', active: 'bg-purple-500/15 text-purple-400 border-purple-500/40' },
          { key: 'watching', icon: Eye, label: 'In Progress', active: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
          { key: 'finished', icon: CheckCircle2, label: 'Completed', active: 'bg-green-500/15 text-green-400 border-green-500/40' },
        ] as const).map((s) => (
          <button key={s.key} onClick={() => handleStatusChange(s.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all duration-200 ${
              status === s.key ? s.active : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
            }`}>
            <s.icon size={13} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Progress tracking — visible when watching */}
      {expanded && status === 'watching' && (mType === 'tv' || mType === 'movie') && (
        <div className="px-4 pt-1 pb-2">
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">Where Are You?</label>
          {mType === 'tv' ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">S</span>
                <select
                  value={progressSeason}
                  onChange={(e) => { setProgressSeason(Number(e.target.value)); setProgressEpisode(1); }}
                  className="bg-dark-700/50 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-accent/40 transition-colors appearance-none cursor-pointer"
                >
                  {Array.from({ length: totalSeasons || 1 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">E</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={progressEpisode}
                  onChange={(e) => setProgressEpisode(Math.max(1, Number(e.target.value)))}
                  className="bg-dark-700/50 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 w-16 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              <span className="text-xs text-white/20 ml-auto">
                S{progressSeason} E{progressEpisode}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 shrink-0">Timestamp</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={Math.floor(progressTimestamp / 3600)}
                  onChange={(e) => {
                    const h = Math.max(0, Number(e.target.value));
                    setProgressTimestamp(h * 3600 + (progressTimestamp % 3600));
                  }}
                  className="bg-dark-700/50 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 w-14 focus:outline-none focus:border-accent/40 transition-colors"
                />
                <span className="text-white/30 text-sm">h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={Math.floor((progressTimestamp % 3600) / 60)}
                  onChange={(e) => {
                    const m = Math.min(59, Math.max(0, Number(e.target.value)));
                    setProgressTimestamp(Math.floor(progressTimestamp / 3600) * 3600 + m * 60);
                  }}
                  className="bg-dark-700/50 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 w-14 focus:outline-none focus:border-accent/40 transition-colors"
                />
                <span className="text-white/30 text-sm">m</span>
              </div>
              {runtime && runtime > 0 && (
                <span className="text-xs text-white/20 ml-auto">of {Math.floor(runtime / 60)}h {runtime % 60}m</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded: rating + review */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Rating */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">Your Rating</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative h-1.5 rounded-full bg-dark-600">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${(rating / 10) * 100}%`,
                      background: rating > 0 ? getRatingHex(rating) : 'transparent',
                      boxShadow: rating > 0 ? getRatingTrackGlow(rating) : undefined,
                    }}
                  />
                  <input type="range" min="0" max="10" step="0.1" value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value))}
                    className="rating-slider absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent"
                    style={{
                      '--thumb-color': rating > 0 ? getRatingHex(rating) : '#666',
                      '--thumb-glow': rating >= 9.3 ? '20px' : rating >= 8.5 ? '14px' : '12px',
                    } as React.CSSProperties}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/15">0</span>
                  <span className="text-[9px] text-white/15">5</span>
                  <span className="text-[9px] text-white/15">10</span>
                </div>
              </div>
              <div className="text-right min-w-[60px]">
                <span
                  className="text-2xl font-black transition-all duration-200"
                  style={{
                    color: rating > 0 ? getRatingHex(rating) : 'rgba(255,255,255,0.2)',
                    textShadow: rating > 0 ? getRatingTextGlow(rating) : undefined,
                  }}
                >
                  <AnimatedRatingNumber value={rating} />
                </span>
                {rating > 0 && <p className="text-[9px] text-white/30">{getRatingLabel(rating)}</p>}
              </div>
            </div>
            {/* Quick picks */}
            <div className="flex gap-1 mt-2">
              {[5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => (
                <button key={n} onClick={() => setRating(n)}
                  className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                    rating === n ? 'bg-accent text-white' : 'bg-dark-700 text-white/25 hover:bg-dark-600 hover:text-white/50'
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          {/* Review */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">Your Thoughts</label>
            <textarea value={review} onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think? (optional)" rows={2}
              className="w-full bg-dark-700/50 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-accent/40 resize-none transition-colors" />
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-50 transition-all">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </m.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BookDetailView
   ═══════════════════════════════════════════════════════════════════════════ */

function BookDetailView({ workKey }: { workKey: string }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
    getBookDetails(key).then((result: any) => {
      if (!cancelled) { setData(result); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [workKey]);

  useEffect(() => {
    if (!data) return;
    getBookRecommendations(data).then(setRecommendations).catch(() => {});
  }, [data?.key]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="text-center py-20 text-white/40">
        <h3 className="text-lg">Book not found</h3>
      </div>
    );
  }

  const totalReaders = (data.want_to_read || 0) + (data.currently_reading || 0) + (data.already_read || 0);
  const searchQ = encodeURIComponent(`${data.title} book`);
  const isGoogleBook = !!data.google_id;

  return (
    <div>
      {/* Full-bleed gradient hero area */}
      <div className="-mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-6 lg:-mt-4 mb-6">
        <div className="relative min-h-[280px] sm:min-h-[340px] overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-dark-900 to-dark-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(217,119,6,0.06),transparent_60%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0e1117] via-[#0e1117]/80 to-transparent" />

          {/* Back button - positioned over the gradient */}
          <div className="absolute top-4 sm:top-6 left-5 sm:left-8 lg:left-14 xl:left-20 2xl:left-28 z-10">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              <ChevronLeft size={16} strokeWidth={2.5} /> Back
            </button>
          </div>

          {/* Hero content */}
          <div className="relative z-[2] flex items-end min-h-[280px] sm:min-h-[340px] px-5 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 pb-6 sm:pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8 w-full">
              {/* Cover */}
              <FadeInView yOffset={30}>
                <div className="perspective-1000 flex-shrink-0">
                  <div className="relative transition-transform duration-500 hover:rotate-y-[-5deg] hover:rotate-x-[3deg]">
                    <BookCover
                      coverUrls={data.cover_urls || (data.poster_path ? [data.poster_path] : [])}
                      alt={data.title}
                      className="w-40 sm:w-48 md:w-56 max-h-[340px] rounded-xl shadow-2xl shadow-black/60 bg-dark-700 object-contain"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
                  </div>
                </div>
              </FadeInView>

              {/* Title + meta */}
              <div className="min-w-0 flex-1 pb-1">
                <FadeInView delay={0.1}>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white leading-[1.1] mb-2 drop-shadow-lg">{data.title}</h1>
                </FadeInView>

                {data.authors?.length > 0 && (
                  <FadeInView delay={0.15}>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      {data.authors.map((author: any, i: number) => (
                        <a
                          key={author.key || i}
                          href={`https://www.google.com/search?q=${encodeURIComponent(author.name + ' author')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-accent transition-colors"
                        >
                          {author.photo ? (
                            <img src={author.photo} alt={author.name}
                              className="w-7 h-7 rounded-full object-cover border border-white/10" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 text-xs font-bold border border-white/10">
                              {author.name?.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm text-white/50">{author.name}</span>
                          <ExternalLink size={12} className="text-white/20" />
                        </a>
                      ))}
                    </div>
                  </FadeInView>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-white/30">
                  {data.first_publish_date && <span>{data.first_publish_date}</span>}
                  {data.edition_count > 0 && (
                    <>
                      <span className="text-white/15">|</span>
                      <span>{data.edition_count} editions</span>
                    </>
                  )}
                  {data.rating && (
                    <>
                      <span className="text-white/15">|</span>
                      <span className="inline-flex items-center gap-1 font-bold" style={{ color: getRatingHex(Number(data.rating)) }}>
                        <Star size={11} className="fill-current" />
                        {data.rating}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-4xl">
        {/* Rating + Stats cards */}
        <div className="flex flex-wrap items-start gap-3 mb-6">
          {data.rating && (
            <m.a
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              href={isGoogleBook ? data.info_link : `https://openlibrary.org${data.key}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-accent/20 transition-colors"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star size={16} className="fill-current" style={{ color: getRatingHex(Number(data.rating)) }} />
                <span className="text-xl font-black" style={{ color: getRatingHex(Number(data.rating)) }}>{data.rating}</span>
                <span className="text-white/30 text-xs">/ 10</span>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {isGoogleBook ? 'Google Books' : 'Open Library'}
              </p>
              {data.ratings_count > 0 && (
                <p className="text-[9px] text-white/20">{data.ratings_count.toLocaleString()} ratings</p>
              )}
            </m.a>
          )}

          {totalReaders > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users size={14} className="text-accent" />
                <span className="text-lg font-bold">{totalReaders.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-white/30">Readers</p>
            </div>
          )}

          {data.edition_count > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookCopy size={14} className="text-white/50" />
                <span className="text-lg font-bold">{data.edition_count}</span>
              </div>
              <p className="text-[10px] text-white/30">Editions</p>
            </div>
          )}
        </div>

        {/* Reader breakdown (Open Library only) */}
        {!isGoogleBook && totalReaders > 0 && (
          <>
            <div className="flex flex-wrap gap-4 text-xs text-white/40 mb-2">
              {data.want_to_read > 0 && (
                <span className="flex items-center gap-1.5">
                  <BookMarked size={14} className="text-accent/70" />
                  {data.want_to_read.toLocaleString()} want to read
                </span>
              )}
              {data.currently_reading > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye size={14} className="text-blue-400/70" />
                  {data.currently_reading.toLocaleString()} reading now
                </span>
              )}
              {data.already_read > 0 && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-400/70" />
                  {data.already_read.toLocaleString()} have read
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/20 mb-6">Reader data via Open Library</p>
          </>
        )}

        {/* Description */}
        {data.description && (
          <FadeInView delay={0.2}>
            <p className="text-white/55 leading-relaxed mb-6 max-w-2xl whitespace-pre-line text-[15px]">
              {data.description}
            </p>
          </FadeInView>
        )}

        {/* Subjects */}
        {data.subjects?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {data.subjects.map((s: string) => (
              <span key={s} className="text-xs bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-white/40">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Where to Get */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Where to Get</h3>
          <div className="flex flex-wrap gap-2">
            <a href={`https://openlibrary.org${data.key}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
              <BookOpen size={16} className="text-white/60" />
              <span className="text-xs font-medium">Read Free</span>
              <ExternalLink size={12} className="text-white/30" />
            </a>
            <a href={`https://www.amazon.com/s?k=${searchQ}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#ff9900]/10 border border-[#ff9900]/20 rounded-lg px-4 py-2.5 hover:bg-[#ff9900]/20 transition-colors">
              <ShoppingCart size={16} className="text-[#ff9900]" />
              <span className="text-xs font-medium text-[#ff9900]">Amazon</span>
              <ExternalLink size={12} className="text-[#ff9900]/40" />
            </a>
            <a href={`https://www.booktopia.com.au/search?keywords=${searchQ}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
              <ShoppingCart size={16} className="text-white/60" />
              <span className="text-xs font-medium">Booktopia</span>
              <ExternalLink size={12} className="text-white/30" />
            </a>
            <a href={`https://www.goodreads.com/search?q=${searchQ}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
              <Star size={16} className="text-white/60" />
              <span className="text-xs font-medium">Goodreads</span>
              <ExternalLink size={12} className="text-white/30" />
            </a>
          </div>
        </div>

        {/* Fun Facts */}
        <BookFunFacts data={data} isGoogleBook={isGoogleBook} totalReaders={totalReaders} />

        {/* Library Panel */}
        <LibraryPanel
          mediaId={{ openlibrary_key: data.key }}
          addPayload={{
            openlibrary_key: data.key,
            media_type: 'book',
            title: data.title,
            poster_url: data.poster_path,
            external_rating: data.rating,
          }}
        />
      </div>

      {/* Recommendations — full width */}
      {recommendations.length > 0 && (
        <FadeInView>
          <div className="mt-8">
            <ScrollRow title="Books You Might Like">
              {recommendations.map((book: any) => (
                <MediaCard key={book.key} item={book} mediaType="book" />
              ))}
            </ScrollRow>
          </div>
        </FadeInView>
      )}
    </div>
  );
}

function BookFunFacts({ data, isGoogleBook, totalReaders }: { data: any; isGoogleBook: boolean; totalReaders: number }) {
  const facts: string[] = [];

  if (!isGoogleBook) {
    if (data.edition_count >= 50) facts.push(`Published in ${data.edition_count} editions worldwide -- a true global phenomenon.`);
    else if (data.edition_count >= 10) facts.push(`Available in ${data.edition_count} different editions.`);
    if (data.already_read > 10000) facts.push(`Over ${Math.floor(data.already_read / 1000) * 1000} readers have finished this book on Open Library alone.`);
    if (data.currently_reading > 1000) facts.push(`${data.currently_reading.toLocaleString()} people are reading this right now!`);
    if (data.want_to_read > 50000) facts.push(`More than ${Math.floor(data.want_to_read / 1000)}k people have this on their reading list.`);
    if (data.ratings_count > 1000) facts.push(`Rated by ${data.ratings_count.toLocaleString()} readers with an average of ${data.rating}/10.`);
    if (data.first_publish_date) {
      const yearMatch = data.first_publish_date.match(/\d{4}/);
      if (yearMatch) {
        const age = new Date().getFullYear() - parseInt(yearMatch[0]);
        if (age > 100) facts.push(`First published ${age} years ago -- a true classic that has stood the test of time.`);
        else if (age > 50) facts.push(`Published over ${age} years ago and still widely read today.`);
        else if (age <= 2) facts.push(`A brand new release -- one of the latest books to hit shelves.`);
      }
    }
    if (data.subjects?.some((s: string) => s.toLowerCase().includes('new york times'))) facts.push(`A New York Times bestseller.`);
    if (data.subjects?.some((s: string) => s.toLowerCase().includes('pulitzer'))) facts.push(`Pulitzer Prize-related work.`);
    if (data.authors?.length > 2) facts.push(`A collaborative work by ${data.authors.length} authors.`);
  } else {
    if (data.rating) facts.push(`Rated ${data.rating}/10 by ${data.ratings_count} Google Books users.`);
    if (data.first_publish_date) {
      const yearMatch = data.first_publish_date.match(/\d{4}/);
      if (yearMatch) {
        const age = new Date().getFullYear() - parseInt(yearMatch[0]);
        if (age > 100) facts.push(`First published ${age} years ago -- a true classic.`);
        else if (age > 50) facts.push(`Published over ${age} years ago.`);
        else if (age <= 2) facts.push(`A brand new release.`);
      }
    }
    if (data.subjects?.length > 0) facts.push(`Genres: ${data.subjects.join(', ')}`);
    if (data.authors?.length > 2) facts.push(`A collaborative work by ${data.authors.length} authors.`);
  }

  if (facts.length === 0) return null;

  return (
    <FadeInView>
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Lightbulb size={14} className="text-gold" /> Fun Facts
        </h3>
        <div className="space-y-2">
          {facts.slice(0, 4).map((fact, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed">{fact}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeInView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SeasonRatings — combined season breakdown + expandable episodes
   ═══════════════════════════════════════════════════════════════════════════ */

function SeasonRatings({ imdbId, tvId, seasons }: { imdbId: string | null; tvId: number | string; seasons: any[] }) {
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, any[]>>({});
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<Record<number, any[]>>({});
  const [loadingTmdb, setLoadingTmdb] = useState<number | null>(null);

  const regularSeasons = seasons
    .filter((s: any) => s.season_number > 0)
    .sort((a: any, b: any) => a.season_number - b.season_number);

  const totalSeasons = regularSeasons.length;
  const loadedForRef = useRef<string | null>(null);

  // Auto-load all season ratings (OMDb) when imdbId becomes available
  useEffect(() => {
    if (!imdbId || totalSeasons === 0) {
      if (totalSeasons === 0) setLoadingSeasons(false);
      return;
    }
    if (loadedForRef.current === imdbId) return;
    loadedForRef.current = imdbId;

    const seasonNumbers = seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => s.season_number)
      .sort((a: number, b: number) => a - b);

    let cancelled = false;
    setLoadingSeasons(true);

    async function loadAll() {
      const results: Record<number, any[]> = {};
      const BATCH = 4;
      for (let i = 0; i < seasonNumbers.length; i += BATCH) {
        if (cancelled) return;
        const batch = seasonNumbers.slice(i, i + BATCH);
        const settled = await Promise.allSettled(
          batch.map((num) => getOMDbSeasonEpisodes(imdbId!, num).then((eps) => ({ num, eps })))
        );
        for (const r of settled) {
          if (r.status === 'fulfilled' && r.value.eps?.length > 0) {
            results[r.value.num] = r.value.eps;
          }
        }
        if (!cancelled) setEpisodesBySeason({ ...results });
      }
      if (!cancelled) {
        setEpisodesBySeason(results);
        setLoadingSeasons(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [imdbId, totalSeasons]);

  // Load TMDB episode details (thumbnails + descriptions) when a season is expanded
  useEffect(() => {
    if (expandedSeason == null || tmdbEpisodes[expandedSeason]) return;
    let cancelled = false;
    setLoadingTmdb(expandedSeason);
    (async () => {
      try {
        const data = await getTVSeasonDetails(tvId, expandedSeason);
        if (!cancelled && data?.episodes) {
          setTmdbEpisodes((prev) => ({ ...prev, [expandedSeason]: data.episodes }));
        }
      } catch { /* best-effort */ }
      if (!cancelled) setLoadingTmdb(null);
    })();
    return () => { cancelled = true; };
  }, [expandedSeason, tvId]);

  if (totalSeasons === 0) return null;

  const getSeasonAvg = (seasonNumber: number): number | null => {
    const eps = episodesBySeason[seasonNumber];
    if (!eps || eps.length === 0) return null;
    const rated = eps.filter((e: any) => e.imdbRating != null);
    if (rated.length === 0) return null;
    return rated.reduce((sum: number, e: any) => sum + e.imdbRating, 0) / rated.length;
  };

  const getBestEpisode = (seasonNumber: number) => {
    const eps = episodesBySeason[seasonNumber];
    if (!eps) return null;
    const rated = eps.filter((e: any) => e.imdbRating != null);
    if (rated.length === 0) return null;
    return rated.reduce((best: any, e: any) => e.imdbRating > best.imdbRating ? e : best, rated[0]);
  };

  // "Fresh" percentage — episodes rated 7.0+ out of total rated
  const getSeasonFresh = (seasonNumber: number): number | null => {
    const eps = episodesBySeason[seasonNumber];
    if (!eps || eps.length === 0) return null;
    const rated = eps.filter((e: any) => e.imdbRating != null);
    if (rated.length === 0) return null;
    const fresh = rated.filter((e: any) => e.imdbRating >= 7.0).length;
    return Math.round((fresh / rated.length) * 100);
  };

  const ratingBarPct = (rating: number) => Math.max((rating / 10) * 100, 8);

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider flex items-center gap-2">
        <Tv size={14} /> Seasons &amp; Episodes
      </h3>

      <div className="space-y-2">
        {regularSeasons.map((season: any, idx: number) => {
          const seasonAvg = getSeasonAvg(season.season_number);
          const freshPct = getSeasonFresh(season.season_number);
          const omdbEps = episodesBySeason[season.season_number] || [];
          const isExpanded = expandedSeason === season.season_number;
          const bestEp = getBestEpisode(season.season_number);
          const tmdbEps = tmdbEpisodes[season.season_number] || [];
          const isLoadingThisSeason = loadingTmdb === season.season_number;

          return (
            <div
              key={season.id}
              className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-300 ${
                isExpanded ? 'border-white/[0.12]' : 'border-white/[0.06] hover:border-white/[0.1]'
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Season header */}
              <button
                onClick={() => setExpandedSeason(isExpanded ? null : season.season_number)}
                className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 hover:bg-white/[0.02] transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Season {season.season_number}</span>
                    <span className="text-[11px] text-white/25">{season.episode_count} episodes</span>
                    {season.air_date && (
                      <span className="text-[11px] text-white/15">{season.air_date.slice(0, 4)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {seasonAvg != null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#f5c518]/80 bg-[#f5c518]/10 border border-[#f5c518]/20 rounded px-1.5 py-0.5">IMDb</span>
                          <span className="text-base font-black tabular-nums" style={{ color: getRatingHex(seasonAvg) }}>
                            {seasonAvg.toFixed(1)}
                          </span>
                        </div>
                        {freshPct != null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#FA320A]/80 bg-[#FA320A]/10 border border-[#FA320A]/20 rounded px-1.5 py-0.5">RT</span>
                            <span className="text-sm font-bold tabular-nums text-[#FA320A]">
                              {freshPct}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : season.vote_average > 0 && !loadingSeasons ? (
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Star size={12} className="fill-current" style={{ color: getRatingHex(season.vote_average) }} />
                        <span className="text-sm font-bold tabular-nums" style={{ color: getRatingHex(season.vote_average) }}>
                          {season.vote_average.toFixed(1)}
                        </span>
                      </div>
                    ) : loadingSeasons ? (
                      <div className="w-3 h-3 border border-white/10 border-t-accent/50 rounded-full animate-spin" />
                    ) : null}
                    <ChevronDown
                      size={14}
                      className={`text-white/25 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Rating bar */}
                {(() => {
                  const barRating = seasonAvg ?? (season.vote_average > 0 ? season.vote_average : null);
                  if (barRating == null) return null;
                  return (
                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${seasonAvg == null ? 'opacity-70' : ''}`}
                        style={{
                          width: `${ratingBarPct(barRating)}%`,
                          background: getRatingHex(barRating),
                          boxShadow: `0 0 12px ${getRatingHex(barRating)}88, 0 0 4px ${getRatingHex(barRating)}aa`,
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Best episode teaser — collapsed only */}
                {bestEp && !isExpanded && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Award size={10} className="text-accent/60" />
                    <span className="text-[10px] text-white/25 truncate">
                      Best: E{bestEp.number} &ldquo;{bestEp.title}&rdquo;
                      <span className="ml-1 font-bold" style={{ color: getRatingHex(bestEp.imdbRating) }}>
                        {bestEp.imdbRating.toFixed(1)}
                      </span>
                    </span>
                  </div>
                )}
              </button>

              {/* ── Expanded: full episode list with thumbnails ── */}
              {isExpanded && (
                <div className="border-t border-white/[0.05]">
                  {isLoadingThisSeason && tmdbEps.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : tmdbEps.length > 0 ? (
                    <div>
                      {tmdbEps.map((ep: any, i: number) => {
                        const omdbMatch = omdbEps.find((o: any) => o.number === ep.episode_number);
                        const epRating = omdbMatch?.imdbRating ?? (ep.vote_average > 0 ? ep.vote_average : null);
                        const ratingSource = omdbMatch?.imdbRating ? 'imdb' : 'tmdb';

                        return (
                          <div
                            key={ep.id}
                            className={`flex gap-2.5 sm:gap-4 lg:gap-5 py-3 sm:py-5 px-3 sm:px-5 ${i > 0 ? 'border-t border-white/[0.04]' : ''} hover:bg-white/[0.03] transition-colors`}
                          >
                            <div className="shrink-0 w-5 sm:w-7 flex items-center justify-center">
                              <span className="text-base sm:text-xl font-bold text-white/10">{ep.episode_number}</span>
                            </div>
                            <div className="shrink-0 w-[90px] sm:w-[160px] lg:w-[200px] aspect-[16/9] rounded-lg overflow-hidden bg-white/[0.03]">
                              {ep.still_path ? (
                                <img src={`${TMDB_IMG}${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/10"><Play size={20} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-sm font-semibold text-white truncate">{ep.name}</h4>
                                <span className="text-xs text-white/30 shrink-0">{ep.runtime ? `${ep.runtime} min` : ''}</span>
                              </div>
                              {ep.overview && (
                                <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2">{ep.overview}</p>
                              )}
                              {epRating != null && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden max-w-[180px]">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${ratingBarPct(epRating)}%`,
                                        background: getRatingHex(epRating),
                                        boxShadow: `0 0 8px ${getRatingHex(epRating)}40`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {ratingSource === 'imdb' && (
                                      <span className="text-[9px] font-bold text-[#f5c518]/70">IMDb</span>
                                    )}
                                    <Star size={10} className="fill-current" style={{ color: getRatingHex(epRating) }} />
                                    <span className="text-xs font-bold tabular-nums" style={{ color: getRatingHex(epRating) }}>{epRating.toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : omdbEps.length > 0 ? (
                    /* Fallback: OMDb-only list if TMDB episodes not loaded */
                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                      {omdbEps.map((ep: any) => (
                        <div
                          key={ep.imdbID || ep.number}
                          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 hover:bg-white/[0.03] border-b border-white/[0.02] last:border-b-0 transition-colors"
                        >
                          <span className="text-[11px] text-white/15 w-7 flex-shrink-0 tabular-nums font-medium">E{ep.number}</span>
                          <div className="w-16 flex-shrink-0">
                            {ep.imdbRating != null ? (
                              <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${ratingBarPct(ep.imdbRating)}%`,
                                    background: getRatingHex(ep.imdbRating),
                                    boxShadow: `0 0 10px ${getRatingHex(ep.imdbRating)}77`,
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-1 bg-white/[0.04] rounded-full" />
                            )}
                          </div>
                          <span className="text-xs text-white/50 truncate flex-1 min-w-0">{ep.title}</span>
                          {ep.imdbRating != null ? (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Star size={10} className="fill-current" style={{ color: getRatingHex(ep.imdbRating) }} />
                              <span className="text-xs font-bold tabular-nums" style={{ color: getRatingHex(ep.imdbRating) }}>
                                {ep.imdbRating.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/15 flex-shrink-0">N/A</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4">
                      <span className="text-xs text-white/20">No episode details available yet</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MovieTVDetails
   ═══════════════════════════════════════════════════════════════════════════ */

function MovieTVDetails({ mediaType, id }: { mediaType: string; id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [extRatings, setExtRatings] = useState<any>(null);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [malData, setMalData] = useState<any>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [collection, setCollection] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setExtRatings(null);
      setRatingsLoaded(false);
      setMalData(null);
      setCollection(null);
      const fetcher = mediaType === 'movie' ? getMovieDetails : getTVDetails;
      const trendFetcher = mediaType === 'movie' ? getTrendingMovies : getTrendingTV;
      const [result, trendingData] = await Promise.all([fetcher(id), trendFetcher().catch(() => [])]);
      setData(result);
      setTrending(trendingData.filter((t: any) => String(t.id) !== String(id)).slice(0, 20));
      setLoading(false);

      // Fetch franchise/collection data
      if (mediaType === 'movie' && result.belongs_to_collection?.id) {
        getCollectionDetails(result.belongs_to_collection.id)
          .then((col) => setCollection(col))
          .catch(() => {});
      }

      const imdbId = result.external_ids?.imdb_id || result.imdb_id;
      const resultTitle = result.name || result.title;
      const resultYear = (result.release_date || result.first_air_date || '').slice(0, 4);
      if (imdbId) {
        const fetchRatings = async () => {
          let r = await getOMDbRatings(imdbId, resultTitle, mediaType).catch(() => null);
          if (!r) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            r = await getOMDbRatings(imdbId, resultTitle, mediaType).catch(() => null);
          }
          // Validate: if OMDb returned a different year's movie, discard the result
          if (r && r._year && resultYear && Math.abs(parseInt(r._year) - parseInt(resultYear)) > 1) {
            return null;
          }
          return r;
        };
        fetchRatings().then((r) => {
          // Fall back to static scores from scores.json when OMDb fails
          if (!r || (!r.imdb && !r.rt)) {
            const sr = getStaticRatings(mediaType, id);
            if (sr) {
              const merged = r ? { ...r } : {};
              if (!merged.imdb && sr.imdb) merged.imdb = { score: `${sr.imdb}/10` };
              if (!merged.rt && sr.rt) merged.rt = { score: `${sr.rt}%` };
              if (!merged.imdb_id && sr.imdb_id) merged.imdb_id = sr.imdb_id;
              setExtRatings(Object.keys(merged).length > 0 ? merged : null);
            } else {
              setExtRatings(r);
            }
          } else {
            setExtRatings(r);
          }
          setRatingsLoaded(true);
        });
      } else {
        // No IMDb ID from TMDB — still try static scores
        const sr = getStaticRatings(mediaType, id);
        if (sr) {
          const fallback: any = {};
          if (sr.imdb) fallback.imdb = { score: `${sr.imdb}/10` };
          if (sr.rt) fallback.rt = { score: `${sr.rt}%` };
          if (sr.imdb_id) fallback.imdb_id = sr.imdb_id;
          if (Object.keys(fallback).length > 0) setExtRatings(fallback);
        }
        setRatingsLoaded(true);
      }

      const anime = result.original_language === 'ja' &&
        result.genres?.some((g: any) => g.id === 16);
      if (anime) {
        getMALRating(resultTitle).then((r) => setMalData(r));
      }
    }
    load();
  }, [mediaType, id]);

  const isAnime = data
    ? (data.original_language === 'ja' && data.genres?.some((g: any) => g.id === 16))
    : false;
  const avgScore = computeUnifiedRating(extRatings, malData, isAnime);

  // Inline trailer player state
  const [showTrailer, setShowTrailer] = useState(false);

  // Quick-add to watchlist state
  const { user } = useAuth();
  const [quickAdded, setQuickAdded] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [libraryItemId, setLibraryItemId] = useState<string | null>(null);

  useEffect(() => {
    if (avgScore != null && data?.id) {
      setSyllabusScore(mediaType, data.id, avgScore);
    }
  }, [avgScore, data?.id, mediaType]);

  // Streaming modal state
  const [streamModalOpen, setStreamModalOpen] = useState(false);

  // Download modal state
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const { activeDownload, cancelDownload } = useDownload();
  const isThisDownloading = activeDownload != null && activeDownload.tmdbId != null && String(activeDownload.tmdbId) === String(data?.id);
  const dlProgress = isThisDownloading ? activeDownload!.progress : 0;

  // Check if already in library
  useEffect(() => {
    if (!user || !data?.id) return;
    getLibraryItemByMediaId({ tmdb_id: data.id }).then((item) => {
      if (item) {
        setQuickAdded(true);
        setLibraryItemId(item.id);
      }
    }).catch(() => {});
  }, [user, data?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="text-center py-20 text-white/40">
        <h3 className="text-lg">Not found</h3>
      </div>
    );
  }

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || '').slice(0, 4);
  const genres = data.genres?.map((g: any) => g.name).join(', ');
  const recommendations = data.recommendations?.results?.slice(0, 20) || [];
  const imdbId = extRatings?.imdb_id || data.external_ids?.imdb_id;

  // Trailers & videos
  const allVideos = (data.videos?.results || []).filter((v: any) => v.site === 'YouTube');
  const trailer = allVideos.find((v: any) => v.type === 'Trailer' && v.name.toLowerCase().includes('official'))
    || allVideos.find((v: any) => v.type === 'Trailer')
    || allVideos.find((v: any) => v.type === 'Teaser')
    || allVideos[0]
    || null;
  // Deduplicated list: featured trailer first, then others (up to 6 total)
  const videoList = trailer
    ? [trailer, ...allVideos.filter((v: any) => v.key !== trailer.key)].slice(0, 6)
    : allVideos.slice(0, 6);

  // Streaming providers
  const wpData = data['watch/providers']?.results;
  const providers = wpData?.AU || wpData?.US || null;

  // Vibes/Mood tags
  const vibes: string[] = [];
  data.genres?.forEach((g: any) => {
    const gVibes = GENRE_TO_VIBES[g.name];
    if (gVibes) vibes.push(...gVibes);
  });
  const uniqueVibes = [...new Set(vibes)].slice(0, 5);

  const handleQuickAdd = async () => {
    if (!user) return toast('Please log in first', 'error');
    if (quickAdded) return;
    setQuickAdding(true);
    try {
      await addToLibrary({
        tmdb_id: data.id,
        media_type: mediaType,
        title: data.title || data.name,
        poster_url: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
        external_rating: avgScore ? parseFloat(String(avgScore)) : data.vote_average,
        genres: data.genres?.map((g: any) => g.name).join(', '),
        status: 'want',
      });
      setQuickAdded(true);
      toast('Added to watchlist!', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not add';
      if (msg === 'Already in your library') setQuickAdded(true);
      toast(msg, 'error');
    }
    setQuickAdding(false);
  };

  // Cast & crew for More Details cards
  const castList = data.aggregate_credits?.cast || data.credits?.cast || [];
  const crew = data.credits?.crew || [];
  const directors = crew.filter((c: any) => c.job === 'Director').slice(0, 3);
  const starring = castList.slice(0, 5).map((c: any) => c.name).join(', ');

  return (
    <div>
      {/* Full-page transparent backdrop */}
      <HeroBackdrop backdropPath={data.backdrop_path} />

      <div className="h-4" />

      {/* ── Hero Image Container (full-bleed) ── */}
      <div className="px-2 sm:px-4 lg:px-6">
        <FadeInView yOffset={30}>
          <div className="relative w-full aspect-[16/8] sm:aspect-[16/7] lg:aspect-[16/7] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
            {/* Back button — overlaid top-left on hero */}
            <button
              onClick={() => router.back()}
              className="absolute top-3 sm:top-14 left-3 sm:left-4 z-20 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all text-xs sm:text-sm font-medium"
            >
              <ChevronLeft size={16} strokeWidth={2.5} /> Back
            </button>
            {data.backdrop_path ? (
              <img
                src={`${TMDB_IMG_ORIGINAL}${data.backdrop_path}`}
                alt={title}
                className="w-full h-full object-cover object-[center_20%]"
                loading="eager"
              />
            ) : data.poster_path ? (
              <img
                src={`${TMDB_IMG_ORIGINAL}${data.poster_path}`}
                alt={title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/20 text-lg">
                No Image
              </div>
            )}
            {/* Gradient overlays on hero image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

            {/* Title overlaid at bottom-left */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 lg:p-10 z-10">
              <h1 className="font-serif text-2xl sm:text-4xl lg:text-6xl text-white drop-shadow-lg mb-3 sm:mb-4">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Watch Now — primary CTA */}
                <button
                  onClick={() => setStreamModalOpen(true)}
                  className="inline-flex items-center gap-2 sm:gap-2.5 bg-white text-black font-bold text-sm sm:text-base px-5 sm:px-7 py-2.5 sm:py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  <Play size={18} fill="black" className="sm:w-5 sm:h-5" /> Watch Now
                </button>

                {/* Download button / inline progress bar */}
                {isThisDownloading ? (
                  <button
                    onClick={() => setDownloadModalOpen(true)}
                    className="relative inline-flex items-center gap-2 font-semibold text-sm pl-5 pr-5 py-2.5 rounded-lg shadow-lg border border-accent/30 overflow-hidden min-w-[180px] backdrop-blur-sm"
                  >
                    {/* Progress fill */}
                    <m.div
                      className="absolute inset-0 bg-accent/25"
                      initial={{ width: '0%' }}
                      animate={{ width: `${dlProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative z-10 flex items-center gap-2 text-white">
                      {dlProgress >= 100 ? (
                        <>
                          <Check size={16} className="text-green-400" />
                          Complete
                        </>
                      ) : (
                        <>
                          <Download size={16} className="text-accent animate-pulse" />
                          {dlProgress}%
                          {activeDownload!.dlSpeed > 0 && (
                            <span className="text-[11px] text-white/40 font-normal">
                              {activeDownload!.dlSpeed < 1024 * 1024
                                ? `${(activeDownload!.dlSpeed / 1024).toFixed(0)} KB/s`
                                : `${(activeDownload!.dlSpeed / (1024 * 1024)).toFixed(1)} MB/s`}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setDownloadModalOpen(true)}
                    disabled={!imdbId}
                    className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg border bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-white/10"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}

                {trailer && (
                  <button
                    onClick={() => setShowTrailer(!showTrailer)}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shadow-lg border border-white/10"
                  >
                    <Play size={16} className="text-white/80" /> {showTrailer ? 'Close' : 'Trailer'}
                  </button>
                )}

                <button
                  onClick={handleQuickAdd}
                  disabled={quickAdding}
                  className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${
                    quickAdded
                      ? 'border-accent/60 bg-accent/20'
                      : 'border-white/40 bg-white/10 hover:border-white/70 hover:bg-white/20'
                  }`}
                  title={quickAdded ? 'In your watchlist' : 'Add to watchlist'}
                >
                  {quickAdding ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
                  ) : quickAdded ? (
                    <Check size={20} className="text-accent" />
                  ) : (
                    <Plus size={20} className="text-white" />
                  )}
                </button>

                {/* Ratings inline next to Play/Add */}
                <RatingCluster
                  avgScore={avgScore}
                  tmdbScore={data.vote_average}
                  mediaType={mediaType}
                  dataId={data.id}
                  extRatings={extRatings}
                  ratingsLoaded={ratingsLoaded}
                  imdbId={imdbId}
                  isAnime={isAnime}
                  malData={malData}
                  title={title}
                  getSyllabusScore={getSyllabusScore}
                />
              </div>
            </div>
          </div>
        </FadeInView>
      </div>

      {/* ── Inline Trailer Player ── */}
      {showTrailer && trailer && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="px-4 sm:px-6 lg:px-10 mt-6 max-w-7xl mx-auto"
        >
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
              title={trailer.name || 'Trailer'}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </m.div>
      )}

      {/* ── Info Card (glassmorphic) ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-8 max-w-7xl mx-auto">
        <FadeInView delay={0.15}>
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.10] rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:gap-10">
              {/* Left: title, meta, description */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/50 mb-4">
                  {year && <span>{year}</span>}
                  {data.runtime > 0 && (
                    <>
                      <span className="text-white/20">&bull;</span>
                      <span className="text-accent font-semibold text-xs">HD</span>
                      <span className="text-white/20">&bull;</span>
                      <span>{Math.floor(data.runtime / 60)}h {data.runtime % 60}m</span>
                    </>
                  )}
                  {data.number_of_seasons > 0 && (
                    <>
                      <span className="text-white/20">&bull;</span>
                      <span>{data.number_of_seasons} season{data.number_of_seasons > 1 ? 's' : ''}</span>
                    </>
                  )}
                  {genres && (
                    <>
                      <span className="text-white/20">&bull;</span>
                      <span>{genres}</span>
                    </>
                  )}
                </div>
                {data.overview && (
                  <p className="text-white/60 leading-relaxed text-[15px] max-w-2xl">{data.overview}</p>
                )}
              </div>
              {/* Right: starring */}
              {starring && (
                <div className="mt-4 lg:mt-0 lg:w-72 flex-shrink-0">
                  <p className="text-sm text-white/40 mb-1">
                    <span className="font-semibold text-white/60">Starring:</span> {starring}
                  </p>
                  {directors.length > 0 && (
                    <p className="text-sm text-white/40 mt-2">
                      <span className="font-semibold text-white/60">Director:</span> {directors.map((d: any) => d.name).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </FadeInView>
      </div>

      {/* ── Trailers & More ── */}
      {videoList.length > 0 && (
        <div id="trailers" className="px-4 sm:px-6 lg:px-10 mt-8 max-w-7xl mx-auto scroll-mt-16">
          <FadeInView>
            <h3 className="text-xl font-bold text-white mb-4">Trailers & More</h3>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {videoList.map((vid: any) => (
                <a
                  key={vid.key}
                  href={`https://www.youtube.com/watch?v=${vid.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 group/vid"
                >
                  <div className="relative w-[260px] sm:w-[320px] lg:w-[380px] aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-dark-700">
                    <img
                      src={`https://img.youtube.com/vi/${vid.key}/hqdefault.jpg`}
                      alt={vid.name}
                      className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover/vid:bg-black/10 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover/vid:bg-white/30 group-hover/vid:scale-110 transition-all duration-300">
                        <Play size={20} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{vid.type}</span>
                      {vid.official && <span className="text-[9px] font-medium bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Official</span>}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mt-2 max-w-[260px] sm:max-w-[320px] lg:max-w-[380px] truncate group-hover/vid:text-white/70 transition-colors">{vid.name}</p>
                </a>
              ))}
            </div>
          </FadeInView>
        </div>
      )}

      {/* ── More Details (XPrime-style glass grid) ── */}
      <div id="details" className="px-4 sm:px-6 lg:px-10 mt-10 max-w-7xl mx-auto scroll-mt-16">
        <FadeInView>
          <h3 className="text-xl font-bold text-white mb-4">More Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Genres & Info card */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-4">
              {data.genres?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1.5">Genres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.genres.map((g: any) => (
                      <a
                        key={g.id}
                        href={`/search?q=${encodeURIComponent(g.name)}`}
                        className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/60 rounded-full px-2.5 py-1 hover:bg-accent/15 hover:text-accent hover:border-accent/30 transition-colors"
                      >
                        {g.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {data.tagline && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Tagline</p>
                  <p className="text-sm text-white/50 italic">&ldquo;{data.tagline}&rdquo;</p>
                </div>
              )}
              {data.production_companies?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Studio</p>
                  <p className="text-sm text-white/50">
                    {data.production_companies.slice(0, 3).map((c: any, i: number) => (
                      <span key={c.id}>
                        {i > 0 && ', '}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(c.name + ' studio')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors"
                        >
                          {c.name}
                        </a>
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {extRatings?.country && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Country</p>
                  <p className="text-sm text-white/50">{extRatings.country}</p>
                </div>
              )}
            </div>

            {/* Ratings & Awards card */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-4">
              {extRatings?.rated && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Rated</p>
                  <p className="text-sm text-white/50">{extRatings.rated}</p>
                </div>
              )}
              {extRatings?.awards && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Awards</p>
                  <p className="text-sm text-white/50 leading-relaxed">{extRatings.awards}</p>
                </div>
              )}
              {(data.budget > 0 || data.revenue > 0 || extRatings?.boxOffice) && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Box Office</p>
                  {data.budget > 0 && <p className="text-sm text-white/50">Budget: ${(data.budget / 1e6).toFixed(0)}M</p>}
                  {extRatings?.boxOffice && <p className="text-sm text-white/50">Gross: {extRatings.boxOffice}</p>}
                  {data.revenue > 0 && <p className="text-sm text-white/50">Revenue: ${(data.revenue / 1e6).toFixed(0)}M</p>}
                </div>
              )}
              {data.original_language && (
                <div>
                  <p className="text-sm font-semibold text-white/70 mb-1">Language</p>
                  <p className="text-sm text-white/50">{data.original_language.toUpperCase()}</p>
                </div>
              )}
            </div>

            {/* Cast & Crew card */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5">
              <p className="text-sm font-semibold text-white/70 mb-2">Cast</p>
              <div className="flex flex-wrap gap-1 text-sm text-white/50 leading-relaxed">
                {castList.slice(0, 12).map((c: any, i: number) => (
                  <span key={c.id}>
                    {i > 0 && <span className="text-white/20">, </span>}
                    <a
                      href={`/actors/${c.id}`}
                      className="hover:text-accent transition-colors"
                    >
                      {c.name}
                    </a>
                  </span>
                ))}
              </div>

              {/* Directors with profile images */}
              {directors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-white/70 mb-2">Director{directors.length > 1 ? 's' : ''}</p>
                  <div className="space-y-2">
                    {directors.map((d: any) => (
                      <a
                        key={d.id}
                        href={`https://www.google.com/search?q=${encodeURIComponent(d.name + ' filmmaker')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -mx-1 transition-colors"
                      >
                        {d.profile_path ? (
                          <img
                            src={`${TMDB_PROFILE}${d.profile_path}`}
                            alt={d.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                            {d.name?.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm text-white/60 group-hover/crew:text-accent transition-colors">{d.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Writers with profile images */}
              {(() => {
                const writers = crew.filter((c: any) => c.department === 'Writing').slice(0, 3);
                if (writers.length === 0) return null;
                return (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-white/70 mb-2">Writer{writers.length > 1 ? 's' : ''}</p>
                    <div className="space-y-2">
                      {writers.map((w: any) => (
                        <a
                          key={w.id + w.job}
                          href={`https://www.google.com/search?q=${encodeURIComponent(w.name + ' writer')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -mx-1 transition-colors"
                        >
                          {w.profile_path ? (
                            <img
                              src={`${TMDB_PROFILE}${w.profile_path}`}
                              alt={w.name}
                              className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                              {w.name?.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm text-white/60 group-hover/crew:text-accent transition-colors">{w.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </FadeInView>
      </div>

      {/* ── Full Cast Row ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-10 max-w-7xl mx-auto">
        <FadeInView>
          <CastRow cast={castList} />
        </FadeInView>
      </div>

      {/* ── Season Ratings (TV only) ── */}
      {mediaType === 'tv' && data.seasons?.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-7xl mx-auto">
          <FadeInView>
            <SeasonRatings imdbId={imdbId} tvId={data.id} seasons={data.seasons} />
          </FadeInView>
        </div>
      )}


      {/* ── Where to Watch ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-7xl mx-auto">
        <FadeInView>
          <StreamingProviders providers={providers} title={title} />
        </FadeInView>
      </div>

      {/* ── Fun Facts ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-7xl mx-auto">
        <MovieTVFunFacts data={data} extRatings={extRatings} ratingsLoaded={ratingsLoaded} />
      </div>

      {/* ── Library Panel ── */}
      <div id="library-panel" className="px-4 sm:px-6 lg:px-10 mt-2 max-w-7xl mx-auto">
        <LibraryPanel
          mediaId={{ tmdb_id: data.id }}
          addPayload={{
            tmdb_id: data.id,
            media_type: mediaType,
            title: data.title || data.name,
            poster_url: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
            backdrop_url: data.backdrop_path ? `${TMDB_IMG_ORIGINAL}${data.backdrop_path}` : null,
            external_rating: avgScore ? parseFloat(String(avgScore)) : data.vote_average,
            genres: data.genres?.map((g: any) => g.name).join(', '),
          }}
          mediaType={mediaType}
          totalSeasons={data.number_of_seasons}
          totalEpisodes={data.number_of_episodes}
          runtime={data.runtime}
        />
      </div>

      {/* ── Franchise / Collection ── */}
      {collection && collection.parts && collection.parts.length > 1 && (
        <div className="px-4 sm:px-6 lg:px-10 mt-12 pb-6 max-w-7xl mx-auto">
          <FadeInView>
            <FranchiseTimeline
              collection={collection}
              currentMovieId={Number(id)}
              getRatingHex={getRatingHex}
            />
          </FadeInView>
        </div>
      )}

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div id="recommendations" className="px-4 sm:px-6 lg:px-10 mt-12 pb-10 max-w-7xl mx-auto scroll-mt-16">
          <FadeInView>
            <PosterSliderRow title="You Might Also Like" items={recommendations.slice(0, 20)} mediaType={mediaType} getRatingHex={getRatingHex} />
          </FadeInView>
        </div>
      )}

      {/* ── Trending Now ── */}
      {trending.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 mt-8 pb-10 max-w-7xl mx-auto">
          <FadeInView>
            <PosterSliderRow title="Trending Now" items={trending.slice(0, 20)} mediaType={mediaType} getRatingHex={getRatingHex} />
          </FadeInView>
        </div>
      )}

      {/* ── Streaming Modal ── */}
      <StreamingModal
        isOpen={streamModalOpen}
        onClose={() => setStreamModalOpen(false)}
        tmdbId={String(data.id)}
        imdbId={imdbId || ''}
        mediaType={mediaType as 'movie' | 'tv'}
        title={title}
        year={year}
        backdropPath={data.backdrop_path}
        backdropImages={data.images?.backdrops?.slice(0, 8).map((b: any) => b.file_path) || []}
        seasons={mediaType === 'tv' ? data.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => ({
          season_number: s.season_number,
          episode_count: s.episode_count,
        })) : undefined}
        libraryItemId={libraryItemId}
        onStartWatching={() => {
          // Auto-add to library as "watching" if not already added
          if (user && !quickAdded) {
            addToLibrary({
              tmdb_id: data.id,
              media_type: mediaType,
              title: data.title || data.name,
              poster_url: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
              external_rating: avgScore ? parseFloat(String(avgScore)) : data.vote_average,
              genres: data.genres?.map((g: any) => g.name).join(', '),
              status: 'watching',
            }).then((item) => {
              setQuickAdded(true);
              if (item?.id) setLibraryItemId(item.id);
            }).catch(() => {});
          }
        }}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        imdbId={imdbId || ''}
        mediaType={mediaType as 'movie' | 'tv'}
        title={title}
        backdropPath={data.backdrop_path}
        tmdbId={data.id}
        isAnime={isAnime}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PosterSliderRow — Netflix-style poster horizontal slider with arrows
   ═══════════════════════════════════════════════════════════════════════════ */

function FranchiseTimeline({ collection, currentMovieId, getRatingHex }: {
  collection: any;
  currentMovieId: number;
  getRatingHex: (v: number) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const parts = [...(collection.parts || [])]
    .sort((a: any, b: any) => (a.release_date || '').localeCompare(b.release_date || ''));

  const currentIndex = parts.findIndex((p: any) => p.id === currentMovieId);

  // Auto-scroll to current movie on mount
  useEffect(() => {
    if (scrollRef.current && currentIndex > 0) {
      const card = scrollRef.current.children[currentIndex] as HTMLElement;
      if (card) {
        scrollRef.current.scrollTo({
          left: card.offsetLeft - scrollRef.current.offsetWidth / 2 + card.offsetWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  // Find highest rating for the bar chart scale
  const maxRating = Math.max(...parts.map((p: any) => p.vote_average || 0), 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{collection.name}</h2>
          <p className="text-sm text-white/40 mt-0.5">{parts.length} films &middot; Part {currentIndex + 1} of {parts.length}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      >
        {parts.map((part: any, idx: number) => {
          const isCurrent = part.id === currentMovieId;
          const poster = part.poster_path ? `${TMDB_IMG}${part.poster_path}` : null;
          const rating = part.vote_average ? part.vote_average.toFixed(1) : null;
          const year = (part.release_date || '').slice(0, 4);
          const barHeight = rating ? `${(parseFloat(rating) / maxRating) * 100}%` : '0%';
          const isFuture = part.release_date && new Date(part.release_date) > new Date();

          return (
            <Link
              key={part.id}
              href={`/details/movie/${part.id}`}
              className={`group/franchise shrink-0 w-[140px] sm:w-[160px] transition-all duration-200 ${
                isCurrent ? 'scale-[1.02]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {/* Poster */}
              <div className={`relative aspect-[2/3] rounded-lg overflow-hidden ${
                isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0e1117]' : ''
              }`}>
                {poster ? (
                  <img
                    src={poster}
                    alt={part.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/franchise:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-sm p-3 text-center">
                    {part.title}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                {/* Part number badge */}
                <span className="absolute top-2 left-2 text-[10px] font-bold text-white/60 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  {isFuture ? 'TBA' : `#${idx + 1}`}
                </span>

                {/* Rating badge */}
                {rating && !isFuture && (
                  <span
                    className="absolute top-2 right-2 text-[11px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md"
                    style={{
                      color: getRatingHex(parseFloat(rating)),
                      background: `${getRatingHex(parseFloat(rating))}20`,
                      border: `1px solid ${getRatingHex(parseFloat(rating))}30`,
                    }}
                  >
                    {rating}
                  </span>
                )}

                {/* Current indicator */}
                {isCurrent && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-400 bg-blue-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-blue-500/30">
                    VIEWING
                  </span>
                )}
              </div>

              {/* Title & Year */}
              <div className="mt-2 px-0.5">
                <p className={`text-[12px] font-semibold leading-tight line-clamp-2 ${
                  isCurrent ? 'text-white' : 'text-white/70'
                }`}>
                  {part.title}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">{year || 'TBA'}</p>
              </div>

              {/* Rating bar */}
              {rating && !isFuture && (
                <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: barHeight,
                      background: getRatingHex(parseFloat(rating)),
                    }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PosterSliderRow({ title, items, mediaType, getRatingHex }: {
  title: string;
  items: any[];
  mediaType: string;
  getRatingHex: (v: number) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      >
        {items.map((r: any) => {
          const poster = r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null;
          const rating = r.vote_average ? r.vote_average.toFixed(1) : null;
          return (
            <Link
              key={r.id}
              href={`/details/${r.media_type || mediaType}/${r.id}`}
              className="group/poster shrink-0 w-[130px] sm:w-[160px] lg:w-[185px]"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                {poster ? (
                  <img
                    src={poster}
                    alt={r.title || r.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/poster:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/20 text-sm p-3 text-center">
                    {r.title || r.name}
                  </div>
                )}
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                {/* Title at bottom of poster */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2 drop-shadow-lg">
                    {r.title || r.name}
                  </p>
                </div>
                {/* Rating badge top-right */}
                {rating && (
                  <span
                    className="absolute top-2 right-2 text-[11px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md"
                    style={{ color: getRatingHex(parseFloat(rating)), background: `${getRatingHex(parseFloat(rating))}20`, border: `1px solid ${getRatingHex(parseFloat(rating))}30` }}
                  >
                    {rating}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MovieTVFunFacts({ data, extRatings, ratingsLoaded }: { data: any; extRatings: any; ratingsLoaded: boolean }) {
  const facts: string[] = [];
  const releaseYear = parseInt((data.release_date || data.first_air_date || '').slice(0, 4));
  const age = releaseYear ? new Date().getFullYear() - releaseYear : 0;

  if (data.budget > 0 && data.revenue > 0) {
    const ratio = (data.revenue / data.budget).toFixed(0);
    if (data.revenue > data.budget * 10) facts.push(`Made ${ratio}x its budget -- earning $${(data.revenue / 1e6).toFixed(0)}M from a $${(data.budget / 1e6).toFixed(0)}M budget.`);
    else if (data.revenue > data.budget * 3) facts.push(`Earned $${(data.revenue / 1e6).toFixed(0)}M against a $${(data.budget / 1e6).toFixed(0)}M budget -- a ${ratio}x return.`);
    else if (data.revenue < data.budget) facts.push(`Only earned $${(data.revenue / 1e6).toFixed(0)}M against a $${(data.budget / 1e6).toFixed(0)}M budget -- a box office underperformer.`);
  } else if (data.budget > 200e6) {
    facts.push(`Had a massive $${(data.budget / 1e6).toFixed(0)}M production budget.`);
  }

  if (extRatings?.awards) {
    const oscars = extRatings.awards.match(/Won (\d+) Oscar/);
    const noms = extRatings.awards.match(/Nominated for (\d+) Oscar/);
    if (oscars) facts.push(`Won ${oscars[1]} Academy Award${parseInt(oscars[1]) > 1 ? 's' : ''}.`);
    else if (noms) facts.push(`Nominated for ${noms[1]} Academy Award${parseInt(noms[1]) > 1 ? 's' : ''}.`);
    else if (extRatings.awards.includes('win')) facts.push(extRatings.awards);
  }

  if (age > 50) facts.push(`Released ${age} years ago and still beloved -- a true classic.`);
  else if (age > 25) facts.push(`Over ${age} years old and still highly regarded.`);
  else if (age <= 1 && releaseYear) facts.push(`A brand new release from ${releaseYear}.`);

  if (data.vote_count > 20000) facts.push(`Rated by over ${Math.floor(data.vote_count / 1000)}k people on TMDB -- one of the most-reviewed titles.`);
  else if (data.vote_count > 5000) facts.push(`Rated by ${data.vote_count.toLocaleString()} users on TMDB.`);

  if (data.runtime > 180) facts.push(`At ${data.runtime} minutes, this is an epic-length film -- bring snacks.`);
  else if (data.runtime && data.runtime < 90) facts.push(`At just ${data.runtime} minutes, it's a quick but impactful watch.`);

  if (data.number_of_seasons > 10) facts.push(`A long-running series spanning ${data.number_of_seasons} seasons and ${data.number_of_episodes || 'many'} episodes.`);
  else if (data.number_of_seasons === 1 && data.status === 'Ended') facts.push(`A complete story told in just one season -- ${data.number_of_episodes || 'a few'} episodes.`);
  if (data.number_of_episodes > 500) facts.push(`Over ${data.number_of_episodes} episodes have aired!`);

  if (data.original_language && data.original_language !== 'en') {
    const langNames: Record<string, string> = {
      ja: 'Japanese', ko: 'Korean', fr: 'French', es: 'Spanish', de: 'German',
      it: 'Italian', pt: 'Portuguese', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
      ru: 'Russian', sv: 'Swedish', da: 'Danish', th: 'Thai', tl: 'Tagalog',
      pl: 'Polish', nl: 'Dutch', tr: 'Turkish',
    };
    const lang = langNames[data.original_language] || data.original_language.toUpperCase();
    facts.push(`Originally produced in ${lang}.`);
  }

  if (data.production_companies?.length > 3) facts.push(`A joint production between ${data.production_companies.length} studios.`);

  if (facts.length === 0) return null;

  return (
    <FadeInView>
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Lightbulb size={14} className="text-gold" /> Fun Facts
        </h3>
        <div className="space-y-2">
          {facts.slice(0, 5).map((fact, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed">{fact}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeInView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Details Page (router)
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DetailsPage() {
  const params = useParams();
  const mediaType = params.mediaType as string;
  const id = params.id as string;

  if (mediaType === 'book') {
    return <BookDetailView workKey={id} />;
  }

  return <MovieTVDetails mediaType={mediaType} id={id} />;
}
