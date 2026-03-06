'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Clock, Eye, CheckCircle2, Play, ExternalLink, Globe, Award,
  DollarSign, Film, Tv, BookOpen, Users, Calendar, X, Heart, Plus, Minus,
  ChevronLeft, Check, Trash2, Info, Sparkles, Lightbulb, ShoppingCart,
  BookCopy, BookMarked, PenLine,
} from 'lucide-react';
import { m, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getMovieDetails, getTVDetails } from '@/lib/api/tmdb';
import { getOMDbRatings, getOMDbSeasonEpisodes } from '@/lib/api/omdb';
import { getMALRating } from '@/lib/api/jikan';
import { getBookDetails, getBookRecommendations } from '@/lib/api/books';
import {
  addToLibrary, updateLibraryItem, removeFromLibrary,
  getLibraryItemByMediaId,
} from '@/lib/api/library';
import { computeUnifiedRating, setSyllabusScore, getSyllabusScore } from '@/lib/scoring';
import { TMDB_IMG, TMDB_IMG_ORIGINAL, STREAMING_PROVIDERS, SCENARIO_KEYWORDS } from '@/lib/constants';
import BookCover from '@/components/ui/BookCover';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { FadeInView } from '@/components/motion/FadeInView';
import HeroBackdrop from '@/components/details/HeroBackdrop';
import RatingCluster from '@/components/details/RatingCluster';
import CastRow from '@/components/details/CastRow';
import StreamingProviders from '@/components/details/StreamingProviders';
import QuickFactsCard from '@/components/details/QuickFactsCard';
import { getRatingHex, getRatingTextGlow, getRatingTrackGlow } from '@/lib/utils/rating-colors';

// ─── Image base URLs ───
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
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
}

