'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Clock, Eye, CheckCircle2, Play, ExternalLink, Globe, Award,
  DollarSign, Film, Tv, BookOpen, Users, Calendar, X, Heart, Plus, Minus,
  ChevronLeft, Check, Trash2, Info, Sparkles, Lightbulb, ShoppingCart,
  BookCopy, BookMarked, PenLine,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getMovieDetails, getTVDetails } from '@/lib/api/tmdb';
import { getOMDbRatings } from '@/lib/api/omdb';
import { getMALRating } from '@/lib/api/jikan';
import { getBookDetails, getBookRecommendations } from '@/lib/api/books';
import {
  addToLibrary, updateLibraryItem, removeFromLibrary,
  getLibraryItemByMediaId,
} from '@/lib/api/library';
import { computeUnifiedRating, setSyllabusScore, getSyllabusScore } from '@/lib/scoring';
import { TMDB_IMG, TMDB_IMG_ORIGINAL, STREAMING_PROVIDERS } from '@/lib/constants';
import BookCover from '@/components/ui/BookCover';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';

// ─── Image base URLs ───
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

// ─── Provider URL builder ───
const PROVIDER_URLS: Record<string, (title: string) => string> = {
  'Netflix': (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  'Amazon Prime Video': (t) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(t)}`,
  'Amazon Video': (t) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(t)}`,
  'Disney Plus': (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  'Apple TV': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  'Apple TV Plus': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  'Stan': (t) => `https://www.stan.com.au/search?q=${encodeURIComponent(t)}`,
  'Binge': (t) => `https://binge.com.au/search?q=${encodeURIComponent(t)}`,
  'Paramount Plus': (t) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(t)}`,
  'Hulu': (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  'Max': (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'HBO Max': (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'Peacock': (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}`,
  'Crunchyroll': (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  'Google Play Movies': (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`,
  'YouTube': (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
};

function getProviderUrl(providerName: string, title: string, fallbackLink?: string): string {
  for (const [key, urlFn] of Object.entries(PROVIDER_URLS)) {
    if (
      providerName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(providerName.toLowerCase())
    ) {
      return urlFn(title);
    }
  }
  return fallbackLink || '#';
}

// ─── Rating helpers ───
function getRatingColor(val: number): string {
  if (val <= 3) return 'from-red-500 to-red-600';
  if (val <= 5) return 'from-orange-500 to-amber-500';
  if (val <= 7) return 'from-yellow-500 to-lime-500';
  if (val <= 9) return 'from-green-400 to-emerald-500';
  return 'from-emerald-400 to-cyan-400';
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
      toast('Added to library!', 'success');
    } catch (err: any) {
      toast(err?.message === 'Already in your library' ? 'Already in your library' : 'Could not add', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    if (libItem) {
      try {
        await updateLibraryItem(libItem.id, { status: newStatus });
        setLibItem((prev: any) => ({ ...prev, status: newStatus }));
        const labels: Record<string, string> = { want: 'Wishlist', watching: 'In Progress', finished: 'Finished' };
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
            { key: 'watching', icon: Eye, label: 'Watching', cls: 'bg-blue-500 hover:bg-blue-600' },
            { key: 'want', icon: Clock, label: 'Wishlist', cls: 'bg-purple-500 hover:bg-purple-600' },
            { key: 'finished', icon: CheckCircle2, label: 'Finished', cls: 'bg-green-500 hover:bg-green-600' },
          ] as const).map((s) => (
            <button key={s.key} onClick={() => handleAdd(s.key)}
              className={`${s.cls} text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95`}>
              <s.icon size={16} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // In library: full control panel
  return (
    <div className="mt-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Check size={16} className="text-green-400" />
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
          { key: 'want', icon: Clock, label: 'Wishlist', active: 'bg-purple-500 text-white border-purple-400' },
          { key: 'watching', icon: Eye, label: 'In Progress', active: 'bg-blue-500 text-white border-blue-400' },
          { key: 'finished', icon: CheckCircle2, label: 'Finished', active: 'bg-green-500 text-white border-green-400' },
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
                <input type="range" min="0" max="10" step="0.1" value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-dark-600
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-accent/30 [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20" />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/15">0</span>
                  <span className="text-[9px] text-white/15">5</span>
                  <span className="text-[9px] text-white/15">10</span>
                </div>
              </div>
              <div className="text-right min-w-[60px]">
                <span className={`text-2xl font-black bg-gradient-to-r ${rating > 0 ? getRatingColor(rating) : 'from-white/20 to-white/20'} bg-clip-text text-transparent`}>
                  {rating > 0 ? Number(rating).toFixed(1) : '\u2014'}
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
    </div>
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
        <div className="w-full h-full bg-gradient-to-br from-accent/15 via-dark-800 to-dark-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
      </div>

      <button onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-white/50 hover:text-white mb-8 transition-colors">
        <ChevronLeft size={22} strokeWidth={2.5} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <BookCover
          coverUrls={data.cover_urls || (data.poster_path ? [data.poster_path] : [])}
          alt={data.title}
          className="w-48 sm:w-56 md:w-64 max-h-[400px] rounded-2xl shadow-2xl shadow-black/50 flex-shrink-0 bg-dark-700 object-contain"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>

          {/* Authors */}
          {data.authors?.length > 0 && (
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
          )}

          <p className="text-white/40 text-sm mb-5">
            {data.first_publish_date && `First published ${data.first_publish_date}`}
            {data.edition_count > 0 && ` \u00B7 ${data.edition_count} editions`}
          </p>

          {/* Rating + Stats */}
          <div className="flex flex-wrap items-start gap-3 mb-6">
            {data.rating && (
              <a href={isGoogleBook ? data.info_link : `https://openlibrary.org${data.key}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-accent/20 transition-colors">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star size={16} className="text-gold fill-gold" />
                  <span className="text-xl font-black">{data.rating}</span>
                  <span className="text-white/30 text-xs">/ 10</span>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">
                  {isGoogleBook ? 'Google Books' : 'Open Library'}
                </p>
                {data.ratings_count > 0 && (
                  <p className="text-[9px] text-white/20">{data.ratings_count.toLocaleString()} ratings</p>
                )}
              </a>
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
            <p className="text-white/60 leading-relaxed mb-6 max-w-2xl whitespace-pre-line">
              {data.description}
            </p>
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
              overview: data.description?.slice(0, 500) || '',
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

      // Fetch MAL rating for anime
      const anime = result.original_language === 'ja' &&
        result.genres?.some((g: any) => g.id === 16);
      if (anime) {
        getMALRating(resultTitle).then((r) => setMalData(r));
      }
    }
    load();
  }, [mediaType, id]);

  // Compute unified score
  const isAnime = data
    ? (data.original_language === 'ja' && data.genres?.some((g: any) => g.id === 16))
    : false;
  const avgScore = computeUnifiedRating(extRatings, malData, isAnime);

  // Persist Syllabus Score
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
  const recommendations = data.recommendations?.results?.slice(0, 10) || [];
  const imdbId = extRatings?.imdb_id || data.external_ids?.imdb_id;

  // Crew
  const crew = data.credits?.crew || [];
  const directors = crew.filter((c: any) => c.job === 'Director').slice(0, 3);
  const writers = crew.filter((c: any) => c.department === 'Writing').slice(0, 4);

  // Trailer
  const trailer = (() => {
    const vids = (data.videos?.results || []).filter((v: any) => v.site === 'YouTube');
    return vids.find((v: any) => v.type === 'Trailer' && v.name.toLowerCase().includes('official'))
      || vids.find((v: any) => v.type === 'Trailer')
      || vids.find((v: any) => v.type === 'Teaser')
      || vids[0]
      || null;
  })();

  // Streaming providers
  const wpData = data['watch/providers']?.results;
  const providers = wpData?.AU || wpData?.US || null;
  const streamingProviders = providers?.flatrate || [];
  const rentProviders = providers?.rent || [];
  const buyProviders = providers?.buy || [];

  // Quick Facts card
  const quickFactsCard = (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
      {data.tagline && (
        <p className="text-xs italic text-white/40 leading-relaxed">&ldquo;{data.tagline}&rdquo;</p>
      )}
      {directors.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Director</p>
          <div className="space-y-2">
            {directors.map((d: any) => (
              <a key={d.id} href={`https://www.google.com/search?q=${encodeURIComponent(d.name + ' filmmaker')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -m-1 transition-colors">
                {d.profile_path ? (
                  <img src={`${TMDB_PROFILE}${d.profile_path}`} alt={d.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                    {d.name?.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-white/70 group-hover/crew:text-accent transition-colors">{d.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {writers.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Writer</p>
          <div className="space-y-2">
            {writers.map((w: any) => (
              <a key={w.id + w.job} href={`https://www.google.com/search?q=${encodeURIComponent(w.name + ' writer')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -m-1 transition-colors">
                {w.profile_path ? (
                  <img src={`${TMDB_PROFILE}${w.profile_path}`} alt={w.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                    {w.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-xs text-white/70 group-hover/crew:text-accent transition-colors block">{w.name}</span>
                  <span className="text-[10px] text-white/25">{w.job}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {extRatings?.rated && (
        <div className="flex items-start gap-2.5">
          <Film size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Rated</p>
            <p className="text-xs text-white/70">{extRatings.rated}</p>
          </div>
        </div>
      )}
      {extRatings?.awards && (
        <div className="flex items-start gap-2.5">
          <Award size={14} className="text-accent/60 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Awards</p>
            <p className="text-xs text-white/70 leading-relaxed">{extRatings.awards}</p>
          </div>
        </div>
      )}
      {(extRatings?.boxOffice || data.budget > 0 || data.revenue > 0) && (
        <div className="flex items-start gap-2.5">
          <DollarSign size={14} className="text-green-400/60 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Box Office</p>
            {data.budget > 0 && <p className="text-xs text-white/50">Budget: ${(data.budget / 1e6).toFixed(0)}M</p>}
            {extRatings?.boxOffice && <p className="text-xs text-white/70">Gross: {extRatings.boxOffice}</p>}
            {data.revenue > 0 && <p className="text-xs text-white/70">Revenue: ${(data.revenue / 1e6).toFixed(0)}M</p>}
          </div>
        </div>
      )}
      {extRatings?.country && (
        <div className="flex items-start gap-2.5">
          <Globe size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Country</p>
            <p className="text-xs text-white/70">{extRatings.country}</p>
          </div>
        </div>
      )}
      {data.production_companies?.length > 0 && (
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Studio</p>
            <p className="text-xs text-white/70">{data.production_companies.slice(0, 2).map((c: any) => c.name).join(', ')}</p>
          </div>
        </div>
      )}
      {!ratingsLoaded && data.external_ids?.imdb_id && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-3 h-3 bg-dark-600 rounded" />
              <div className="flex-1">
                <div className="h-2 w-10 bg-dark-600 rounded mb-1" />
                <div className="h-3 w-20 bg-dark-600 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Backdrop */}
      {data.backdrop_path && (
        <div className="absolute top-0 left-0 w-full h-80 -z-10 overflow-hidden">
          <img src={`${TMDB_BACKDROP}${data.backdrop_path}`} alt=""
            className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
        </div>
      )}

      <button onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-white/50 hover:text-white mb-8 transition-colors">
        <ChevronLeft size={22} strokeWidth={2.5} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster column -- sticky on desktop */}
        <div className="flex-shrink-0 md:sticky md:top-8 md:self-start w-48 sm:w-56 md:w-64 lg:w-72 xl:w-80">
          {data.poster_path ? (
            <img src={`${TMDB_IMG}${data.poster_path}`} alt={title}
              className="w-full rounded-2xl shadow-2xl shadow-black/50 aspect-[2/3] object-cover" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-2xl bg-dark-700 flex items-center justify-center text-white/30 text-sm">
              No Poster
            </div>
          )}

          {/* Quick Facts card (desktop only) */}
          <div className="hidden md:block mt-4">
            {quickFactsCard}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>

          <p className="text-white/40 text-sm mb-4">
            {year} {genres && `\u00B7 ${genres}`}
            {data.runtime && ` \u00B7 ${data.runtime} min`}
            {data.number_of_seasons && ` \u00B7 ${data.number_of_seasons} season${data.number_of_seasons > 1 ? 's' : ''}`}
          </p>

          {/* Ratings */}
          <div className="flex flex-wrap items-stretch gap-3 mb-6">
            {/* Syllabus Score */}
            {(() => {
              const syllabusScore = avgScore || getSyllabusScore(mediaType, data.id);
              const displayScore = syllabusScore || (data.vote_average ? data.vote_average.toFixed(1) : null);
              const label = syllabusScore ? 'Syllabus Score' : 'TMDB';
              return displayScore ? (
                <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[90px] flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Star size={16} className="text-gold fill-gold" />
                    <span className="text-xl font-black">{displayScore}</span>
                    <span className="text-white/30 text-xs">/ 10</span>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
                </div>
              ) : null;
            })()}

            {/* IMDb */}
            {extRatings?.imdb && (
              <a href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noopener noreferrer"
                className="bg-[#f5c518]/[0.08] border border-[#f5c518]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#f5c518]/[0.15] transition-colors cursor-pointer flex flex-col justify-center">
                <p className="text-xl font-black text-[#f5c518]">{extRatings.imdb.score}</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">IMDb <ExternalLink size={10} /></p>
                {extRatings.imdb.votes && (
                  <p className="text-[9px] text-white/20">{extRatings.imdb.votes} votes</p>
                )}
              </a>
            )}

            {/* Rotten Tomatoes */}
            {extRatings?.rt && (
              <a href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-white/[0.08] transition-colors cursor-pointer flex flex-col justify-center">
                <p className="text-xl font-black">
                  <span className={parseInt(extRatings.rt.score) >= 60 ? 'text-red-400' : 'text-green-400'}>
                    {extRatings.rt.score}
                  </span>
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">Rotten Tomatoes <ExternalLink size={10} /></p>
              </a>
            )}

            {/* MAL (anime only) */}
            {isAnime && malData?.score && (
              <a href={malData.url} target="_blank" rel="noopener noreferrer"
                className="bg-[#2e51a2]/10 border border-[#2e51a2]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#2e51a2]/20 transition-colors flex flex-col justify-center">
                <p className="text-xl font-black text-[#2e51a2]">{malData.score}</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">MAL <ExternalLink size={10} /></p>
                {malData.scored_by && (
                  <p className="text-[9px] text-white/20">{malData.scored_by.toLocaleString()} votes</p>
                )}
              </a>
            )}

            {/* Crunchyroll (anime only) */}
            {isAnime && (
              <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-[#f47521]/10 border border-[#f47521]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#f47521]/20 transition-colors flex flex-col justify-center">
                <p className="text-xl font-black text-[#f47521]">CR</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">Crunchyroll <ExternalLink size={10} /></p>
              </a>
            )}

            {/* Loading shimmer */}
            {!ratingsLoaded && data.external_ids?.imdb_id && (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 text-center min-w-[90px] animate-pulse flex flex-col justify-center">
                <div className="h-5 w-12 bg-dark-600 rounded mx-auto mb-1" />
                <div className="h-2 w-8 bg-dark-600 rounded mx-auto" />
              </div>
            )}
          </div>

          {/* Overview */}
          <p className="text-white/60 leading-relaxed mb-6 max-w-2xl">{data.overview}</p>

          {/* Quick Facts card (mobile only) */}
          <div className="md:hidden mb-6">
            {quickFactsCard}
          </div>

          {/* Trailer */}
          {trailer && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Play size={14} /> Trailer
              </h3>
              <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-dark-700">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                  title={trailer.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <p className="text-[10px] text-white/20 mt-2">{trailer.name}</p>
            </div>
          )}

          {/* Cast */}
          {data.credits?.cast?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Cast</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {data.credits.cast.slice(0, 10).map((actor: any) => (
                  <div
                    key={actor.id}
                    onClick={() => router.push(`/actors/${actor.id}`)}
                    className="flex-shrink-0 w-[90px] group/actor text-center cursor-pointer"
                  >
                    {actor.profile_path ? (
                      <img
                        src={`${TMDB_PROFILE}${actor.profile_path}`}
                        alt={actor.name}
                        className="w-[90px] h-[90px] rounded-full object-cover border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-colors"
                      />
                    ) : (
                      <div className="w-[90px] h-[90px] rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-lg font-bold border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-colors">
                        {actor.name?.charAt(0)}
                      </div>
                    )}
                    <p className="text-xs font-medium mt-2 truncate group-hover/actor:text-accent transition-colors">{actor.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Where to Watch */}
          {(streamingProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0) && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Where to Watch</h3>
              <div className="space-y-3">
                {streamingProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Stream</p>
                    <div className="flex flex-wrap gap-2">
                      {streamingProviders.map((p: any) => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-6 h-6 rounded object-cover" />}
                          <span className="text-xs font-medium">{p.provider_name}</span>
                          <ExternalLink size={11} className="text-white/20" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {rentProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Rent</p>
                    <div className="flex flex-wrap gap-2">
                      {rentProviders.slice(0, 6).map((p: any) => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-5 h-5 rounded object-cover" />}
                          <span className="text-xs text-white/60">{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {buyProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Buy</p>
                    <div className="flex flex-wrap gap-2">
                      {buyProviders.slice(0, 6).map((p: any) => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-5 h-5 rounded object-cover" />}
                          <span className="text-xs text-white/60">{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fun Facts */}
          <MovieTVFunFacts data={data} extRatings={extRatings} ratingsLoaded={ratingsLoaded} />

          {/* Library Panel */}
          <LibraryPanel
            mediaId={{ tmdb_id: data.id }}
            addPayload={{
              tmdb_id: data.id,
              media_type: mediaType,
              title: data.title || data.name,
              poster_url: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
              overview: data.overview,
              external_rating: avgScore ? parseFloat(String(avgScore)) : data.vote_average,
              genres: data.genres?.map((g: any) => g.name).join(', '),
              release_date: data.release_date || data.first_air_date,
            }}
          />
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {recommendations.map((r: any) => (
              <MediaCard key={r.id} item={r} mediaType={mediaType as 'movie' | 'tv'} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MovieTVFunFacts({ data, extRatings, ratingsLoaded }: { data: any; extRatings: any; ratingsLoaded: boolean }) {
  const facts: string[] = [];
  const releaseYear = parseInt((data.release_date || data.first_air_date || '').slice(0, 4));
  const age = releaseYear ? new Date().getFullYear() - releaseYear : 0;

  // Budget & revenue facts
  if (data.budget > 0 && data.revenue > 0) {
    const ratio = (data.revenue / data.budget).toFixed(0);
    if (data.revenue > data.budget * 10) facts.push(`Made ${ratio}x its budget -- earning $${(data.revenue / 1e6).toFixed(0)}M from a $${(data.budget / 1e6).toFixed(0)}M budget.`);
    else if (data.revenue > data.budget * 3) facts.push(`Earned $${(data.revenue / 1e6).toFixed(0)}M against a $${(data.budget / 1e6).toFixed(0)}M budget -- a ${ratio}x return.`);
    else if (data.revenue < data.budget) facts.push(`Only earned $${(data.revenue / 1e6).toFixed(0)}M against a $${(data.budget / 1e6).toFixed(0)}M budget -- a box office underperformer.`);
  } else if (data.budget > 200e6) {
    facts.push(`Had a massive $${(data.budget / 1e6).toFixed(0)}M production budget.`);
  }

  // Awards
  if (extRatings?.awards) {
    const oscars = extRatings.awards.match(/Won (\d+) Oscar/);
    const noms = extRatings.awards.match(/Nominated for (\d+) Oscar/);
    if (oscars) facts.push(`Won ${oscars[1]} Academy Award${parseInt(oscars[1]) > 1 ? 's' : ''}.`);
    else if (noms) facts.push(`Nominated for ${noms[1]} Academy Award${parseInt(noms[1]) > 1 ? 's' : ''}.`);
    else if (extRatings.awards.includes('win')) facts.push(extRatings.awards);
  }

  // Age & classic status
  if (age > 50) facts.push(`Released ${age} years ago and still beloved -- a true classic.`);
  else if (age > 25) facts.push(`Over ${age} years old and still highly regarded.`);
  else if (age <= 1 && releaseYear) facts.push(`A brand new release from ${releaseYear}.`);

  // Popularity & votes
  if (data.vote_count > 20000) facts.push(`Rated by over ${Math.floor(data.vote_count / 1000)}k people on TMDB -- one of the most-reviewed titles.`);
  else if (data.vote_count > 5000) facts.push(`Rated by ${data.vote_count.toLocaleString()} users on TMDB.`);

  // Runtime
  if (data.runtime > 180) facts.push(`At ${data.runtime} minutes, this is an epic-length film -- bring snacks.`);
  else if (data.runtime && data.runtime < 90) facts.push(`At just ${data.runtime} minutes, it's a quick but impactful watch.`);

  // TV-specific
  if (data.number_of_seasons > 10) facts.push(`A long-running series spanning ${data.number_of_seasons} seasons and ${data.number_of_episodes || 'many'} episodes.`);
  else if (data.number_of_seasons === 1 && data.status === 'Ended') facts.push(`A complete story told in just one season -- ${data.number_of_episodes || 'a few'} episodes.`);
  if (data.number_of_episodes > 500) facts.push(`Over ${data.number_of_episodes} episodes have aired!`);

  // Language / country
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

  // Production companies
  if (data.production_companies?.length > 3) facts.push(`A joint production between ${data.production_companies.length} studios.`);

  if (facts.length === 0) return null;

  return (
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
