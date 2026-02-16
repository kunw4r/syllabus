import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrary, removeFromLibrary, updateLibraryItem, getSmartRecommendations, discoverByMood, addToLibrary } from '../services/api';
import { Trash2, Star, MessageSquare, X, ArrowUpDown, Plus, Sparkles, BarChart3, Library, Heart, Zap, Brain, Sun, Compass, Coffee, Film, Tv, BookOpen, TrendingUp, Award, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// ─── Stats Component ───
function StatsPanel({ items }) {
  const stats = useMemo(() => {
    const total = items.length;
    const finished = items.filter(i => i.status === 'finished');
    const watching = items.filter(i => i.status === 'watching');
    const want = items.filter(i => i.status === 'want');
    const movies = items.filter(i => i.media_type === 'movie');
    const tv = items.filter(i => i.media_type === 'tv');
    const books = items.filter(i => i.media_type === 'book');
    const rated = finished.filter(i => i.user_rating);
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, i) => sum + i.user_rating, 0) / rated.length).toFixed(1)
      : null;

    // Genre breakdown from genres string
    const genreCounts = {};
    items.forEach(i => {
      if (i.genres) {
        i.genres.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Highest rated by user
    const topRated = [...finished]
      .filter(i => i.user_rating)
      .sort((a, b) => b.user_rating - a.user_rating)
      .slice(0, 3);

    return { total, finished: finished.length, watching: watching.length, want: want.length,
      movies: movies.length, tv: tv.length, books: books.length,
      avgRating, topGenres, topRated, rated: rated.length };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Main stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Library} label="Total" value={stats.total} color="text-accent" />
        <StatCard icon={CheckCircle2} label="Finished" value={stats.finished} color="text-green-400" />
        <StatCard icon={Eye} label="In Progress" value={stats.watching} color="text-blue-400" />
        <StatCard icon={Clock} label="Wishlist" value={stats.want} color="text-purple-400" />
      </div>

      {/* Media breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Film} label="Movies" value={stats.movies} color="text-rose-400" />
        <StatCard icon={Tv} label="TV Shows" value={stats.tv} color="text-cyan-400" />
        <StatCard icon={BookOpen} label="Books" value={stats.books} color="text-amber-400" />
      </div>

      {/* Rating stats + top genres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average rating */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3 flex items-center gap-2">
            <Star size={14} className="text-gold" /> Your Rating Stats
          </h3>
          {stats.avgRating ? (
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-gold">{stats.avgRating}</span>
                <span className="text-white/30 text-sm">/10 average</span>
              </div>
              <p className="text-xs text-white/30">{stats.rated} items rated</p>
            </div>
          ) : (
            <p className="text-sm text-white/30">Rate your finished items to see stats</p>
          )}
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
                      <div
                        className="h-full bg-accent/60 rounded-full transition-all"
                        style={{ width: `${(count / stats.topGenres[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30">Add items with genres to see breakdown</p>
          )}
        </div>
      </div>

      {/* Top rated by you */}
      {stats.topRated.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Award size={14} className="text-gold" /> Your Highest Rated
          </h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {stats.topRated.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 min-w-[200px]">
                <span className="text-2xl font-black text-white/10">#{idx + 1}</span>
                {item.poster_path && (
                  <img src={item.poster_path} alt="" className="w-10 h-14 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold truncate max-w-[120px]">{item.title}</p>
                  <p className="text-xs text-gold font-bold">{item.user_rating}/10</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <Icon size={20} className={color} />
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}

// ─── For You Component ───
function ForYouPanel({ items, navigate }) {
  const [recs, setRecs] = useState([]);
  const [moodPicks, setMoodPicks] = useState([]);
  const [activeMood, setActiveMood] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingMood, setLoadingMood] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const moods = [
    { key: 'light', label: 'Something Light', icon: Sun, color: 'text-yellow-400', desc: 'Comedy, family, feel-good' },
    { key: 'dark', label: 'Dark & Intense', icon: Zap, color: 'text-red-400', desc: 'Action, thriller, horror' },
    { key: 'mind', label: 'Mind-Bending', icon: Brain, color: 'text-purple-400', desc: 'Sci-fi, mystery, fantasy' },
    { key: 'feel', label: 'Feel Good', icon: Heart, color: 'text-pink-400', desc: 'Romance, drama, heartfelt' },
    { key: 'adventure', label: 'Adventure', icon: Compass, color: 'text-emerald-400', desc: 'Epic journeys & quests' },
    { key: 'chill', label: 'Chill & Learn', icon: Coffee, color: 'text-sky-400', desc: 'Docs, history, reality' },
  ];

  useEffect(() => {
    async function loadRecs() {
      setLoadingRecs(true);
      const data = await getSmartRecommendations(items);
      setRecs(data);
      setLoadingRecs(false);
    }
    if (items.length > 0) loadRecs();
    else setLoadingRecs(false);
  }, [items]);

  const handleMood = async (mood) => {
    setActiveMood(mood);
    setLoadingMood(true);
    const [movies, tv] = await Promise.all([
      discoverByMood(mood, 'movie'),
      discoverByMood(mood, 'tv'),
    ]);
    const combined = [
      ...movies.map(m => ({ ...m, media_type: 'movie' })),
      ...tv.map(t => ({ ...t, media_type: 'tv' })),
    ].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    const libIds = new Set(items.map(i => String(i.tmdb_id)));
    setMoodPicks(combined.filter(r => !libIds.has(String(r.id))).slice(0, 20));
    setLoadingMood(false);
  };

  const handleQuickAdd = async (item) => {
    if (!user) return toast('Please log in first', 'error');
    const title = item.title || item.name;
    try {
      await addToLibrary({
        tmdb_id: item.id,
        media_type: item.media_type,
        title,
        poster_path: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
        overview: item.overview || '',
        external_rating: item.vote_average || null,
        genres: item.genre_ids ? item.genre_ids.join(',') : '',
        release_date: item.release_date || item.first_air_date || '',
      });
      toast(`Added "${title}" to your library!`, 'success');
    } catch {
      toast('Could not add — might already be in your library.', 'error');
    }
  };

  const handleClick = (item) => {
    navigate(`/details/${item.media_type}/${item.id}`);
  };

  return (
    <div className="space-y-8">
      {/* AI Recommendations */}
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Sparkles size={20} className="text-accent" />
          Recommended For You
        </h2>
        <p className="text-sm text-white/40 mb-5">Based on your highest-rated and currently watching</p>

        {loadingRecs ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[160px] aspect-[2/3] rounded-2xl bg-dark-700 animate-pulse" />
            ))}
          </div>
        ) : recs.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {recs.map(item => (
              <RecCard key={`${item.media_type}-${item.id}`} item={item} onClick={() => handleClick(item)} onAdd={() => handleQuickAdd(item)} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <Sparkles size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">Finish and rate some items to get personalized picks</p>
          </div>
        )}
      </div>

      {/* Mood-based Discovery */}
      <div>
        <h2 className="text-xl font-bold mb-1">Switch It Up</h2>
        <p className="text-sm text-white/40 mb-5">Not in your usual mood? Pick a vibe and discover something new</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {moods.map(mood => (
            <button
              key={mood.key}
              onClick={() => handleMood(mood.key)}
              className={`glass rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
                activeMood === mood.key ? 'border-accent/50 bg-accent/10' : 'hover:border-white/20'
              }`}
            >
              <mood.icon size={24} className={`${mood.color} mb-2`} />
              <p className="text-sm font-semibold">{mood.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{mood.desc}</p>
            </button>
          ))}
        </div>

        {loadingMood ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[160px] aspect-[2/3] rounded-2xl bg-dark-700 animate-pulse" />
            ))}
          </div>
        ) : moodPicks.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {moodPicks.map(item => (
              <RecCard key={`${item.media_type}-${item.id}`} item={item} onClick={() => handleClick(item)} onAdd={() => handleQuickAdd(item)} />
            ))}
          </div>
        ) : activeMood ? (
          <p className="text-sm text-white/30 text-center py-8">No picks found — try another mood!</p>
        ) : null}
      </div>
    </div>
  );
}

function RecCard({ item, onClick, onAdd }) {
  const title = item.title || item.name;
  return (
    <div
      className="min-w-[160px] max-w-[160px] group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/10 shrink-0"
      onClick={onClick}
    >
      {item.poster_path ? (
        <img src={`${TMDB_IMG}${item.poster_path}`} alt={title} loading="lazy" className="w-full aspect-[2/3] object-cover" />
      ) : (
        <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-3 text-center">{title}</div>
      )}
      {item.vote_average > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold">
          <Star size={10} className="text-gold fill-gold" />
          {Number(item.vote_average).toFixed(1)}
        </div>
      )}
      {item._source && (
        <div className="absolute top-2 left-2 bg-accent/80 backdrop-blur-md rounded-lg px-1.5 py-0.5 text-[9px] font-medium max-w-[100px] truncate">
          ∵ {item._source}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="absolute bottom-14 right-2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
      >
        <Plus size={16} />
      </button>
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate">{title}</p>
        <p className="text-[10px] text-white/30 capitalize">{item.media_type}</p>
      </div>
    </div>
  );
}

// ─── Main Library Component ───
function MyLibrary() {
  const [allItems, setAllItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('added');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [activeTab, setActiveTab] = useState('shelf');
  const toast = useToast();
  const navigate = useNavigate();

  const loadLibrary = async () => {
    const data = await getLibrary();
    setAllItems(data);
    setLoading(false);
  };

  useEffect(() => { loadLibrary(); }, []);

  // Client-side filter + sort
  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (typeFilter !== 'all') result = result.filter(i => i.media_type === typeFilter);
    if (filter !== 'all') result = result.filter(i => i.status === filter);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'added':
          cmp = new Date(a.added_at) - new Date(b.added_at);
          break;
        case 'rating':
          cmp = (a.user_rating || 0) - (b.user_rating || 0);
          break;
        case 'external':
          cmp = (a.external_rating || 0) - (b.external_rating || 0);
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [allItems, typeFilter, filter, sortBy, sortDir]);

  const handleRemove = async (id) => {
    const item = allItems.find(i => i.id === id);
    await removeFromLibrary(id);
    toast(`Removed "${item?.title || 'item'}" from library`, 'success');
    loadLibrary();
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateLibraryItem(id, { status: newStatus });
    const item = allItems.find(i => i.id === id);
    toast(`"${item?.title}" → ${newStatus === 'want' ? 'Wishlist' : newStatus === 'watching' ? 'In Progress' : 'Finished'}`, 'info');
    loadLibrary();
  };

  const openReview = (item) => {
    setReviewItem(item);
    setReviewText(item.review || '');
    setUserRating(item.user_rating || 0);
  };

  const saveReview = async () => {
    await updateLibraryItem(reviewItem.id, { user_rating: userRating || null, review: reviewText });
    toast('Review saved!', 'success');
    setReviewItem(null);
    loadLibrary();
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleCardClick = (item) => {
    if (item.media_type === 'book') {
      const workKey = item.openlibrary_key?.replace('/works/', '') || '';
      if (workKey) navigate(`/details/book/${workKey}`);
    } else {
      navigate(`/details/${item.media_type}/${item.tmdb_id}`);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  const tabs = [
    { key: 'shelf', label: 'My Shelf', icon: Library },
    { key: 'foryou', label: 'For You', icon: Sparkles },
    { key: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  const typeLabels = { all: 'All', movie: 'Movies', tv: 'TV Shows', book: 'Books' };
  const statusLabels = { all: 'All', want: 'Wishlist', watching: 'In Progress', finished: 'Finished' };
  const sortLabels = { added: 'Date Added', rating: 'Your Rating', external: 'Score', title: 'Title' };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Library</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-dark-700/50 rounded-2xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Shelf Tab ─── */}
      {activeTab === 'shelf' && (
        <div>
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1.5">
              {Object.entries(typeLabels).map(([key, label]) => (
                <button key={key} onClick={() => setTypeFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    typeFilter === key ? 'bg-accent border-accent text-white' : 'border-white/10 text-white/40 hover:text-white'
                  }`}>{label}</button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10 hidden sm:block" />

            <div className="flex gap-1.5">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filter === key ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/30 hover:text-white/60'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Sort row */}
          <div className="flex items-center gap-2 mb-6">
            <ArrowUpDown size={14} className="text-white/30" />
            <span className="text-xs text-white/30">Sort:</span>
            {Object.entries(sortLabels).map(([key, label]) => (
              <button key={key} onClick={() => toggleSort(key)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  sortBy === key ? 'bg-white/10 text-white font-medium' : 'text-white/30 hover:text-white/60'
                }`}>
                {label} {sortBy === key && (sortDir === 'desc' ? '↓' : '↑')}
              </button>
            ))}
          </div>

          {/* Items grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 text-white/40">
              <Library size={40} className="mx-auto mb-3 text-white/10" />
              <h3 className="text-lg font-medium text-white/60 mb-2">Nothing here yet</h3>
              <p className="text-sm">Browse movies, TV shows, or books and add them to your library</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 transition-all duration-300 hover:border-white/10 hover:-translate-y-1 cursor-pointer" onClick={() => handleCardClick(item)}>
                  {item.poster_path ? (
                    <img src={item.poster_path} alt={item.title} loading="lazy" className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-4 text-center">{item.title}</div>
                  )}

                  {item.external_rating > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold">
                      <Star size={10} className="text-gold fill-gold" />
                      {Number(item.external_rating).toFixed(1)}
                    </div>
                  )}

                  {item.user_rating && (
                    <div className="absolute top-2.5 left-2.5 bg-accent/80 backdrop-blur-md rounded-lg px-1.5 py-0.5 text-xs font-bold">
                      {item.user_rating}/10
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`absolute bottom-[88px] left-2.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.status === 'finished' ? 'bg-green-500/80' :
                    item.status === 'watching' ? 'bg-blue-500/80' :
                    'bg-purple-500/80'
                  }`}>
                    {item.status === 'want' ? 'wishlist' : item.status === 'watching' ? 'watching' : 'done'}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openReview(item); }} title="Rate & Review"
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-accent transition-colors">
                      <MessageSquare size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }} title="Remove"
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <select
                        value={item.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }}
                        className="bg-dark-600 text-white/70 border border-white/10 rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-accent/50"
                      >
                        <option value="want">Wishlist</option>
                        <option value="watching">In Progress</option>
                        <option value="finished">Finished</option>
                      </select>
                    </div>
                    {item.review && (
                      <p className="text-xs text-white/30 mt-2 line-clamp-2 italic">"{item.review}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── For You Tab ─── */}
      {activeTab === 'foryou' && (
        <ForYouPanel items={allItems} navigate={navigate} />
      )}

      {/* ─── Stats Tab ─── */}
      {activeTab === 'stats' && (
        <StatsPanel items={allItems} />
      )}

      {/* ─── Review Modal ─── */}
      {reviewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewItem(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rate & Review</h3>
              <button onClick={() => setReviewItem(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {reviewItem.poster_path && (
                <img src={reviewItem.poster_path} alt="" className="w-12 h-16 rounded-lg object-cover" />
              )}
              <div>
                <p className="font-semibold">{reviewItem.title}</p>
                <p className="text-xs text-white/40 capitalize">{reviewItem.media_type}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-5">
              <label className="text-xs text-white/40 block mb-2">Your Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setUserRating(n)}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all duration-150 ${
                      n <= userRating ? 'bg-accent text-white' : 'bg-dark-600 text-white/30 hover:bg-dark-500'
                    }`}>{n}</button>
                ))}
              </div>
              {userRating > 0 && (
                <p className="text-xs text-white/30 mt-1.5 text-center">
                  {userRating <= 3 ? 'Not great' : userRating <= 5 ? 'Okay' : userRating <= 7 ? 'Good' : userRating <= 9 ? 'Amazing' : 'Masterpiece'}
                </p>
              )}
            </div>

            {/* Review text */}
            <div className="mb-6">
              <label className="text-xs text-white/40 block mb-2">Your Thoughts (optional)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think? No spoilers..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-2">
              {userRating > 0 && (
                <button onClick={() => { setUserRating(0); setReviewText(''); }}
                  className="btn-secondary flex-1">Clear</button>
              )}
              <button onClick={saveReview} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyLibrary;