function LibraryPanel({ mediaId, addPayload }: LibraryPanelProps) {
  const [libItem, setLibItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('watching');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
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
            { key: 'watching', icon: Eye, label: 'In Progress', cls: 'bg-blue-500 hover:bg-blue-600' },
            { key: 'want', icon: Clock, label: 'Up Next', cls: 'bg-purple-500 hover:bg-purple-600' },
            { key: 'finished', icon: CheckCircle2, label: 'Completed', cls: 'bg-green-500 hover:bg-green-600' },
          ] as const).map((s) => (
            <m.button
              key={s.key}
              onClick={() => handleAdd(s.key)}
              whileTap={{ scale: 0.95 }}
              className={`${s.cls} text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]`}
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
          { key: 'want', icon: Clock, label: 'Up Next', active: 'bg-purple-500 text-white border-purple-400' },
          { key: 'watching', icon: Eye, label: 'In Progress', active: 'bg-blue-500 text-white border-blue-400' },
          { key: 'finished', icon: CheckCircle2, label: 'Completed', active: 'bg-green-500 text-white border-green-400' },
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
      {/* Gradient backdrop */}
      <div className="absolute top-0 left-0 w-full h-80 -z-10 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-amber-warm/15 via-dark-800 to-dark-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
      </div>

      <button onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-white/50 hover:text-white mb-8 transition-colors">
        <ChevronLeft size={22} strokeWidth={2.5} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover with 3D tilt */}
        <FadeInView yOffset={30}>
          <div className="perspective-1000 flex-shrink-0">
            <div className="transition-transform duration-500 hover:rotate-y-[-5deg] hover:rotate-x-[3deg]">
              <BookCover
                coverUrls={data.cover_urls || (data.poster_path ? [data.poster_path] : [])}
                alt={data.title}
                className="w-48 sm:w-56 md:w-64 max-h-[400px] rounded-2xl shadow-2xl shadow-black/50 bg-dark-700 object-contain book-shadow"
              />
            </div>
          </div>
        </FadeInView>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <FadeInView delay={0.1}>
            <h1 className="font-serif text-3xl md:text-4xl mb-2">{data.title}</h1>
          </FadeInView>

          {/* Authors */}
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
                      <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-white/30 text-xs font-bold border border-white/10">
                        {author.name?.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-white/60">{author.name}</span>
                    <ExternalLink size={12} className="text-white/20" />
                  </a>
                ))}
              </div>
            </FadeInView>
          )}

          <p className="text-white/40 text-sm mb-5">
            {data.first_publish_date && `First published ${data.first_publish_date}`}
            {data.edition_count > 0 && ` \u00B7 ${data.edition_count} editions`}
          </p>

          {/* Rating + Stats */}
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
              <div className="flex flex-wrap gap-4 text-xs text-white/40 mb-4">
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
              <p className="text-white/60 leading-relaxed mb-6 max-w-2xl whitespace-pre-line">
                {data.description}
              </p>
            </FadeInView>
          )}

          {/* Subjects */}
          {data.subjects?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {data.subjects.map((s: string) => (
                <span key={s} className="text-xs bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-white/50">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Books You Might Like */}
          {recommendations.length > 0 && (
            <FadeInView>
              <div className="mt-6 mb-6">
                <h3 className="text-lg font-semibold mb-3">Books You Might Like</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recommendations.map((book: any) => (
                    <div key={book.key} className="flex-shrink-0 w-[130px]">
                      <MediaCard item={book} mediaType="book" />
                    </div>
                  ))}
                </div>
              </div>
            </FadeInView>
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
      </div>
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
   SeasonRatings — per-season rating breakdown for TV shows
   ═══════════════════════════════════════════════════════════════════════════ */

function SeasonRatings({ imdbId, seasons }: { imdbId: string | null; seasons: any[] }) {
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, any[]>>({});
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  // Filter out "Specials" (season 0) and sort by season number
  const regularSeasons = seasons
    .filter((s: any) => s.season_number > 0)
    .sort((a: any, b: any) => a.season_number - b.season_number);

  const totalSeasons = regularSeasons.length;

  // Track which imdbId we've already started loading for
  const loadedForRef = useRef<string | null>(null);

  // Auto-load all season ratings when imdbId becomes available
  useEffect(() => {
    if (!imdbId || totalSeasons === 0) {
      if (totalSeasons === 0) setLoadingSeasons(false);
      return;
    }

    // Don't restart if we already loaded/are loading for this same imdbId
    if (loadedForRef.current === imdbId) return;
    loadedForRef.current = imdbId;

    const seasonNumbers = seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => s.season_number)
      .sort((a: number, b: number) => a - b);

    let cancelled = false;
    setLoadingSeasons(true);
    setLoadedCount(0);

    async function loadAll() {
      const results: Record<number, any[]> = {};
      let count = 0;
      for (const num of seasonNumbers) {
        if (cancelled) return;
        try {
          const episodes = await getOMDbSeasonEpisodes(imdbId!, num);
          if (episodes && episodes.length > 0) results[num] = episodes;
        } catch { /* skip */ }
        count++;
        if (!cancelled) {
          setLoadedCount(count);
          setEpisodesBySeason({ ...results });
        }
      }
      if (!cancelled) {
        setEpisodesBySeason(results);
        setLoadingSeasons(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [imdbId, totalSeasons]);

  if (totalSeasons === 0) return null;

  // Compute average IMDb rating for a season
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

  const ratingBarPct = (rating: number) => Math.max((rating / 10) * 100, 8);

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider flex items-center gap-2">
        <Tv size={14} /> Season Breakdown
      </h3>

      <div className="space-y-2">
        {regularSeasons.map((season: any, idx: number) => {
          const seasonAvg = getSeasonAvg(season.season_number);
          const episodes = episodesBySeason[season.season_number] || [];
          const isExpanded = expandedSeason === season.season_number;
          const bestEp = getBestEpisode(season.season_number);
          const hasLoaded = episodes.length > 0;

          return (
            <div
              key={season.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all duration-300"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Season header */}
              <button
                onClick={() => setExpandedSeason(isExpanded ? null : season.season_number)}
                className="w-full text-left px-4 py-3.5 hover:bg-white/[0.02] transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Season {season.season_number}</span>
                    <span className="text-[11px] text-white/25">{season.episode_count} episodes</span>
                    {season.air_date && (
                      <span className="text-[11px] text-white/15">{season.air_date.slice(0, 4)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {seasonAvg != null ? (
                      <div className="flex items-center gap-1.5">
                        <Star size={13} className="fill-current" style={{ color: getRatingHex(seasonAvg) }} />
                        <span className="text-base font-black tabular-nums" style={{ color: getRatingHex(seasonAvg) }}>
                          {seasonAvg.toFixed(1)}
                        </span>
                      </div>
                    ) : season.vote_average > 0 && !loadingSeasons ? (
                      <div className="flex items-center gap-1.5">
                        <Star size={12} className="fill-current" style={{ color: getRatingHex(season.vote_average), opacity: 0.7 }} />
                        <span className="text-sm font-bold tabular-nums" style={{ color: getRatingHex(season.vote_average), opacity: 0.7 }}>
                          {season.vote_average.toFixed(1)}
                        </span>
                        <span className="text-[8px] text-white/20">TMDB</span>
                      </div>
                    ) : loadingSeasons ? (
                      <div className="w-3 h-3 border border-white/10 border-t-accent/50 rounded-full animate-spin" />
                    ) : null}
                    <ChevronLeft
                      size={14}
                      className={`text-white/25 transition-transform duration-200 ${isExpanded ? '-rotate-90' : ''}`}
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

                {/* Best episode teaser */}
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

              {/* Expanded episode list */}
              {isExpanded && episodes.length === 0 && !loadingSeasons && (
                <div className="border-t border-white/[0.04] px-4 py-3">
                  <span className="text-xs text-white/20">No episode ratings available yet</span>
                </div>
              )}
              {isExpanded && episodes.length > 0 && (
                <div className="border-t border-white/[0.04] max-h-[350px] overflow-y-auto scrollbar-hide">
                  {episodes.map((ep: any) => (
                    <div
                      key={ep.imdbID || ep.number}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] border-b border-white/[0.02] last:border-b-0 transition-colors"
                    >
                      <span className="text-[11px] text-white/15 w-7 flex-shrink-0 tabular-nums font-medium">E{ep.number}</span>

                      {/* Mini rating bar */}
                      <div className="w-16 flex-shrink-0">
                        {ep.imdbRating != null ? (
                          <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ratingBarPct(ep.imdbRating)}%`,
                                background: getRatingHex(ep.imdbRating),
                                boxShadow: `0 0 10px ${getRatingHex(ep.imdbRating)}77, 0 0 3px ${getRatingHex(ep.imdbRating)}99`,
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setExtRatings(null);
      setRatingsLoaded(false);
      setMalData(null);
      const fetcher = mediaType === 'movie' ? getMovieDetails : getTVDetails;
      const result = await fetcher(id);
      setData(result);
      setLoading(false);

      const imdbId = result.external_ids?.imdb_id || result.imdb_id;
      const resultTitle = result.name || result.title;
      if (imdbId) {
        const fetchRatings = async () => {
          let r = await getOMDbRatings(imdbId, resultTitle, mediaType).catch(() => null);
          if (!r) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            r = await getOMDbRatings(imdbId, resultTitle, mediaType).catch(() => null);
          }
          return r;
        };
        fetchRatings().then((r) => { setExtRatings(r); setRatingsLoaded(true); });
      } else {
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

  useEffect(() => {
    if (avgScore != null && data?.id) {
      setSyllabusScore(mediaType, data.id, avgScore);
    }
  }, [avgScore, data?.id, mediaType]);

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

  // Inline trailer player state
  const [showTrailer, setShowTrailer] = useState(false);

  // Quick-add to watchlist state
  const { user } = useAuth();
  const [quickAdded, setQuickAdded] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);

  // Check if already in library
  useEffect(() => {
    if (!user || !data?.id) return;
    getLibraryItemByMediaId({ tmdb_id: data.id }).then((item) => {
      if (item) setQuickAdded(true);
    }).catch(() => {});
  }, [user, data?.id]);

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
        status: 'plan_to_watch',
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
    <div className="-mx-4 sm:-mx-6 lg:-mx-10 -my-6 lg:-my-8">
      {/* Full-page transparent backdrop */}
      <HeroBackdrop backdropPath={data.backdrop_path} />

      {/* Back button */}
      <div className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-white/50 hover:text-white mb-4 transition-colors relative z-10">
          <ChevronLeft size={22} strokeWidth={2.5} /> Back
        </button>
      </div>

      {/* ── Hero Image Container ── */}
      <div className="px-4 sm:px-6 lg:px-10">
        <FadeInView yOffset={30}>
          <div className="relative w-full max-w-6xl mx-auto aspect-[16/8] sm:aspect-[16/7] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Title overlay at bottom-left */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-6xl text-white drop-shadow-lg mb-3">{title}</h1>
            </div>
          </div>
        </FadeInView>
      </div>

      {/* ── Play / Add / Ratings Row ── */}
      <FadeInView delay={0.1}>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
          {trailer && (
            <button
              onClick={() => setShowTrailer(!showTrailer)}
              className="inline-flex items-center gap-2.5 bg-white text-black font-bold text-base px-8 py-3.5 rounded-lg hover:bg-white/90 transition-colors shadow-lg"
            >
              <Play size={20} fill="black" /> {showTrailer ? 'Close' : 'Play'}
            </button>
          )}
          <button
            onClick={handleQuickAdd}
            disabled={quickAdded || quickAdding}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              quickAdded
                ? 'border-accent/60 bg-accent/10'
                : 'border-white/30 hover:border-white/60'
            }`}
            title={quickAdded ? 'In your watchlist' : 'Add to watchlist'}
          >
            {quickAdding ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
            ) : quickAdded ? (
              <Check size={22} className="text-accent" />
            ) : (
              <Plus size={22} className="text-white/80" />
            )}
          </button>

          {/* Ratings inline */}
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
      </FadeInView>

      {/* ── Inline Trailer Player ── */}
      {showTrailer && trailer && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="px-4 sm:px-6 lg:px-10 mt-6 max-w-5xl mx-auto"
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
      <div className="px-4 sm:px-6 lg:px-10 mt-8 max-w-6xl mx-auto">
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
        <div className="px-4 sm:px-6 lg:px-10 mt-8 max-w-6xl mx-auto">
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
                  <div className="relative w-[320px] sm:w-[380px] aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-dark-700">
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
                  <p className="text-xs text-white/50 mt-2 max-w-[320px] sm:max-w-[380px] truncate group-hover/vid:text-white/70 transition-colors">{vid.name}</p>
                </a>
              ))}
            </div>
          </FadeInView>
        </div>
      )}

      {/* ── More Details (XPrime-style glass grid) ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-10 max-w-6xl mx-auto">
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
      <div className="px-4 sm:px-6 lg:px-10 mt-10 max-w-6xl mx-auto">
        <FadeInView>
          <CastRow cast={castList} />
        </FadeInView>
      </div>

      {/* ── Season Ratings (TV only) ── */}
      {mediaType === 'tv' && data.seasons?.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-6xl mx-auto">
          <FadeInView>
            <SeasonRatings imdbId={imdbId} seasons={data.seasons} />
          </FadeInView>
        </div>
      )}

      {/* ── Where to Watch ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-6xl mx-auto">
        <FadeInView>
          <StreamingProviders providers={providers} title={title} />
        </FadeInView>
      </div>

      {/* ── Fun Facts ── */}
      <div className="px-4 sm:px-6 lg:px-10 mt-2 max-w-6xl mx-auto">
        <MovieTVFunFacts data={data} extRatings={extRatings} ratingsLoaded={ratingsLoaded} />
      </div>

      {/* ── Library Panel ── */}
      <div id="library-panel" className="px-4 sm:px-6 lg:px-10 mt-2 max-w-6xl mx-auto">
        <LibraryPanel
          mediaId={{ tmdb_id: data.id }}
          addPayload={{
            tmdb_id: data.id,
            media_type: mediaType,
            title: data.title || data.name,
            poster_url: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
            external_rating: avgScore ? parseFloat(String(avgScore)) : data.vote_average,
            genres: data.genres?.map((g: any) => g.name).join(', '),
          }}
        />
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 mt-12 pb-10 max-w-6xl mx-auto">
          <FadeInView>
            <ScrollRow title="You Might Also Like">
              {recommendations.map((r: any) => (
                <div key={r.id} className="flex-shrink-0 w-[150px]">
                  <MediaCard item={r} mediaType={mediaType as 'movie' | 'tv'} />
                </div>
              ))}
            </ScrollRow>
          </FadeInView>
        </div>
      )}
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
