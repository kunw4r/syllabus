'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Settings, Users, Heart, Star, Film, Tv, BookOpen, Library,
  CheckCircle2, Eye, Clock, TrendingUp, Edit3, X, Check, UserPlus,
  UserMinus, Activity, Sparkles, Shuffle, ChevronRight, ExternalLink, LogOut,
  Search, ArrowUpDown, Trash2, Share2, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import {
  getProfile, getMyProfile, updateProfile, getFollowers, getFollowing,
  isFollowing as checkIsFollowing, followUser, unfollowUser, getMyActivity,
  getFriendLibrary, getBlend, getDiscoverWeekly,
} from '@/lib/api/social';
import { getLibrary, updateLibraryItem, removeFromLibrary } from '@/lib/api/library';
import { uploadAvatar, isDataUrl } from '@/lib/api/avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { TMDB_IMG } from '@/lib/constants';
import AvatarPicker from './AvatarPicker';
import { getRatingHex, getRatingBg, getRatingGlow } from '@/lib/utils/rating-colors';

// ─── Types ───

interface ProfileData {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  [key: string]: any;
}

interface PersonData {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  [key: string]: any;
}

interface ActivityItem {
  id: string;
  action: string;
  title: string;
  rating?: number;
  media_type?: string;
  media_id?: string;
  poster_url?: string;
  created_at: string;
  [key: string]: any;
}

interface LibraryItem {
  id: string;
  title: string;
  media_type?: string;
  status?: string;
  poster_url?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
  user_rating?: number;
  genres?: string;
  [key: string]: any;
}

interface BlendData {
  friendId: string;
  shared: any[];
  sharedGenres: { genre: string; overlap: number }[];
  compatibility: number;
  blendRecs: any[];
  myCount: number;
  friendCount: number;
}

