'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Settings, Users, Heart, Star, Film, Tv, BookOpen, Library,
  CheckCircle2, Eye, Clock, TrendingUp, Edit3, X, Check, UserPlus,
  UserMinus, Activity, Sparkles, Shuffle, ChevronRight, ExternalLink, LogOut,
} from 'lucide-react';
import {
  getProfile, getMyProfile, updateProfile, getFollowers, getFollowing,
  isFollowing as checkIsFollowing, followUser, unfollowUser, getMyActivity,
  getFriendLibrary, getBlend, getDiscoverWeekly, AVATAR_PRESETS,
} from '@/lib/api/social';
import { getLibrary } from '@/lib/api/library';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { TMDB_IMG } from '@/lib/constants';

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
  _aiPrompt?: string;
  _aiGenerating?: boolean;
  _aiError?: boolean;
  _aiFallback?: boolean;
  _aiResults?: string[] | null;
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

function StatCard({ icon: Icon, label, value, color = 'text-white' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col items-center gap-1">
      <Icon size={18} className={color} />
      <span className="text-2xl font-black text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-white/30">{label}</span>
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab({ stats, activity, isOwnProfile, discoverWeekly }: {
  stats: StatsData;
  activity: ActivityItem[];
  isOwnProfile: boolean;
  discoverWeekly: any[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Library} label="Total" value={stats.total} color="text-accent" />
        <StatCard icon={CheckCircle2} label="Finished" value={stats.finished} color="text-green-400" />
        <StatCard icon={Eye} label="In Progress" value={stats.watching} color="text-blue-400" />
        <StatCard icon={Clock} label="Wishlist" value={stats.want} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Film} label="Movies" value={stats.movies} color="text-rose-400" />
        <StatCard icon={Tv} label="TV Shows" value={stats.tv} color="text-cyan-400" />
        <StatCard icon={BookOpen} label="Books" value={stats.books} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rating stats */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3 flex items-center gap-2">
            <Star size={14} className="text-gold" /> Rating Stats
          </h3>
          {stats.avgRating ? (
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-gold">{stats.avgRating}</span>
                <span className="text-white/30 text-sm">/10 average</span>
              </div>
              <p className="text-xs text-white/30">{stats.rated} items rated</p>
            </div>
          ) : <p className="text-sm text-white/30">Rate items to see stats</p>}
        </div>

        {/* Top genres */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" /> Top Genres
          </h3>
          {stats.topGenres.length > 0 ? (
            <div className="space-y-2">
              {stats.topGenres.map(([genre, count], idx) => (
                <div key={genre} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/20 w-4">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-white/70">{genre}</span>
                      <span className="text-xs text-white/30">{count}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent/60 rounded-full" style={{ width: `${(count / stats.topGenres[0][1]) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-white/30">Add items to see genres</p>}
        </div>
      </div>

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-accent" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {activity.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  {a.action === 'added' && <PlusIcon size={14} className="text-green-400" />}
                  {a.action === 'rated' && <Star size={14} className="text-gold" />}
                  {a.action === 'reviewed' && <MessageSquareIcon size={14} className="text-blue-400" />}
                  {a.action === 'followed' && <UserPlus size={14} className="text-accent" />}
                  {a.action === 'finished' && <CheckCircle2 size={14} className="text-green-400" />}
                  {!['added','rated','reviewed','followed','finished'].includes(a.action) && <Activity size={14} className="text-white/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white/70">
                    {a.action === 'followed' ? `Followed ${a.title}` :
                     a.action === 'rated' ? `Rated "${a.title}" ${a.rating}/10` :
                     a.action === 'finished' ? `Finished "${a.title}"` :
                     `${a.action.charAt(0).toUpperCase() + a.action.slice(1)} "${a.title}"`}
                  </span>
                </div>
                <span className="text-xs text-white/20 shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover Weekly */}
      {isOwnProfile && discoverWeekly.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" /> Discover Weekly
          </h3>
          <p className="text-xs text-white/30 mb-3">Based on your library -- updated weekly</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {discoverWeekly.map((item: any) => (
              <button
                key={item.id}
                onClick={() => router.push(`/details/${item.media_type}/${item.id}`)}
                className="shrink-0 w-32 group text-left"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-accent/50 transition-all">
                  {item.poster_path ? (
                    <img src={`${TMDB_IMG}${item.poster_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                      <Film size={24} className="text-white/10" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/70 truncate group-hover:text-accent transition-colors">
                  {item.title || item.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Library Tab ───

function LibraryTab({ library }: { library: LibraryItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return library;
    return library.filter(i => i.media_type === filter);
  }, [library, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'movie', 'tv', 'book'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : f === 'tv' ? 'TV Shows' : 'Books'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Library size={32} className="mx-auto mb-2 text-white/10" />
          <p className="text-white/30 text-sm">No items yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => {
                const mt = item.media_type || 'movie';
                const id = item.tmdb_id || item.openlibrary_key;
                if (id) router.push(`/details/${mt}/${id}`);
              }}
              className="group text-left"
            >
              <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all mb-2 relative">
                {item.poster_url ? (
                  <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                    <Film size={20} className="text-white/10" />
                  </div>
                )}
                {item.user_rating && (
                  <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
                    <Star size={12} className="text-gold fill-gold" />
                    <span className="text-[10px] font-bold text-gold">{item.user_rating}</span>
                  </div>
                )}
                <div className="absolute bottom-1 left-1">
                  <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                    item.status === 'finished' ? 'bg-green-500/80' :
                    item.status === 'watching' ? 'bg-blue-500/80' :
                    'bg-purple-500/80'
                  } text-white`}>
                    {item.status === 'finished' ? 'Done' : item.status === 'watching' ? 'Active' : 'Want'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/60 truncate group-hover:text-accent transition-colors">{item.title}</p>
            </button>
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
      <div className="glass rounded-2xl p-8 text-center">
        <Users size={32} className="mx-auto mb-2 text-white/10" />
        <p className="text-white/30 text-sm">No {title.toLowerCase()} yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {people.map(p => (
        <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
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
      <div className="glass rounded-3xl p-6 text-center bg-gradient-to-br from-purple-500/10 via-transparent to-accent/10">
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
        <div className="glass rounded-2xl p-5">
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
        <div className="glass rounded-2xl p-5">
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
        <div className="glass rounded-2xl p-5">
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

const AI_STYLES = ['adventurer', 'lorelei', 'notionists', 'personas', 'big-smile', 'fun-emoji', 'thumbs', 'bottts', 'pixel-art', 'shapes'];

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
      const { _aiPrompt, _aiGenerating, _aiError, _aiFallback, _aiResults, ...cleanForm } = editForm;
      if (cleanForm.avatar_url) {
        if (cleanForm.avatar_url.startsWith('data:image/')) {
          // Data URLs from AI generation are allowed
        } else {
          const ALLOWED_AVATAR_HOSTS = ['api.dicebear.com', 'image.pollinations.ai'];
          try {
            const url = new URL(cleanForm.avatar_url);
            if (!ALLOWED_AVATAR_HOSTS.includes(url.hostname)) {
              toast('Avatar URL must be from DiceBear or AI generator', 'error');
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

  const generateAvatar = useCallback((promptText: string) => {
    if (!promptText?.trim()) return;
    const seed = promptText.trim();
    setEditForm(f => ({ ...f, _aiGenerating: true, _aiError: false, _aiFallback: false, _aiResults: null }));

    const prompt = encodeURIComponent(`profile avatar portrait, ${seed}, centered face, clean background, high quality, digital art`);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${prompt}?width=256&height=256&nologo=true&model=flux`;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      img.src = '';
      const results = AI_STYLES.map(style => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`);
      setEditForm(f => ({ ...f, _aiGenerating: false, _aiFallback: true, _aiResults: results }));
    }, 15000);

    img.onload = () => {
      if (timedOut) return;
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setEditForm(f => ({ ...f, avatar_url: dataUrl, _aiGenerating: false, _aiFallback: false, _aiResults: null }));
      } catch {
        setEditForm(f => ({ ...f, avatar_url: pollinationsUrl, _aiGenerating: false, _aiFallback: false, _aiResults: null }));
      }
    };
    img.onerror = () => {
      if (timedOut) return;
      clearTimeout(timeout);
      const results = AI_STYLES.map(style => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`);
      setEditForm(f => ({ ...f, _aiGenerating: false, _aiFallback: true, _aiResults: results }));
    };
    img.src = pollinationsUrl;
  }, []);

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
      <div className="relative glass rounded-3xl p-6 sm:p-8 overflow-hidden">
        {/* Decorative gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-accent/30 bg-dark-700 flex items-center justify-center">
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
                <User size={48} className="text-white/20" />
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => { setShowAvatarPicker(!showAvatarPicker); setEditing(true); setEditForm({ ...profile }); }}
                className="absolute bottom-0 right-0 bg-accent rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-lg font-bold w-full max-w-xs focus:outline-none focus:border-accent"
                  placeholder="Display name"
                  value={editForm.display_name || ''}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                  maxLength={50}
                />
                <textarea
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm w-full max-w-md resize-none focus:outline-none focus:border-accent"
                  placeholder="Bio -- tell people about your taste..."
                  rows={2}
                  value={editForm.bio || ''}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="bg-accent hover:bg-accent/80 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={() => { setEditing(false); setShowAvatarPicker(false); }} className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {profile.display_name || profile.username}
                </h1>
                {profile.display_name && (
                  <p className="text-sm text-white/40 mt-0.5">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-sm text-white/50 mt-2 max-w-md">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start text-sm">
                  <button onClick={() => setTab('followers')} className="text-white/50 hover:text-white transition-colors">
                    <strong className="text-white">{followers.length}</strong> followers
                  </button>
                  <button onClick={() => setTab('following')} className="text-white/50 hover:text-white transition-colors">
                    <strong className="text-white">{following.length}</strong> following
                  </button>
                  <span className="text-white/50">
                    <strong className="text-white">{stats.total}</strong> in library
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => { setEditing(true); setEditForm({ ...profile }); }}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Settings size={16} /> Edit Profile
                </button>
                <button
                  onClick={signOut}
                  className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : user ? (
              iFollow ? (
                <button
                  onClick={handleUnfollow}
                  className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <UserMinus size={16} /> Unfollow
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className="bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <UserPlus size={16} /> Follow
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Avatar Picker */}
        {showAvatarPicker && (
          <div className="relative mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-semibold text-white/50 mb-4">Choose an avatar</h3>

            {/* AI Avatar Generator */}
            <div className="mb-5 p-4 bg-gradient-to-r from-accent/10 to-purple-500/10 border border-accent/20 rounded-xl">
              <p className="text-xs text-white/50 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent" /> Avatar Generator
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs focus:outline-none focus:border-accent"
                  placeholder="Type anything... e.g. moon prince, anime warrior, space cat"
                  value={editForm._aiPrompt || ''}
                  onChange={e => setEditForm(f => ({ ...f, _aiPrompt: e.target.value, _aiError: false, _aiFallback: false, _aiResults: null }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generateAvatar(editForm._aiPrompt || ''); } }}
                />
                <button
                  onClick={() => generateAvatar(editForm._aiPrompt || '')}
                  disabled={!editForm._aiPrompt?.trim() || editForm._aiGenerating}
                  className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Generate
                </button>
              </div>
              {editForm._aiGenerating && (
                <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
                  Generating avatars from your prompt...
                </div>
              )}
              {/* AI-generated avatar result */}
              {editForm.avatar_url?.startsWith('data:') && !editForm._aiGenerating && !editForm._aiFallback && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={editForm.avatar_url} alt="AI avatar" className="w-16 h-16 rounded-full object-cover border-2 border-accent/40" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-green-400">AI avatar generated!</span>
                    <button
                      onClick={() => generateAvatar(editForm._aiPrompt || '')}
                      className="text-xs text-accent hover:text-accent/80 transition-colors text-left"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
              {/* DiceBear fallback results */}
              {editForm._aiFallback && editForm._aiResults && (
                <div className="mt-3">
                  <p className="text-xs text-white/40 mb-2">Unique avatars for &quot;{editForm._aiPrompt}&quot; -- tap to select:</p>
                  <div className="flex gap-2 flex-wrap">
                    {editForm._aiResults.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setEditForm(f => ({ ...f, avatar_url: url }))}
                        className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                          editForm.avatar_url === url ? 'border-accent shadow-lg shadow-accent/30' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={url} alt={`avatar ${i + 1}`} className="w-full h-full object-cover bg-white/5" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => generateAvatar(editForm._aiPrompt || '')}
                    className="mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Preset sections */}
            {Object.entries(AVATAR_PRESETS).map(([label, urls]) => (
              <div key={label} className="mb-4">
                <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">{label}</p>
                <div className="flex gap-2 flex-wrap">
                  {urls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setEditForm(f => ({ ...f, avatar_url: url }))}
                      className={`w-14 h-14 rounded-full overflow-hidden ring-2 transition-all hover:scale-105 ${
                        editForm.avatar_url === url ? 'ring-accent scale-110 shadow-lg shadow-accent/30' : 'ring-transparent hover:ring-white/30'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-3">
              <input
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs w-full max-w-sm focus:outline-none focus:border-accent"
                placeholder="Or paste a custom avatar URL..."
                value={editForm.avatar_url || ''}
                onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === 'overview' && <OverviewTab stats={stats} activity={activity} isOwnProfile={isOwnProfile} discoverWeekly={discoverWeekly} />}
      {tab === 'library' && <LibraryTab library={library} />}
      {tab === 'following' && <PeopleList people={following} title="Following" onBlend={isOwnProfile ? handleLoadBlend : null} />}
      {tab === 'followers' && <PeopleList people={followers} title="Followers" />}
      {tab === 'blend' && blend && <BlendTab blend={blend} following={following} onSelectFriend={handleLoadBlend} />}
    </div>
  );
}
