import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchUsers, getFollowing, getFollowers, getFriendActivity,
  followUser, unfollowUser, isFollowing as checkIsFollowing,
} from '../services/api';
import {
  Search, Users, User, UserPlus, UserMinus, Activity, Star, Eye,
  CheckCircle2, Plus, Film, Tv, BookOpen, Heart, Shuffle,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w200';

export default function Social() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fing, fers, act] = await Promise.all([
        getFollowing(user.id),
        getFollowers(user.id),
        getFriendActivity(50),
      ]);
      setFollowing(fing);
      setFollowers(fers);
      setActivity(act);
      setFollowingIds(new Set(fing.map(f => f.id)));
    } catch (err) {
      console.error('Social load error:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Check follow status for each result
      const withStatus = await Promise.all(
        results.map(async (r) => ({
          ...r,
          isFollowed: followingIds.has(r.id),
        }))
      );
      setSearchResults(withStatus);
    } catch { toast('Search failed', 'error'); }
    setSearching(false);
  };

  const handleFollow = async (targetId, username) => {
    try {
      await followUser(targetId);
      setFollowingIds(s => new Set([...s, targetId]));
      setSearchResults(r => r.map(u => u.id === targetId ? { ...u, isFollowed: true } : u));
      toast(`Following ${username}!`, 'success');
      loadData();
    } catch { toast('Could not follow', 'error'); }
  };

  const handleUnfollow = async (targetId, username) => {
    try {
      await unfollowUser(targetId);
      setFollowingIds(s => { const n = new Set(s); n.delete(targetId); return n; });
      setSearchResults(r => r.map(u => u.id === targetId ? { ...u, isFollowed: false } : u));
      toast(`Unfollowed ${username}`, 'info');
      loadData();
    } catch { toast('Could not unfollow', 'error'); }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Users size={48} className="text-white/20" />
        <p className="text-white/40">Sign in to connect with friends</p>
        <button onClick={() => navigate('/login')} className="bg-accent hover:bg-accent/80 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors">
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
          <Users size={28} className="text-accent" /> Social
        </h1>
        <p className="text-sm text-white/40 mt-1">Find friends, see what they're watching</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search users by username..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-accent hover:bg-accent/80 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {searching ? '...' : 'Search'}
        </button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white/40 mb-2">Search Results</h3>
          {searchResults.map(u => (
            <UserRow
              key={u.id}
              user={u}
              isFollowed={u.isFollowed}
              onFollow={() => handleFollow(u.id, u.username)}
              onUnfollow={() => handleUnfollow(u.id, u.username)}
              onClick={() => navigate(`/profile/${u.id}`)}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { key: 'feed', label: 'Activity Feed', icon: Activity },
          { key: 'following', label: `Following (${following.length})`, icon: Users },
          { key: 'followers', label: `Followers (${followers.length})`, icon: Heart },
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

      {/* Tab Content */}
      {tab === 'feed' && <ActivityFeed activity={activity} navigate={navigate} />}
      {tab === 'following' && (
        <div className="space-y-2">
          {following.length === 0 ? (
            <EmptyState icon={Users} text="You're not following anyone yet. Search for friends above!" />
          ) : (
            following.map(u => (
              <UserRow
                key={u.id}
                user={u}
                isFollowed={true}
                onUnfollow={() => handleUnfollow(u.id, u.username)}
                onClick={() => navigate(`/profile/${u.id}`)}
                showBlend
                onBlend={() => navigate(`/profile?blend=${u.id}`)}
              />
            ))
          )}
        </div>
      )}
      {tab === 'followers' && (
        <div className="space-y-2">
          {followers.length === 0 ? (
            <EmptyState icon={Heart} text="No followers yet. Share your profile!" />
          ) : (
            followers.map(u => (
              <UserRow
                key={u.id}
                user={u}
                isFollowed={followingIds.has(u.id)}
                onFollow={() => handleFollow(u.id, u.username)}
                onUnfollow={() => handleUnfollow(u.id, u.username)}
                onClick={() => navigate(`/profile/${u.id}`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ USER ROW ═══════════════════ */
function UserRow({ user: u, isFollowed, onFollow, onUnfollow, onClick, showBlend, onBlend }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-700 ring-2 ring-white/10 shrink-0 flex items-center justify-center">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={18} className="text-white/20" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username}</p>
          {u.display_name && <p className="text-xs text-white/30 truncate">@{u.username}</p>}
        </div>
      </button>
      <div className="flex gap-2 shrink-0">
        {showBlend && (
          <button
            onClick={onBlend}
            className="bg-gradient-to-r from-purple-500/20 to-accent/20 hover:from-purple-500/30 hover:to-accent/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
          >
            <Shuffle size={14} /> Blend
          </button>
        )}
        {isFollowed ? (
          <button
            onClick={onUnfollow}
            className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <UserMinus size={14} /> Unfollow
          </button>
        ) : onFollow ? (
          <button
            onClick={onFollow}
            className="bg-accent hover:bg-accent/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <UserPlus size={14} /> Follow
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════ ACTIVITY FEED ═══════════════════ */
function ActivityFeed({ activity, navigate }) {
  if (activity.length === 0) {
    return <EmptyState icon={Activity} text="No activity yet. Follow some friends to see their updates!" />;
  }

  return (
    <div className="space-y-3">
      {activity.map(a => {
        const profile = a.profiles;
        return (
          <div key={a.id} className="glass rounded-2xl p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <button onClick={() => navigate(`/profile/${a.user_id}`)} className="shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-700 ring-2 ring-white/10 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-white/20" />
                  )}
                </div>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate(`/profile/${a.user_id}`)} className="text-sm font-semibold text-white hover:text-accent transition-colors">
                    {profile?.username || 'Someone'}
                  </button>
                  <span className="text-sm text-white/40">
                    {a.action === 'added' && 'added'}
                    {a.action === 'rated' && 'rated'}
                    {a.action === 'reviewed' && 'reviewed'}
                    {a.action === 'finished' && 'finished'}
                    {a.action === 'followed' && 'followed'}
                    {a.action === 'watching' && 'is watching'}
                    {!['added','rated','reviewed','finished','followed','watching'].includes(a.action) && a.action}
                  </span>
                  {a.title && a.action !== 'followed' && (
                    <button
                      onClick={() => {
                        if (a.media_type && a.media_id) navigate(`/details/${a.media_type}/${a.media_id}`);
                      }}
                      className="text-sm font-medium text-accent hover:text-accent/80 transition-colors truncate"
                    >
                      "{a.title}"
                    </button>
                  )}
                  {a.action === 'followed' && a.title && (
                    <span className="text-sm text-accent">{a.title}</span>
                  )}
                </div>

                {a.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-gold fill-gold" />
                    <span className="text-xs font-bold text-gold">{a.rating}/10</span>
                  </div>
                )}

                {a.review && (
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">"{a.review}"</p>
                )}

                <span className="text-[10px] text-white/20 mt-1 block">{timeAgo(a.created_at)}</span>
              </div>

              {/* Poster thumbnail */}
              {a.poster_url && (
                <button
                  onClick={() => { if (a.media_type && a.media_id) navigate(`/details/${a.media_type}/${a.media_id}`); }}
                  className="shrink-0"
                >
                  <img src={a.poster_url} alt="" className="w-10 h-14 rounded-lg object-cover ring-1 ring-white/10" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════ EMPTY STATE ═══════════════════ */
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <Icon size={32} className="mx-auto mb-2 text-white/10" />
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}

/* ═══════════════════ HELPERS ═══════════════════ */
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