interface EditFormData extends Record<string, any> {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

interface StatsData {
  total: number;
  finished: number;
  watching: number;
  want: number;
  movies: number;
  tv: number;
  books: number;
  avgRating: string | null;
  rated: number;
  topGenres: [string, number][];
}

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PlusIcon({ size = 16, ...p }: { size?: number; [key: string]: any }) {
  return <span style={{ fontSize: size }} {...p}>+</span>;
}

function MessageSquareIcon({ size = 16, ...p }: { size?: number; [key: string]: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

// ─── BarChart alias (re-uses TrendingUp) ───

function BarChart({ size = 16, ...p }: { size?: number; [key: string]: any }) {
  return <TrendingUp size={size} {...p} />;
}

// ─── StatCard ───

function StatCard({ icon: Icon, label, value, color = 'text-white', onClick }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon size={18} className={color} />
      </div>
      <div>
        <span className="text-xl font-black text-white block leading-tight">{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/25">{label}</span>
      </div>
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab({ stats, activity, isOwnProfile, discoverWeekly, onNavigateLibrary }: {
  stats: StatsData;
  activity: ActivityItem[];
  isOwnProfile: boolean;
  discoverWeekly: any[];
  onNavigateLibrary: (filter?: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Stats grid — clickable to filter library */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Library} label="Total" value={stats.total} color="text-accent" onClick={() => onNavigateLibrary()} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.finished} color="text-green-400" onClick={() => onNavigateLibrary('finished')} />
        <StatCard icon={Eye} label="In Progress" value={stats.watching} color="text-blue-400" onClick={() => onNavigateLibrary('watching')} />
        <StatCard icon={Clock} label="Up Next" value={stats.want} color="text-purple-400" onClick={() => onNavigateLibrary('want')} />
        <StatCard icon={Film} label="Movies" value={stats.movies} color="text-rose-400" onClick={() => onNavigateLibrary('movie')} />
        <StatCard icon={Tv} label="TV Shows" value={stats.tv} color="text-cyan-400" onClick={() => onNavigateLibrary('tv')} />
        <StatCard icon={BookOpen} label="Books" value={stats.books} color="text-amber-400" onClick={() => onNavigateLibrary('book')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rating stats */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold/[0.06] rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Star size={14} className="text-gold" /> Rating Stats
          </h3>
          {stats.avgRating ? (
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={getRatingHex(Number(stats.avgRating))} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Number(stats.avgRating) * 9.74} 100`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: getRatingHex(Number(stats.avgRating)) }}>{stats.avgRating}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/50">Average Rating</p>
                <p className="text-xs text-white/25 mt-1">{stats.rated} items rated</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                <Star size={24} className="text-white/[0.08]" />
              </div>
              <div>
                <p className="text-sm text-white/30">Rate items to see stats</p>
                {isOwnProfile && (
                  <button onClick={() => onNavigateLibrary()} className="text-xs text-accent hover:text-accent/80 mt-1 transition-colors">
                    Go to Library →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top genres */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent/[0.06] rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" /> Top Genres
          </h3>
          {stats.topGenres.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topGenres.map(([genre, count], idx) => (
                <div key={genre} className="flex items-center gap-3">
                  <span className={`text-xs font-black w-5 text-center ${idx === 0 ? 'text-accent' : 'text-white/20'}`}>{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70 font-medium">{genre}</span>
                      <span className="text-[11px] text-white/30 font-mono">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-accent/70' : 'bg-white/15'}`} style={{ width: `${(count / stats.topGenres[0][1]) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                <TrendingUp size={20} className="text-white/[0.08]" />
              </div>
              <div>
                <p className="text-sm text-white/30">Add items to see genres</p>
                {isOwnProfile && (
                  <button onClick={() => router.push('/')} className="text-xs text-accent hover:text-accent/80 mt-1 transition-colors">
                    Discover Movies →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white/40 mb-5 flex items-center gap-2">
            <Activity size={14} className="text-accent" /> Recent Activity
          </h3>
          <div className="space-y-1">
            {activity.slice(0, 10).map(a => {
              const actionColor = a.action === 'added' ? 'bg-green-500/15 text-green-400' :
                a.action === 'rated' ? 'bg-amber-500/15 text-gold' :
                a.action === 'reviewed' ? 'bg-blue-500/15 text-blue-400' :
                a.action === 'followed' ? 'bg-accent/15 text-accent' :
                a.action === 'finished' ? 'bg-emerald-500/15 text-emerald-400' :
                'bg-white/5 text-white/30';
              const isClickable = a.media_type && a.media_id;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (isClickable) router.push(`/details/${a.media_type}/${a.media_id}`);
                  }}
                >
                  {/* Poster thumbnail */}
                  {a.poster_url ? (
                    <div className="w-9 h-13 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/[0.06]">
                      <img src={a.poster_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionColor} transition-transform group-hover:scale-110`}>
                      {a.action === 'added' && <PlusIcon size={14} />}
                      {a.action === 'rated' && <Star size={14} />}
                      {a.action === 'reviewed' && <MessageSquareIcon size={14} />}
                      {a.action === 'followed' && <UserPlus size={14} />}
                      {a.action === 'finished' && <CheckCircle2 size={14} />}
                      {!['added','rated','reviewed','followed','finished'].includes(a.action) && <Activity size={14} />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 group-hover:text-white/80 transition-colors">
                      {a.action === 'followed' ? `Followed ${a.title}` :
                       a.action === 'rated' ? <span>Rated &ldquo;{a.title}&rdquo; <span className="font-bold text-gold">{a.rating}/10</span></span> :
                       a.action === 'finished' ? `Completed "${a.title}"` :
                       `${a.action.charAt(0).toUpperCase() + a.action.slice(1)} "${a.title}"`}
                    </span>
                    {isClickable && (
                      <span className="text-[10px] text-white/15 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        View →
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/15 shrink-0 font-mono">{timeAgo(a.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for new profiles */}
      {isOwnProfile && stats.total === 0 && activity.length === 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-10 text-center">
          <Library size={48} className="mx-auto mb-4 text-white/[0.08]" />
          <h3 className="text-lg font-bold text-white/60 mb-2">Your library is empty</h3>
          <p className="text-sm text-white/30 mb-6 max-w-md mx-auto">
            Start adding movies, TV shows, and books to track what you watch and get personalized recommendations.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="bg-accent hover:bg-accent/80 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Browse Movies
            </button>
            <button
              onClick={() => router.push('/search')}
              className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Discover Weekly */}
      {isOwnProfile && discoverWeekly.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.15] via-accent/[0.08] to-indigo-600/[0.12]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent_60%)]" />
          <div className="absolute inset-0 border border-white/[0.08] rounded-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Discover Weekly</h3>
                </div>
                <p className="text-xs text-white/30 ml-[42px]">Personalized picks refreshed every week</p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-purple-400/60 font-semibold hidden sm:block">
                {discoverWeekly.length} picks
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {discoverWeekly.slice(0, 12).map((item: any, idx: number) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/details/${item.media_type}/${item.id}`)}
                  className="group text-left"
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/[0.1] group-hover:ring-purple-400/50 group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:shadow-purple-500/20 transition-all duration-300 relative">
                    {item.poster_path ? (
                      <img src={`${TMDB_IMG}${item.poster_path}`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                        <Film size={24} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/30 backdrop-blur-sm border border-purple-400/20 text-[10px] font-bold text-purple-300">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-[11px] font-semibold text-white truncate drop-shadow-lg group-hover:text-purple-300 transition-colors">
                        {item.title || item.name}
                      </p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">
                        {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Library Tab ───

type SortMode = 'recent' | 'rating' | 'title';

function LibraryTab({ library, isOwnProfile, onUpdate }: {
  library: LibraryItem[];
  isOwnProfile: boolean;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mediaFilter, setMediaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [ratingItem, setRatingItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setRatingItem(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    let items = library;
    if (mediaFilter !== 'all') items = items.filter(i => i.media_type === mediaFilter);
    if (statusFilter !== 'all') items = items.filter(i => i.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q));
    }
    // Sort
    if (sortMode === 'rating') {
      items = [...items].sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
    } else if (sortMode === 'title') {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    }
    // 'recent' is the default order from API
    return items;
  }, [library, mediaFilter, statusFilter, searchQuery, sortMode]);

  const handleStatusChange = async (item: LibraryItem, newStatus: string) => {
    try {
      await updateLibraryItem(item.id, { status: newStatus });
      toast(`Moved "${item.title}" to ${newStatus === 'finished' ? 'Completed' : newStatus === 'watching' ? 'In Progress' : 'Up Next'}`, 'success');
      setActiveMenu(null);
      onUpdate();
    } catch { toast('Failed to update', 'error'); }
  };

  const handleRemove = async (item: LibraryItem) => {
    try {
      await removeFromLibrary(item.id);
      toast(`Removed "${item.title}"`, 'info');
      setActiveMenu(null);
      onUpdate();
    } catch { toast('Failed to remove', 'error'); }
  };

  const handleRate = async (item: LibraryItem, rating: number) => {
    try {
      await updateLibraryItem(item.id, { user_rating: rating });
      toast(`Rated "${item.title}" ${rating}/10`, 'success');
      setRatingItem(null);
      onUpdate();
    } catch { toast('Failed to rate', 'error'); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/25 outline-none focus:border-white/15 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-2 shrink-0">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-white/[0.04] border border-white/[0.06] text-white/60 text-sm rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-white/[0.06] transition-colors appearance-none pr-8"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.3)\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="recent">Recent</option>
            <option value="rating">Rating</option>
            <option value="title">A-Z</option>
          </select>
        </div>
      </div>

      {/* Media type filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'movie', 'tv', 'book'].map(f => (
          <button
            key={f}
            onClick={() => setMediaFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              mediaFilter === f ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : f === 'tv' ? 'TV Shows' : 'Books'}
          </button>
        ))}
        <div className="w-px bg-white/[0.06] mx-1 self-stretch" />
        {['all', 'finished', 'watching', 'want'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              statusFilter === s
                ? s === 'finished' ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                  : s === 'watching' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                  : s === 'want' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                  : 'bg-white/10 text-white border border-white/10'
                : 'bg-white/[0.02] text-white/30 hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            {s === 'all' ? 'All Status' : s === 'finished' ? 'Completed' : s === 'watching' ? 'In Progress' : 'Up Next'}
          </button>
        ))}
      </div>

      {/* Results count */}
      {(searchQuery || mediaFilter !== 'all' || statusFilter !== 'all') && (
        <p className="text-xs text-white/20">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center">
          <Library size={36} className="mx-auto mb-3 text-white/[0.06]" />
          <p className="text-white/25 text-sm">
            {searchQuery ? `No items matching "${searchQuery}"` : 'No items yet'}
          </p>
          {isOwnProfile && !searchQuery && (
            <button
              onClick={() => router.push('/')}
              className="text-xs text-accent hover:text-accent/80 mt-2 transition-colors"
            >
              Browse & add movies →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3" ref={menuRef}>
          {filtered.map(item => (
            <div key={item.id} className="group relative">
              <button
                onClick={() => {
                  const mt = item.media_type || 'movie';
                  const id = item.tmdb_id || item.openlibrary_key;
                  if (id) router.push(`/details/${mt}/${id}`);
                }}
                className="w-full text-left"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/[0.08] group-hover:ring-accent/50 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300 relative">
                  {item.poster_url ? (
                    <img src={item.poster_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                      <Film size={20} className="text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {item.user_rating && (
                    <div className="absolute top-1.5 right-1.5 backdrop-blur-md border border-red-500/30 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5" style={{ background: 'rgba(20, 0, 0, 0.75)', boxShadow: '0 0 12px rgba(239,68,68,0.2)' }}>
                      <Star size={10} className="fill-current text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                      <span className="text-[10px] font-bold text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]">{item.user_rating}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md inline-block mb-1.5 ${
                      item.status === 'finished' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                      item.status === 'watching' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                      'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                    }`}>
                      {item.status === 'finished' ? 'Completed' : item.status === 'watching' ? 'In Progress' : 'Up Next'}
                    </span>
                    <p className="text-xs text-white font-medium truncate drop-shadow-lg group-hover:text-accent transition-colors">{item.title}</p>
                  </div>
                </div>
              </button>

              {/* Quick action button (own profile only) */}
              {isOwnProfile && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); setRatingItem(null); }}
                  className="absolute top-1.5 left-1.5 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 z-10"
                >
                  <MoreHorizontal size={14} className="text-white/70" />
                </button>
              )}

              {/* Context menu */}
              {activeMenu === item.id && (
                <div className="absolute top-10 left-1.5 z-20 bg-dark-800 border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Status options */}
                  <p className="text-[10px] uppercase tracking-wider text-white/20 px-3 py-1">Move to</p>
                  {['watching', 'finished', 'want'].filter(s => s !== item.status).map(s => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(item, s); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      {s === 'finished' && <CheckCircle2 size={14} className="text-green-400" />}
                      {s === 'watching' && <Eye size={14} className="text-blue-400" />}
                      {s === 'want' && <Clock size={14} className="text-purple-400" />}
                      {s === 'finished' ? 'Completed' : s === 'watching' ? 'In Progress' : 'Up Next'}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06] my-1" />
                  {/* Rate */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setRatingItem(item.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Star size={14} className="text-gold" /> Rate
                  </button>
                  {ratingItem === item.id && (
                    <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          onClick={(e) => { e.stopPropagation(); handleRate(item, n); }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            item.user_rating === n
                              ? 'bg-accent text-white'
                              : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.1] hover:text-white'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="h-px bg-white/[0.06] my-1" />
                  {/* Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── People List ───

function PeopleList({ people, title, onBlend }: {
  people: PersonData[];
  title: string;
  onBlend?: ((friendId: string) => void) | null;
}) {
  const router = useRouter();

  if (people.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center">
        <Users size={36} className="mx-auto mb-3 text-white/[0.06]" />
        <p className="text-white/25 text-sm">No {title.toLowerCase()} yet</p>
        <button
          onClick={() => router.push('/social')}
          className="text-xs text-accent hover:text-accent/80 mt-2 transition-colors"
        >
          Find people to follow →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {people.map(p => (
        <div key={p.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
          <button onClick={() => router.push(`/profile/${p.id}`)} className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-700 ring-2 ring-white/10 shrink-0 flex items-center justify-center">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-white/20" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{p.display_name || p.username}</p>
              {p.display_name && <p className="text-xs text-white/30 truncate">@{p.username}</p>}
            </div>
          </button>
          {onBlend && (
            <button
              onClick={() => onBlend(p.id)}
              className="bg-gradient-to-r from-purple-500/20 to-accent/20 hover:from-purple-500/30 hover:to-accent/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0"
            >
              <Shuffle size={14} /> Blend
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Blend Tab ───

function BlendTab({ blend, following, onSelectFriend }: {
  blend: BlendData;
  following: PersonData[];
  onSelectFriend: (friendId: string) => void;
}) {
  const router = useRouter();
  const friend = following.find(f => f.id === blend.friendId);

  return (
    <div className="space-y-6">
      {/* Friend selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {following.map(f => (
          <button
            key={f.id}
            onClick={() => onSelectFriend(f.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              f.id === blend.friendId ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-dark-700">
              {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-white/20 m-auto" />}
            </div>
            {f.display_name || f.username}
          </button>
        ))}
      </div>

      {/* Compatibility score */}
      <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-8 text-center bg-gradient-to-br from-purple-500/[0.08] via-transparent to-accent/[0.06] relative overflow-hidden">
        <div className="text-6xl font-black bg-gradient-to-r from-purple-400 to-accent bg-clip-text text-transparent mb-2">
          {blend.compatibility}%
        </div>
        <p className="text-white/50 text-sm">Taste match with {friend?.display_name || friend?.username}</p>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/30">
          <span>{blend.shared.length} shared titles</span>
          <span>{blend.myCount} in your library</span>
          <span>{blend.friendCount} in theirs</span>
        </div>
      </div>

      {/* Shared genres */}
      {blend.sharedGenres.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3">Shared Genres</h3>
          <div className="flex flex-wrap gap-2">
            {blend.sharedGenres.map(g => (
              <span key={g.genre} className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm">
                {g.genre} ({g.overlap})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blend recommendations */}
      {blend.blendRecs.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" /> Watch Together
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {blend.blendRecs.map((item: any) => (
              <button
                key={item.id}
                onClick={() => router.push(`/details/${item.media_type || 'movie'}/${item.id}`)}
                className="shrink-0 w-28 group text-left"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all mb-1">
                  {item.poster_path ? (
                    <img src={`${TMDB_IMG}${item.poster_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center"><Film size={20} className="text-white/10" /></div>
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate group-hover:text-accent transition-colors">{item.title || item.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Shared titles */}
      {blend.shared.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4">Shared Titles</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {blend.shared.slice(0, 12).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                {item.poster_url && (
                  <img src={item.poster_url} alt="" className="w-10 h-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white/70 truncate">{item.title}</p>
                  <p className="text-[10px] text-white/30 capitalize">{item.media_type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ MAIN PROFILE VIEW ═══════════════════

export default function ProfileView({ userId }: { userId?: string }) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Social data
  const [followers, setFollowers] = useState<PersonData[]>([]);
  const [following, setFollowing] = useState<PersonData[]>([]);
  const [iFollow, setIFollow] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({});
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Discover Weekly & Blend
  const [discoverWeekly, setDiscoverWeekly] = useState<any[]>([]);
  const [blend, setBlend] = useState<BlendData | null>(null);
  const [tab, setTab] = useState('overview');

  // Library filter state passed from overview stat cards
  const [libraryInitialFilter, setLibraryInitialFilter] = useState<string | undefined>();

  const targetUserId = userId || user?.id;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const own = !userId || userId === user?.id;
      setIsOwnProfile(own);

      const [p, frs, fing, followStatus, lib, act] = await Promise.all([
        own ? getMyProfile() : getProfile(targetUserId),
        getFollowers(targetUserId),
        getFollowing(targetUserId),
        (!own && user) ? checkIsFollowing(targetUserId) : Promise.resolve(false),
        own ? getLibrary() : getFriendLibrary(targetUserId),
        own ? getMyActivity(20) : Promise.resolve([]),
      ]);

      setProfile(p as ProfileData | null);
      setFollowers(frs as PersonData[]);
      setFollowing(fing as PersonData[]);
      setIFollow(followStatus as boolean);
      setLibrary(lib as LibraryItem[]);
      setActivity(act as ActivityItem[]);

      // Discover Weekly (own profile only)
      if (own) {
        getDiscoverWeekly().then(dw => setDiscoverWeekly(dw)).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    setLoading(false);
  }, [targetUserId, userId, user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Stats from library
  const stats = useMemo((): StatsData => {
    const total = library.length;
    const finished = library.filter(i => i.status === 'finished').length;
    const watching = library.filter(i => i.status === 'watching').length;
    const want = library.filter(i => i.status === 'want').length;
    const movies = library.filter(i => i.media_type === 'movie').length;
    const tv = library.filter(i => i.media_type === 'tv').length;
    const books = library.filter(i => i.media_type === 'book').length;
    const rated = library.filter(i => i.user_rating);
    const avgRating = rated.length
      ? (rated.reduce((s, i) => s + (i.user_rating || 0), 0) / rated.length).toFixed(1)
      : null;

    const genreCounts: Record<string, number> = {};
    library.forEach(i => {
      if (i.genres) i.genres.split(',').map(g => g.trim()).filter(Boolean)
        .forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    });
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];

    return { total, finished, watching, want, movies, tv, books, avgRating, rated: rated.length, topGenres };
  }, [library]);

  // Navigate to library tab with optional filter
  const navigateToLibrary = useCallback((filter?: string) => {
    setLibraryInitialFilter(filter);
    setTab('library');
  }, []);

  // ─── Actions ───

  const handleFollow = async () => {
    try {
      await followUser(targetUserId!);
      setIFollow(true);
      setFollowers(f => [...f, { id: user!.id, username: '' } as PersonData]);
      toast(`Following ${profile?.username}!`, 'success');
    } catch { toast('Could not follow', 'error'); }
  };

  const handleUnfollow = async () => {
    try {
      await unfollowUser(targetUserId!);
      setIFollow(false);
      setFollowers(f => f.filter(u => u.id !== user?.id));
      toast(`Unfollowed ${profile?.username}`, 'info');
    } catch { toast('Could not unfollow', 'error'); }
  };

  const handleSaveProfile = async () => {
    try {
      const cleanForm = { ...editForm };
      if (cleanForm.avatar_url) {
        if (isDataUrl(cleanForm.avatar_url) && user?.id) {
          try {
            cleanForm.avatar_url = await uploadAvatar(user.id, cleanForm.avatar_url);
          } catch {
            toast('Failed to upload avatar image', 'error');
            return;
          }
        } else if (!cleanForm.avatar_url.startsWith('data:')) {
          const ALLOWED_AVATAR_HOSTS = ['api.dicebear.com', 'image.pollinations.ai'];
          try {
            const url = new URL(cleanForm.avatar_url);
            const isSupabase = url.hostname.endsWith('.supabase.co');
            if (!isSupabase && !ALLOWED_AVATAR_HOSTS.includes(url.hostname)) {
              toast('Avatar URL must be from DiceBear, AI generator, or Supabase Storage', 'error');
              return;
            }
          } catch {
            toast('Invalid avatar URL', 'error');
            return;
          }
        }
      }
      if (cleanForm.display_name) cleanForm.display_name = cleanForm.display_name.slice(0, 50);
      if (cleanForm.bio) cleanForm.bio = cleanForm.bio.slice(0, 500);
      const updated = await updateProfile(cleanForm);
      setProfile(updated as ProfileData);
      setEditing(false);
      setShowAvatarPicker(false);
      toast('Profile updated!', 'success');
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleLoadBlend = async (friendId: string) => {
    try {
      const b = await getBlend(friendId);
      if (b) {
        setBlend({ ...b, friendId });
        setTab('blend');
      }
    } catch { toast('Could not generate blend', 'error'); }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile/${targetUserId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile?.display_name || profile?.username}'s Profile`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Profile link copied!', 'success');
      }
    } catch {
      // User cancelled share dialog
    }
  };

  // Lazy migration: convert data URL avatars to Supabase Storage
  useEffect(() => {
    if (!isOwnProfile || !profile || !user?.id) return;
    if (!isDataUrl(profile.avatar_url)) return;

    (async () => {
      try {
        const storageUrl = await uploadAvatar(user.id, profile.avatar_url!);
        await updateProfile({ avatar_url: storageUrl });
        setProfile(p => p ? { ...p, avatar_url: storageUrl } : p);
      } catch {
        // Silent fail -- will retry next load
      }
    })();
  }, [isOwnProfile, profile?.avatar_url, user?.id]);

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <User size={48} className="text-white/20" />
        <p className="text-white/40">Profile not found</p>
        {!user && (
          <button onClick={() => router.push('/login')} className="btn-accent px-6 py-2 rounded-xl text-sm">
            Sign In
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ═══ PROFILE HEADER ═══ */}
      <div className="relative bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6 sm:p-8 overflow-hidden">
        {/* Decorative gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] via-transparent to-purple-500/[0.06] pointer-events-none" />
        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center gap-7">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-[3px] ring-accent/25 bg-dark-700 flex items-center justify-center shadow-xl shadow-black/30">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span style="font-size:2rem;color:rgba(255,255,255,0.2)">&#128100;</span>';
                    }
                  }}
                />
              ) : (
                <User size={52} className="text-white/15" />
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => { setShowAvatarPicker(!showAvatarPicker); setEditing(true); setEditForm({ ...profile }); }}
                className="absolute bottom-1 right-1 bg-accent hover:bg-accent/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="space-y-3">
                <input
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-lg font-bold w-full max-w-xs outline-none focus:border-accent/40 transition-colors"
                  placeholder="Display name"
                  value={editForm.display_name || ''}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                  maxLength={50}
                />
                <textarea
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/70 text-sm w-full max-w-md resize-none outline-none focus:border-accent/40 transition-colors"
                  placeholder="Bio -- tell people about your taste..."
                  rows={2}
                  value={editForm.bio || ''}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="bg-accent hover:bg-accent/80 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={() => { setEditing(false); setShowAvatarPicker(false); }} className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-white px-5 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  {profile.display_name || profile.username}
                </h1>
                {profile.display_name && (
                  <p className="text-sm text-white/30 mt-1">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-sm text-white/45 mt-2.5 max-w-md leading-relaxed">{profile.bio}</p>
                )}
                <div className="flex items-center gap-5 mt-4 justify-center sm:justify-start text-sm">
                  <button onClick={() => setTab('followers')} className="text-white/40 hover:text-white transition-colors">
                    <strong className="text-white font-black">{followers.length}</strong> followers
                  </button>
                  <button onClick={() => setTab('following')} className="text-white/40 hover:text-white transition-colors">
                    <strong className="text-white font-black">{following.length}</strong> following
                  </button>
                  <span className="text-white/40">
                    <strong className="text-white font-black">{stats.total}</strong> in library
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap shrink-0">
            {isOwnProfile ? (
              <>
                <button
                  onClick={handleShareProfile}
                  className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/60 hover:text-white px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                  title="Share Profile"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => { setEditing(true); setEditForm({ ...profile }); }}
                  className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Settings size={15} /> Edit Profile
                </button>
                <button
                  onClick={signOut}
                  className="bg-white/[0.03] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-white/35 border border-white/[0.06] px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </>
            ) : user ? (
              <>
                <button
                  onClick={handleShareProfile}
                  className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/60 hover:text-white px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                  title="Share Profile"
                >
                  <Share2 size={15} />
                </button>
                {iFollow ? (
                  <button
                    onClick={handleUnfollow}
                    className="bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-white border border-white/[0.06] px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                  >
                    <UserMinus size={15} /> Unfollow
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="bg-accent hover:bg-accent/80 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <UserPlus size={15} /> Follow
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <AvatarPicker
            currentUrl={editForm.avatar_url}
            onSelect={url => setEditForm(f => ({ ...f, avatar_url: url }))}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart },
          { key: 'library', label: 'Library', icon: Library },
          { key: 'following', label: 'Following', icon: Users },
          { key: 'followers', label: 'Followers', icon: Heart },
          ...(isOwnProfile && following.length > 0 ? [{ key: 'blend', label: 'Blends', icon: Shuffle }] : []),
        ] as { key: string; label: string; icon: React.ComponentType<{ size?: number }> }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              tab === t.key
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === 'overview' && <OverviewTab stats={stats} activity={activity} isOwnProfile={isOwnProfile} discoverWeekly={discoverWeekly} onNavigateLibrary={navigateToLibrary} />}
      {tab === 'library' && <LibraryTab library={library} isOwnProfile={isOwnProfile} onUpdate={loadProfile} />}
      {tab === 'following' && <PeopleList people={following} title="Following" onBlend={isOwnProfile ? handleLoadBlend : null} />}
      {tab === 'followers' && <PeopleList people={followers} title="Followers" />}
      {tab === 'blend' && blend && <BlendTab blend={blend} following={following} onSelectFriend={handleLoadBlend} />}
    </div>
  );
}
