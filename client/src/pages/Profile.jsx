import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getProfile, getMyProfile, updateProfile, getFollowers, getFollowing,
  isFollowing, followUser, unfollowUser, getMyActivity, getFriendLibrary,
  getBlend, getDiscoverWeekly, getLibrary, AVATAR_PRESETS,
} from '../services/api';
import {
  User, Settings, Users, Heart, Star, Film, Tv, BookOpen, Library,
  CheckCircle2, Eye, Clock, TrendingUp, Edit3, X, Check, UserPlus,
  UserMinus, Activity, Sparkles, Shuffle, ChevronRight, ExternalLink,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

/* ═══════════════════ PROFILE PAGE ═══════════════════ */
export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Social data
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [iFollow, setIFollow] = useState(false);
  const [activity, setActivity] = useState([]);
  const [library, setLibrary] = useState([]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Discover Weekly & Blend
  const [discoverWeekly, setDiscoverWeekly] = useState([]);
  const [blend, setBlend] = useState(null);
  const [tab, setTab] = useState('overview'); // overview, library, following, followers, blend

  const targetUserId = userId || user?.id;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const own = !userId || userId === user?.id;
      setIsOwnProfile(own);

      const p = own ? await getMyProfile() : await getProfile(targetUserId);
      setProfile(p);

      const [frs, fing] = await Promise.all([
        getFollowers(targetUserId),
        getFollowing(targetUserId),
      ]);
      setFollowers(frs);
      setFollowing(fing);

      if (!own && user) {
        const following = await isFollowing(targetUserId);
        setIFollow(following);
      }

      // Get library (own or friend's)
      if (own) {
        const lib = await getLibrary();
        setLibrary(lib);
      } else {
        const lib = await getFriendLibrary(targetUserId);
        setLibrary(lib);
      }

      // Activity
      if (own) {
        const act = await getMyActivity(20);
        setActivity(act);
      }

      // Discover Weekly (own profile only)
      if (own) {
        try {
          const dw = await getDiscoverWeekly();
          setDiscoverWeekly(dw);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    setLoading(false);
  }, [targetUserId, userId, user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Stats from library
  const stats = useMemo(() => {
    const total = library.length;
    const finished = library.filter(i => i.status === 'finished').length;
    const watching = library.filter(i => i.status === 'watching').length;
    const want = library.filter(i => i.status === 'want').length;
    const movies = library.filter(i => i.media_type === 'movie').length;
    const tv = library.filter(i => i.media_type === 'tv').length;
    const books = library.filter(i => i.media_type === 'book').length;
    const rated = library.filter(i => i.user_rating);
    const avgRating = rated.length
      ? (rated.reduce((s, i) => s + i.user_rating, 0) / rated.length).toFixed(1)
      : null;

    const genreCounts = {};
    library.forEach(i => {
      if (i.genres) i.genres.split(',').map(g => g.trim()).filter(Boolean)
        .forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    });
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total, finished, watching, want, movies, tv, books, avgRating, rated: rated.length, topGenres };
  }, [library]);

  // ─── Actions ───

  const handleFollow = async () => {
    try {
      await followUser(targetUserId);
      setIFollow(true);
      setFollowers(f => [...f, { id: user.id }]);
      toast(`Following ${profile?.username}!`, 'success');
    } catch (err) { toast('Could not follow', 'error'); }
  };

  const handleUnfollow = async () => {
    try {
      await unfollowUser(targetUserId);
      setIFollow(false);
      setFollowers(f => f.filter(u => u.id !== user?.id));
      toast(`Unfollowed ${profile?.username}`, 'info');
    } catch (err) { toast('Could not unfollow', 'error'); }
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfile(editForm);
      setProfile(updated);
      setEditing(false);
      toast('Profile updated!', 'success');
    } catch (err) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleLoadBlend = async (friendId) => {
    try {
      const b = await getBlend(friendId);
      setBlend({ ...b, friendId });
      setTab('blend');
    } catch { toast('Could not generate blend', 'error'); }
  };

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
          <button onClick={() => navigate('/login')} className="btn-accent px-6 py-2 rounded-xl text-sm">
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
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
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
                />
                <textarea
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/70 text-sm w-full max-w-md resize-none focus:outline-none focus:border-accent"
                  placeholder="Bio — tell people about your taste..."
                  rows={2}
                  value={editForm.bio || ''}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
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
          <div className="flex gap-2">
            {isOwnProfile ? (
              <button
                onClick={() => { setEditing(true); setEditForm({ ...profile }); }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Settings size={16} /> Edit Profile
              </button>
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
            {/* Style sections */}
            {[
              { label: 'Characters', start: 0, end: 6 },
              { label: 'Portraits', start: 6, end: 12 },
              { label: 'Personas', start: 12, end: 18 },
              { label: 'Minimal', start: 18, end: 24 },
            ].map(section => (
              <div key={section.label} className="mb-4">
                <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">{section.label}</p>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_PRESETS.slice(section.start, section.end).map((url, i) => (
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
        {[
          { key: 'overview', label: 'Overview', icon: BarChart },
          { key: 'library', label: 'Library', icon: Library },
          { key: 'following', label: 'Following', icon: Users },
          { key: 'followers', label: 'Followers', icon: Heart },
          ...(isOwnProfile && following.length > 0 ? [{ key: 'blend', label: 'Blends', icon: Shuffle }] : []),
        ].map(t => (
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
      {tab === 'overview' && <OverviewTab stats={stats} activity={activity} isOwnProfile={isOwnProfile} discoverWeekly={discoverWeekly} navigate={navigate} />}
      {tab === 'library' && <LibraryTab library={library} navigate={navigate} />}
      {tab === 'following' && <PeopleList people={following} title="Following" navigate={navigate} onBlend={isOwnProfile ? handleLoadBlend : null} />}
      {tab === 'followers' && <PeopleList people={followers} title="Followers" navigate={navigate} />}
      {tab === 'blend' && blend && <BlendTab blend={blend} following={following} onSelectFriend={handleLoadBlend} navigate={navigate} />}
    </div>
  );
}

/* ═══════════════════ STAT CARD ═══════════════════ */
function BarChart({ size = 16, ...p }) { return <TrendingUp size={size} {...p} />; }

function StatCard({ icon: Icon, label, value, color = 'text-white' }) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col items-center gap-1">
      <Icon size={18} className={color} />
      <span className="text-2xl font-black text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-white/30">{label}</span>
    </div>
  );
}

/* ═══════════════════ OVERVIEW TAB ═══════════════════ */
function OverviewTab({ stats, activity, isOwnProfile, discoverWeekly, navigate }) {
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
                  {a.action === 'added' && <Plus size={14} className="text-green-400" />}
                  {a.action === 'rated' && <Star size={14} className="text-gold" />}
                  {a.action === 'reviewed' && <MessageSquare size={14} className="text-blue-400" />}
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
          <p className="text-xs text-white/30 mb-3">Based on your library — updated weekly</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {discoverWeekly.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/details/${item.media_type}/${item.id}`)}
                className="shrink-0 w-32 group"
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

/* ═══════════════════ LIBRARY TAB ═══════════════════ */
function LibraryTab({ library, navigate }) {
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
                if (id) navigate(`/details/${mt}/${id}`);
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
                    <Star size={10} className="text-gold fill-gold" />
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

/* ═══════════════════ PEOPLE LIST ═══════════════════ */
function PeopleList({ people, title, navigate, onBlend }) {
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
          <button onClick={() => navigate(`/profile/${p.id}`)} className="flex items-center gap-4 flex-1 min-w-0">
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
              <Shuffle size={12} /> Blend
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ BLEND TAB ═══════════════════ */
function BlendTab({ blend, following, onSelectFriend, navigate }) {
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
              {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={12} className="text-white/20 m-auto" />}
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
            {blend.blendRecs.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`)}
                className="shrink-0 w-28 group"
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
            {blend.shared.slice(0, 12).map(item => (
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

/* ═══════════════════ HELPERS ═══════════════════ */
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Plus({ size = 16, ...p }) { return <span style={{ fontSize: size }} {...p}>+</span>; }
function MessageSquare({ size = 16, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
