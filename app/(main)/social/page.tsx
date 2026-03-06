'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  User,
  UserPlus,
  UserMinus,
  Activity,
  Star,
  Heart,
  Shuffle,
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  searchUsers,
  getFollowing,
  getFollowers,
  getFriendActivity,
  followUser,
  unfollowUser,
} from '@/lib/api/social';

import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── UserRow sub-component ───

function UserRow({
  user: u,
  isFollowed,
  onFollow,
  onUnfollow,
  onClick,
  showBlend,
  onBlend,
}: {
  user: any;
  isFollowed: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onClick: () => void;
  showBlend?: boolean;
  onBlend?: () => void;
}) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
      <button
        onClick={onClick}
        className="flex items-center gap-3.5 flex-1 min-w-0"
      >
        <div className="w-11 h-11 rounded-full overflow-hidden bg-dark-700 ring-2 ring-white/[0.08] shrink-0 flex items-center justify-center">
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).onerror = null;
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <User size={18} className="text-white/20" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {u.display_name || u.username}
          </p>
          {u.display_name && (
            <p className="text-xs text-white/25 truncate">@{u.username}</p>
          )}
        </div>
      </button>
      <div className="flex gap-2 shrink-0">
        {showBlend && (
          <button
            onClick={onBlend}
            className="bg-gradient-to-r from-purple-500/20 to-accent/20 hover:from-purple-500/30 hover:to-accent/30 border border-purple-500/20 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Shuffle size={13} /> Blend
          </button>
        )}
        {isFollowed ? (
          <button
            onClick={onUnfollow}
            className="bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-white/50 border border-white/[0.06] px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <UserMinus size={13} /> Unfollow
          </button>
        ) : onFollow ? (
          <button
            onClick={onFollow}
            className="bg-accent hover:bg-accent/80 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <UserPlus size={13} /> Follow
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── ActivityFeed sub-component ───

function ActivityFeed({
  activity,
}: {
  activity: any[];
}) {
  const router = useRouter();

  if (activity.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        text="No activity yet. Follow some friends to see their updates!"
      />
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((a: any) => {
        const profile = a.profiles;
        return (
          <div
            key={a.id}
            className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
          >
            <div className="flex items-start gap-3.5">
              {/* Avatar */}
              <button
                onClick={() => router.push(`/profile/${a.user_id}`)}
                className="shrink-0"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-dark-700 ring-2 ring-white/[0.08] flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User size={16} className="text-white/20" />
                  )}
                </div>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => router.push(`/profile/${a.user_id}`)}
                    className="text-sm font-bold text-white hover:text-accent transition-colors"
                  >
                    {profile?.username || 'Someone'}
                  </button>
                  <span className="text-sm text-white/35">
                    {a.action === 'added' && 'added'}
                    {a.action === 'rated' && 'rated'}
                    {a.action === 'reviewed' && 'reviewed'}
                    {a.action === 'finished' && 'finished'}
                    {a.action === 'followed' && 'followed'}
                    {a.action === 'watching' && 'is watching'}
                    {!['added', 'rated', 'reviewed', 'finished', 'followed', 'watching'].includes(a.action) && a.action}
                  </span>
                  {a.title && a.action !== 'followed' && (
                    <button
                      onClick={() => {
                        if (a.media_type && a.media_id)
                          router.push(
                            `/details/${a.media_type}/${a.media_id}`,
                          );
                      }}
                      className="text-sm font-medium text-accent hover:text-accent/80 transition-colors truncate"
                    >
                      &ldquo;{a.title}&rdquo;
                    </button>
                  )}
                  {a.action === 'followed' && a.title && (
                    <span className="text-sm text-accent">{a.title}</span>
                  )}
                </div>

                {a.rating && (
                  <div className="inline-flex items-center gap-1 mt-1.5 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1" style={{ background: getRatingBg(Number(a.rating)), boxShadow: getRatingGlow(Number(a.rating)) }}>
                    <Star size={12} className="fill-current" style={{ color: getRatingHex(Number(a.rating)) }} />
                    <span className="text-xs font-bold" style={{ color: getRatingHex(Number(a.rating)) }}>
                      {a.rating}/10
                    </span>
                  </div>
                )}

                {a.review && (
                  <p className="text-xs text-white/35 mt-1.5 line-clamp-2 italic">
                    &ldquo;{a.review}&rdquo;
                  </p>
                )}

                <span className="text-[10px] text-white/15 mt-1.5 block">
                  {timeAgo(a.created_at)}
                </span>
              </div>

              {/* Poster thumbnail — bigger */}
              {a.poster_url && (
                <button
                  onClick={() => {
                    if (a.media_type && a.media_id)
                      router.push(
                        `/details/${a.media_type}/${a.media_id}`,
                      );
                  }}
                  className="shrink-0 group"
                >
                  <img
                    src={a.poster_url}
                    alt=""
                    className="w-12 h-[4.5rem] rounded-xl object-cover ring-1 ring-white/[0.08] group-hover:ring-accent/40 transition-all"
                  />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── EmptyState sub-component ───

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
}) {
  return (
    <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-10 text-center">
      <Icon size={36} className="mx-auto mb-3 text-white/[0.06]" />
      <p className="text-white/25 text-sm">{text}</p>
    </div>
  );
}

// ─── Main Page Component ───

export default function SocialPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [tab, setTab] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

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
      setFollowingIds(new Set(fing.map((f: any) => f.id)));
    } catch (err) {
      console.error('Social load error:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      const withStatus = results.map((r: any) => ({
        ...r,
        isFollowed: followingIds.has(r.id),
      }));
      setSearchResults(withStatus);
    } catch {
      toast('Search failed', 'error');
    }
    setSearching(false);
  };

  const handleFollow = async (targetId: string, username: string) => {
    try {
      await followUser(targetId);
      setFollowingIds((s) => new Set([...s, targetId]));
      setSearchResults((r) =>
        r.map((u: any) =>
          u.id === targetId ? { ...u, isFollowed: true } : u,
        ),
      );
      toast(`Following ${username}!`, 'success');
      loadData();
    } catch {
      toast('Could not follow', 'error');
    }
  };

  const handleUnfollow = async (targetId: string, username: string) => {
    try {
      await unfollowUser(targetId);
      setFollowingIds((s) => {
        const n = new Set(s);
        n.delete(targetId);
        return n;
      });
      setSearchResults((r) =>
        r.map((u: any) =>
          u.id === targetId ? { ...u, isFollowed: false } : u,
        ),
      );
      toast(`Unfollowed ${username}`, 'info');
      loadData();
    } catch {
      toast('Could not unfollow', 'error');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Users size={48} className="text-white/20" />
        <p className="text-white/40">Sign in to connect with friends</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
        >
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-accent" />
          <h1 className="text-3xl font-black">Social</h1>
        </div>
        <p className="text-white/40 text-sm">
          Find friends, see what they&apos;re watching
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by username..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Search
        </button>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white/30 mb-3 uppercase tracking-wider">
            Search Results
          </h3>
          {searchResults.map((u: any) => (
            <UserRow
              key={u.id}
              user={u}
              isFollowed={u.isFollowed}
              onFollow={() => handleFollow(u.id, u.username)}
              onUnfollow={() => handleUnfollow(u.id, u.username)}
              onClick={() => router.push(`/profile/${u.id}`)}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'feed', label: 'Activity Feed', icon: Activity },
          {
            key: 'following',
            label: `Following (${following.length})`,
            icon: Users,
          },
          {
            key: 'followers',
            label: `Followers (${followers.length})`,
            icon: Heart,
          },
        ].map((t) => (
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

      {/* Tab Content */}
      {tab === 'feed' && <ActivityFeed activity={activity} />}
      {tab === 'following' && (
        <div className="space-y-2">
          {following.length === 0 ? (
            <EmptyState
              icon={Users}
              text="You're not following anyone yet. Search for friends above!"
            />
          ) : (
            following.map((u: any) => (
              <UserRow
                key={u.id}
                user={u}
                isFollowed={true}
                onUnfollow={() => handleUnfollow(u.id, u.username)}
                onClick={() => router.push(`/profile/${u.id}`)}
                showBlend
                onBlend={() => router.push(`/profile?blend=${u.id}`)}
              />
            ))
          )}
        </div>
      )}
      {tab === 'followers' && (
        <div className="space-y-2">
          {followers.length === 0 ? (
            <EmptyState
              icon={Heart}
              text="No followers yet. Share your profile!"
            />
          ) : (
            followers.map((u: any) => (
              <UserRow
                key={u.id}
                user={u}
                isFollowed={followingIds.has(u.id)}
                onFollow={() => handleFollow(u.id, u.username)}
                onUnfollow={() => handleUnfollow(u.id, u.username)}
                onClick={() => router.push(`/profile/${u.id}`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
