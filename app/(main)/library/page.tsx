'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Star,
  X,
  ArrowUpDown,
  Plus,
  Sparkles,
  BarChart3,
  Library,
  Heart,
  Zap,
  Brain,
  Sun,
  Compass,
  Coffee,
  Film,
  Tv,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  Eye,
  CheckCircle2,
  Search,
  Flame,
} from 'lucide-react';
import { m } from 'framer-motion';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  getLibrary,
  removeFromLibrary,
  updateLibraryItem,
  addToLibrary,
} from '@/lib/api/library';
import {
  getSmartRecommendations,
  discoverByMood,
  getCuratedPicks,
  searchByScenario,
} from '@/lib/api/tmdb';
import { TMDB_IMG } from '@/lib/constants';
import { FadeInView } from '@/components/motion/FadeInView';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';
import DragDropShelf from '@/components/library/DragDropShelf';
import VirtualShelf from '@/components/library/VirtualShelf';

/* ================================================================
   STATS PANEL
   ================================================================ */

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}</>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <Icon size={20} className={color} />
      <div>
        <p className="text-2xl font-black"><AnimatedNumber value={value} /></p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}

function StatsPanel({ items }: { items: any[] }) {
  const stats = useMemo(() => {
    const total = items.length;
    const finished = items.filter((i) => i.status === 'finished');
    const watching = items.filter((i) => i.status === 'watching');
    const want = items.filter((i) => i.status === 'want');
    const movies = items.filter((i) => i.media_type === 'movie');
    const tv = items.filter((i) => i.media_type === 'tv');
    const books = items.filter((i) => i.media_type === 'book');
    const rated = items.filter((i) => i.user_rating);
    const avgRating = rated.length
      ? (
          rated.reduce((s, i) => s + i.user_rating, 0) / rated.length
        ).toFixed(1)
      : null;

    const genreCounts: Record<string, number> = {};
    items.forEach((i) => {
      if (i.genres)
        i.genres
          .split(',')
          .map((g: string) => g.trim())
          .filter(Boolean)
          .forEach((g: string) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRated = [...items]
      .filter((i) => i.user_rating)
      .sort((a, b) => b.user_rating - a.user_rating)
      .slice(0, 3);

    return {
      total,
      finished: finished.length,
      watching: watching.length,
      want: want.length,
      movies: movies.length,
      tv: tv.length,
      books: books.length,
      avgRating,
      topGenres,
      topRated,
      rated: rated.length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StaggerItem>
          <StatCard icon={Library} label="Total" value={stats.total} color="text-accent" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={CheckCircle2} label="Finished" value={stats.finished} color="text-green-400" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Eye} label="In Progress" value={stats.watching} color="text-blue-400" />
        </StaggerItem>
        <StaggerItem>
          <StatCard icon={Clock} label="Wishlist" value={stats.want} color="text-purple-400" />
        </StaggerItem>
      </StaggerContainer>

      {/* Completion radial + media type breakdown */}
      <FadeInView delay={0.2}>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4">Library Breakdown</h3>
          <div className="flex items-center gap-6">
            {/* Radial completion chart */}
            <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
              <svg width={80} height={80} className="-rotate-90">
                <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                <circle
                  cx={40} cy={40} r={34} fill="none" stroke="#22c55e" strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 - (stats.total > 0 ? (stats.finished / stats.total) : 0) * 2 * Math.PI * 34}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black">{stats.total > 0 ? Math.round((stats.finished / stats.total) * 100) : 0}%</span>
                <span className="text-[8px] text-white/30">done</span>
              </div>
            </div>
            {/* Type bars */}
            <div className="flex-1 space-y-2">
              {[
                { label: 'Movies', count: stats.movies, color: 'bg-rose-400', icon: Film },
                { label: 'TV Shows', count: stats.tv, color: 'bg-cyan-400', icon: Tv },
                { label: 'Books', count: stats.books, color: 'bg-amber-400', icon: BookOpen },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <t.icon size={14} className="text-white/30 flex-shrink-0" />
                  <span className="text-xs text-white/50 w-16">{t.label}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: stats.total > 0 ? `${(t.count / stats.total) * 100}%` : '0%' }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${t.color}`}
                    />
                  </div>
                  <span className="text-xs font-bold text-white/60 w-6 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeInView>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3 flex items-center gap-2">
            <Star size={14} className="text-gold" /> Your Rating Stats
          </h3>
          {stats.avgRating ? (
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-gold">
                  {stats.avgRating}
                </span>
                <span className="text-white/30 text-sm">/10 average</span>
              </div>
              <p className="text-xs text-white/30">
                {stats.rated} items rated
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/30">Rate items to see stats</p>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" /> Top Genres
          </h3>
          {stats.topGenres.length > 0 ? (
            <div className="space-y-2">
              {stats.topGenres.map(([genre, count], idx) => (
                <div key={genre} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/20 w-4">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-white/70">{genre}</span>
                      <span className="text-xs text-white/30">{count}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full transition-all"
                        style={{
                          width: `${(count / stats.topGenres[0][1]) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30">
              Add items with genres to see breakdown
            </p>
          )}
        </div>
      </div>
      {stats.topRated.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/40 mb-4 flex items-center gap-2">
            <Award size={14} className="text-gold" /> Your Highest Rated
          </h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {stats.topRated.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 min-w-[200px]"
              >
                <span className="text-2xl font-black text-white/10">
                  #{idx + 1}
                </span>
                {item.poster_url && (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="w-10 h-14 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold truncate max-w-[120px]">
                    {item.title}
                  </p>
                  <p className="text-xs text-gold font-bold">
                    {item.user_rating}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   REC CARD (shared between ForYou sections)
   ================================================================ */

function RecCard({
  item,
  onClick,
  onAdd,
}: {
  item: any;
  onClick: () => void;
  onAdd: () => void;
}) {
  const title = item.title || item.name;
  return (
    <div
      className="min-w-[160px] max-w-[160px] group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/10 shrink-0"
      onClick={onClick}
    >
      {item.poster_path ? (
        <img
          src={
            item.poster_path?.startsWith('http')
              ? item.poster_path
              : `${TMDB_IMG}${item.poster_path}`
          }
          alt={title}
          loading="lazy"
          className="w-full aspect-[2/3] object-cover"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-3 text-center">
          {title}
        </div>
      )}
      {(item.unified_rating || item.vote_average) > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold">
          <Star size={12} className="text-gold fill-gold" />
          {Number(item.unified_rating ?? item.vote_average).toFixed(1)}
        </div>
      )}
      {item._source && (
        <div className="absolute top-2 left-2 bg-accent/80 backdrop-blur-md rounded-lg px-1.5 py-0.5 text-[9px] font-medium max-w-[100px] truncate">
          &because; {item._source}
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute bottom-14 right-2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
      >
        <Plus size={16} />
      </button>
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate">{title}</p>
        <p className="text-[10px] text-white/30 capitalize">
          {item.media_type}
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   FOR YOU PANEL (AI recs + curated + mood + scenario search)
   ================================================================ */

function ForYouPanel({ items }: { items: any[] }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [recs, setRecs] = useState<any[]>([]);
  const [moodPicks, setMoodPicks] = useState<any[]>([]);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingMood, setLoadingMood] = useState(false);

  // Curated picks
  const [curatedPicks, setCuratedPicks] = useState<any[]>([]);
  const [curatedGenre, setCuratedGenre] = useState('all');
  const [loadingCurated, setLoadingCurated] = useState(true);

  // Scenario search
  const [scenarioQuery, setScenarioQuery] = useState('');
  const [scenarioResults, setScenarioResults] = useState<any[]>([]);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [searchedFor, setSearchedFor] = useState('');

  const moods = [
    {
      key: 'light',
      label: 'Something Light',
      icon: Sun,
      color: 'text-yellow-400',
      desc: 'Comedy, family, feel-good',
    },
    {
      key: 'dark',
      label: 'Dark & Intense',
      icon: Zap,
      color: 'text-red-400',
      desc: 'Action, thriller, horror',
    },
    {
      key: 'mind',
      label: 'Mind-Bending',
      icon: Brain,
      color: 'text-purple-400',
      desc: 'Sci-fi, mystery, fantasy',
    },
    {
      key: 'feel',
      label: 'Feel Good',
      icon: Heart,
      color: 'text-pink-400',
      desc: 'Romance, drama, heartfelt',
    },
    {
      key: 'adventure',
      label: 'Adventure',
      icon: Compass,
      color: 'text-emerald-400',
      desc: 'Epic journeys & quests',
    },
    {
      key: 'chill',
      label: 'Chill & Learn',
      icon: Coffee,
      color: 'text-sky-400',
      desc: 'Docs, history, reality',
    },
  ];

  const genreTabs = [
    { key: 'all', label: 'All' },
    { key: 'action', label: 'Action' },
    { key: 'comedy', label: 'Comedy' },
    { key: 'drama', label: 'Drama' },
    { key: 'scifi', label: 'Sci-Fi' },
    { key: 'thriller', label: 'Thriller' },
    { key: 'romance', label: 'Romance' },
    { key: 'horror', label: 'Horror' },
    { key: 'animation', label: 'Animation' },
    { key: 'documentary', label: 'Docs' },
  ];

  const scenarioExamples = [
    'Date night movie',
    'Family film for the weekend',
    'Something to take my mind off things',
    'Feel good comedy',
    'Mind-bending sci-fi',
    'True story drama',
    'Heist thriller',
  ];

  // Load AI recs
  useEffect(() => {
    if (items.length > 0) {
      setLoadingRecs(true);
      getSmartRecommendations(items).then((d) => {
        setRecs(d);
        setLoadingRecs(false);
      });
    } else setLoadingRecs(false);
  }, [items]);

  // Load curated picks when genre changes
  useEffect(() => {
    setLoadingCurated(true);
    getCuratedPicks(curatedGenre).then((d) => {
      const libIds = new Set(items.map((i) => String(i.tmdb_id)));
      setCuratedPicks(
        d.filter((r: any) => !libIds.has(String(r.id))).slice(0, 20),
      );
      setLoadingCurated(false);
    });
  }, [curatedGenre, items]);

  const handleMood = async (mood: string) => {
    setActiveMood(mood);
    setLoadingMood(true);
    const [movies, tv] = await Promise.all([
      discoverByMood(mood, 'movie'),
      discoverByMood(mood, 'tv'),
    ]);
    const combined = [
      ...movies.map((m: any) => ({ ...m, media_type: 'movie' })),
      ...tv.map((t: any) => ({ ...t, media_type: 'tv' })),
    ].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    const libIds = new Set(items.map((i) => String(i.tmdb_id)));
    setMoodPicks(
      combined.filter((r) => !libIds.has(String(r.id))).slice(0, 20),
    );
    setLoadingMood(false);
  };

  const handleScenarioSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = scenarioQuery.trim();
    if (!q) return;
    setLoadingScenario(true);
    setSearchedFor(q);
    const results = await searchByScenario(q);
    const libIds = new Set(items.map((i) => String(i.tmdb_id)));
    setScenarioResults(
      results.filter((r: any) => !libIds.has(String(r.id))),
    );
    setLoadingScenario(false);
  };

  const handleQuickAdd = async (item: any) => {
    if (!user) return toast('Please log in first', 'error');
    const title = item.title || item.name;
    try {
      await addToLibrary({
        tmdb_id: item.id,
        media_type: item.media_type || 'movie',
        title,
        poster_url: item.poster_path
          ? `${TMDB_IMG}${item.poster_path}`
          : null,
        external_rating: item.vote_average || null,
        genres: item.genre_ids ? item.genre_ids.join(',') : '',
      });
      toast(`Added "${title}" to your library!`, 'success');
    } catch (err: any) {
      toast(
        err?.message === 'Already in your library'
          ? `"${title}" is already in your library`
          : 'Could not add',
        'error',
      );
    }
  };

  const handleClick = (item: any) =>
    router.push(`/details/${item.media_type || 'movie'}/${item.id}`);

  const SkeletonRowLocal = () => (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="min-w-[160px] aspect-[2/3] rounded-2xl bg-dark-700 animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      {/* AI Scenario Search */}
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Search size={20} className="text-accent" />
          What Are You In The Mood For?
        </h2>
        <p className="text-sm text-white/40 mb-4">
          Describe what you&apos;re looking for and we&apos;ll find the perfect
          pick
        </p>

        <form onSubmit={handleScenarioSearch} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={scenarioQuery}
              onChange={(e) => setScenarioQuery(e.target.value)}
              placeholder="e.g. date night, family film, something mind-bending..."
              className="input-field pl-10 w-full"
            />
          </div>
          <button
            type="submit"
            disabled={loadingScenario || !scenarioQuery.trim()}
            className="btn-primary px-5 flex items-center gap-2 whitespace-nowrap disabled:opacity-40"
          >
            <Sparkles size={16} />
            Find
          </button>
        </form>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {scenarioExamples.map((ex) => (
            <button
              key={ex}
              onClick={() => setScenarioQuery(ex)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>

        {loadingScenario ? (
          <SkeletonRowLocal />
        ) : scenarioResults.length > 0 ? (
          <div>
            <p className="text-xs text-white/30 mb-3">
              Results for &ldquo;
              <span className="text-white/60">{searchedFor}</span>&rdquo;
            </p>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {scenarioResults.map((item) => (
                <RecCard
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  onClick={() => handleClick(item)}
                  onAdd={() => handleQuickAdd(item)}
                />
              ))}
            </div>
          </div>
        ) : searchedFor ? (
          <p className="text-sm text-white/30 text-center py-4">
            No results -- try describing it differently!
          </p>
        ) : null}
      </div>

      {/* Curated Must-Watch */}
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Flame size={20} className="text-orange-400" />
          Must Watch
        </h2>
        <p className="text-sm text-white/40 mb-4">
          Highly-rated films loved by critics and audiences -- all 6+ on IMDB
        </p>

        {/* Genre tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-4">
          {genreTabs.map((gTab) => (
            <button
              key={gTab.key}
              onClick={() => setCuratedGenre(gTab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-all ${
                curatedGenre === gTab.key
                  ? 'bg-accent border-accent text-white'
                  : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
              }`}
            >
              {gTab.label}
            </button>
          ))}
        </div>

        {loadingCurated ? (
          <SkeletonRowLocal />
        ) : curatedPicks.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {curatedPicks.map((item) => (
              <RecCard
                key={`curated-${item.id}`}
                item={{ ...item, media_type: 'movie' }}
                onClick={() => router.push(`/details/movie/${item.id}`)}
                onAdd={() =>
                  handleQuickAdd({ ...item, media_type: 'movie' })
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30 text-center py-6">
            No picks found for this genre
          </p>
        )}
      </div>

      {/* AI Recommendations */}
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Sparkles size={20} className="text-accent" />
          Recommended For You
        </h2>
        <p className="text-sm text-white/40 mb-5">
          Based on your highest-rated and currently watching
        </p>

        {loadingRecs ? (
          <SkeletonRowLocal />
        ) : recs.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {recs.map((item) => (
              <RecCard
                key={`${item.media_type}-${item.id}`}
                item={item}
                onClick={() => handleClick(item)}
                onAdd={() => handleQuickAdd(item)}
              />
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <Sparkles size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">
              Finish and rate some items to get personalized picks
            </p>
          </div>
        )}
      </div>

      {/* Mood Discovery */}
      <div>
        <h2 className="text-xl font-bold mb-1">Switch It Up</h2>
        <p className="text-sm text-white/40 mb-5">
          Pick a vibe and discover something new
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {moods.map((mood) => (
            <button
              key={mood.key}
              onClick={() => handleMood(mood.key)}
              className={`glass rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
                activeMood === mood.key
                  ? 'border-accent/50 bg-accent/10'
                  : 'hover:border-white/20'
              }`}
            >
              <mood.icon size={24} className={`${mood.color} mb-2`} />
              <p className="text-sm font-semibold">{mood.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{mood.desc}</p>
            </button>
          ))}
        </div>

        {loadingMood ? (
          <SkeletonRowLocal />
        ) : moodPicks.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {moodPicks.map((item) => (
              <RecCard
                key={`${item.media_type}-${item.id}`}
                item={item}
                onClick={() => handleClick(item)}
                onAdd={() => handleQuickAdd(item)}
              />
            ))}
          </div>
        ) : activeMood ? (
          <p className="text-sm text-white/30 text-center py-8">
            No picks found -- try another mood!
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN LIBRARY COMPONENT
   ================================================================ */

export default function LibraryPage() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('added');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('watching');
  const [activeTab, setActiveTab] = useState('shelf');
  const [viewMode, setViewMode] = useState<'grid' | 'shelf' | 'kanban'>('grid');
  const toast = useToast();
  const router = useRouter();

  const loadLibrary = useCallback(async () => {
    try {
      const data = await getLibrary();
      setAllItems(data);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (typeFilter !== 'all')
      result = result.filter((i) => i.media_type === typeFilter);
    if (filter !== 'all') result = result.filter((i) => i.status === filter);
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'added':
          cmp =
            new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
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

  const handleRemove = async (id: string) => {
    const item = allItems.find((i) => i.id === id);
    try {
      await removeFromLibrary(id);
      toast(`Removed "${item?.title || 'item'}" from library`, 'success');
      loadLibrary();
    } catch (err: any) {
      console.error('Remove failed:', err);
      toast(err?.message || 'Failed to remove -- try again', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateLibraryItem(id, { status: newStatus });
      const item = allItems.find((i) => i.id === id);
      toast(
        `"${item?.title}" \u2192 ${newStatus === 'want' ? 'Wishlist' : newStatus === 'watching' ? 'In Progress' : 'Finished'}`,
        'info',
      );
      loadLibrary();
    } catch (err: any) {
      console.error('Status update failed:', err);
      toast(err?.message || 'Failed to update status', 'error');
    }
  };

  const openReview = (item: any) => {
    setReviewItem(item);
    setReviewText(item.review || '');
    setUserRating(item.user_rating || 0);
    setReviewStatus(item.status || 'watching');
  };

  const saveReview = async () => {
    try {
      await updateLibraryItem(reviewItem.id, {
        user_rating: userRating || null,
        review: reviewText,
        status: reviewStatus,
      });
      toast('Saved!', 'success');
      setReviewItem(null);
      loadLibrary();
    } catch (err) {
      console.error('Save failed:', err);
      toast('Failed to save -- please try again', 'error');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field)
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleCardClick = (item: any) => {
    if (item.media_type === 'book') {
      const workKey = item.openlibrary_key?.replace('/works/', '') || '';
      if (workKey) router.push(`/details/book/${workKey}`);
    } else router.push(`/details/${item.media_type}/${item.tmdb_id}`);
  };

  // Rating label based on value
  const getRatingLabel = (val: number): string => {
    if (!val || val === 0) return '';
    if (val <= 2) return 'Terrible';
    if (val <= 4) return 'Not great';
    if (val <= 5) return 'Okay';
    if (val <= 6.5) return 'Decent';
    if (val <= 7.5) return 'Good';
    if (val <= 8.5) return 'Great';
    if (val <= 9.5) return 'Amazing';
    return 'Masterpiece';
  };

  // Rating color gradient
  const getRatingColor = (val: number): string => {
    if (val <= 3) return 'from-red-500 to-red-600';
    if (val <= 5) return 'from-orange-500 to-amber-500';
    if (val <= 7) return 'from-yellow-500 to-lime-500';
    if (val <= 9) return 'from-green-400 to-emerald-500';
    return 'from-emerald-400 to-cyan-400';
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );

  const tabs = [
    { key: 'shelf', label: 'My Shelf', icon: Library },
    { key: 'foryou', label: 'For You', icon: Sparkles },
    { key: 'stats', label: 'Stats', icon: BarChart3 },
  ];
  const typeLabels: Record<string, string> = {
    all: 'All',
    movie: 'Movies',
    tv: 'TV Shows',
    book: 'Books',
  };
  const statusLabels: Record<string, string> = {
    all: 'All',
    want: 'Wishlist',
    watching: 'In Progress',
    finished: 'Finished',
  };
  const sortLabels: Record<string, string> = {
    added: 'Date Added',
    rating: 'Your Rating',
    external: 'Score',
    title: 'Title',
  };

  // Pinned favourites (rated 9+)
  const pinnedFavourites = useMemo(() => {
    return [...allItems]
      .filter((i) => i.user_rating && i.user_rating >= 9)
      .sort((a, b) => b.user_rating - a.user_rating)
      .slice(0, 5);
  }, [allItems]);

  return (
    <div>
      <FadeInView>
        <h1 className="font-serif text-3xl font-bold mb-6">My Library</h1>
      </FadeInView>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-dark-700/50 rounded-2xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === t.key
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Shelf Tab */}
      {activeTab === 'shelf' && (
        <div>
          {/* Pinned Favourites */}
          {pinnedFavourites.length > 0 && (
            <FadeInView>
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-white/40 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Award size={14} className="text-gold" /> Top Rated
                </h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {pinnedFavourites.map((item) => (
                    <div
                      key={item.id}
                      className="shrink-0 w-[160px] sm:w-[200px] cursor-pointer group"
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden ring-2 ring-gold/30 group-hover:ring-gold/60 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-gold/10 relative">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                            {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-gold/90 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
                          <Star size={12} className="text-dark-900 fill-dark-900" />
                          <span className="text-xs font-black text-dark-900">
                            {Number(item.user_rating) % 1 === 0 ? item.user_rating : Number(item.user_rating).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white/70 truncate group-hover:text-gold transition-colors">
                        {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInView>
          )}

          {/* Floating Pill Filter Bar */}
          <div className="sticky top-0 z-20 py-3 -mx-4 px-4 bg-dark-900/80 backdrop-blur-xl border-b border-white/[0.04]">
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(typeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    typeFilter === key
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10" />
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    filter === key
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-white/30 hover:text-white/60 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10" />
              {Object.entries(sortLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                    sortBy === key
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/25 hover:text-white/50'
                  }`}
                >
                  {label} {sortBy === key && (sortDir === 'desc' ? '\u2193' : '\u2191')}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10 ml-auto" />
              {/* View toggle */}
              {(['grid', 'shelf', 'kanban'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] capitalize transition-all ${
                    viewMode === v ? 'bg-accent/20 text-accent font-medium' : 'text-white/25 hover:text-white/50'
                  }`}
                >
                  {v === 'kanban' ? 'Board' : v === 'shelf' ? 'Shelf' : 'Grid'}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-20 text-white/40">
              <Library size={40} className="mx-auto mb-3 text-white/10" />
              <h3 className="text-lg font-medium text-white/60 mb-2">
                Nothing here yet
              </h3>
              <p className="text-sm">
                Browse movies, TV shows, or books and add them to your library
              </p>
            </div>
          ) : viewMode === 'kanban' ? (
            <DragDropShelf
              items={filteredItems}
              onStatusChange={handleStatusChange}
              onCardClick={handleCardClick}
            />
          ) : viewMode === 'shelf' ? (
            <VirtualShelf items={filteredItems} onCardClick={handleCardClick} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 transition-all duration-300 hover:border-white/10 cursor-pointer hover:[transform:perspective(800px)_rotateY(-3deg)_rotateX(2deg)_scale(1.02)] hover:shadow-xl hover:shadow-black/30"
                  onClick={() => handleCardClick(item)}
                >
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-4 text-center">
                      {item.title}
                    </div>
                  )}
                  {item.external_rating > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold">
                      <Star size={12} className="text-gold fill-gold" />
                      {Number(item.external_rating).toFixed(1)}
                    </div>
                  )}
                  {item.user_rating > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-accent/80 backdrop-blur-md rounded-lg px-1.5 py-0.5 text-xs font-bold">
                      {Number(item.user_rating) % 1 === 0
                        ? item.user_rating
                        : Number(item.user_rating).toFixed(1)}
                      /10
                    </div>
                  )}
                  {/* Hover overlay with status buttons + actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end">
                    {/* Status buttons */}
                    <div className="flex gap-1.5 px-2.5 mb-2">
                      {[
                        {
                          key: 'want',
                          icon: Clock,
                          label: 'Wishlist',
                          activeClass: 'bg-purple-500 text-white',
                        },
                        {
                          key: 'watching',
                          icon: Eye,
                          label: 'Watching',
                          activeClass: 'bg-blue-500 text-white',
                        },
                        {
                          key: 'finished',
                          icon: CheckCircle2,
                          label: 'Done',
                          activeClass: 'bg-green-500 text-white',
                        },
                      ].map((s) => (
                        <button
                          key={s.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(item.id, s.key);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                            item.status === s.key
                              ? s.activeClass
                              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          <s.icon size={13} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1.5 px-2.5 mb-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReview(item);
                        }}
                        className="flex-1 py-2 rounded-lg bg-accent/80 hover:bg-accent text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Star size={14} /> Rate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.id);
                        }}
                        className="py-2 px-3 rounded-lg bg-white/10 hover:bg-red-500/80 text-white/60 hover:text-white text-xs transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Status badge (always visible) */}
                  <div
                    className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-md ${
                      item.status === 'finished'
                        ? 'bg-green-500/80 text-white'
                        : item.status === 'watching'
                          ? 'bg-blue-500/80 text-white'
                          : 'bg-purple-500/80 text-white'
                    } ${item.user_rating > 0 ? 'top-9' : ''}`}
                  >
                    {item.status === 'want' ? (
                      <>
                        <Clock size={12} /> Wishlist
                      </>
                    ) : item.status === 'watching' ? (
                      <>
                        <Eye size={12} /> Watching
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Done
                      </>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">
                      {item.title}
                    </p>
                    {item.review && (
                      <p className="text-xs text-white/30 mt-1.5 line-clamp-2 italic">
                        &ldquo;{item.review}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* For You Tab */}
      {activeTab === 'foryou' && <ForYouPanel items={allItems} />}

      {/* Stats Tab */}
      {activeTab === 'stats' && <StatsPanel items={allItems} />}

      {/* Review Modal (decimal slider) */}
      {reviewItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setReviewItem(null)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rate & Review</h3>
              <button
                onClick={() => setReviewItem(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {reviewItem.poster_url && (
                <img
                  src={reviewItem.poster_url}
                  alt=""
                  className="w-12 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{reviewItem.title}</p>
                <p className="text-xs text-white/40 capitalize">
                  {reviewItem.media_type}
                </p>
              </div>
            </div>

            {/* Status Picker */}
            <div className="mb-5">
              <label className="text-xs text-white/40 block mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {[
                  {
                    key: 'want',
                    icon: Clock,
                    label: 'Wishlist',
                    active:
                      'bg-purple-500 border-purple-400 text-white',
                  },
                  {
                    key: 'watching',
                    icon: Eye,
                    label: 'In Progress',
                    active: 'bg-blue-500 border-blue-400 text-white',
                  },
                  {
                    key: 'finished',
                    icon: CheckCircle2,
                    label: 'Finished',
                    active:
                      'bg-green-500 border-green-400 text-white',
                  },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setReviewStatus(s.key)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all duration-200 ${
                      reviewStatus === s.key
                        ? s.active
                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    <s.icon size={14} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decimal Rating Slider */}
            <div className="mb-5">
              <label className="text-xs text-white/40 block mb-3">
                Your Rating
              </label>

              {/* Big display */}
              <div className="text-center mb-4">
                <span
                  className={`text-5xl font-black bg-gradient-to-r ${userRating > 0 ? getRatingColor(userRating) : 'from-white/20 to-white/20'} bg-clip-text text-transparent`}
                >
                  {userRating > 0
                    ? Number(userRating) % 1 === 0
                      ? `${userRating}.0`
                      : Number(userRating).toFixed(1)
                    : '\u2014'}
                </span>
                <span className="text-white/20 text-lg ml-1">/10</span>
                {userRating > 0 && (
                  <p className="text-xs text-white/40 mt-1">
                    {getRatingLabel(userRating)}
                  </p>
                )}
              </div>

              {/* Slider */}
              <div className="relative px-1">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={userRating}
                  onChange={(e) => setUserRating(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-dark-600 accent-accent
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-accent/30 [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20
                    [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
                />
                {/* Track labels */}
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[10px] text-white/20">0</span>
                  <span className="text-[10px] text-white/20">5</span>
                  <span className="text-[10px] text-white/20">10</span>
                </div>
              </div>

              {/* Quick-pick buttons */}
              <div className="flex gap-1 mt-3">
                {[5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setUserRating(n)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      userRating === n
                        ? 'bg-accent text-white'
                        : 'bg-dark-600 text-white/30 hover:bg-dark-500 hover:text-white/60'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Review text */}
            <div className="mb-6">
              <label className="text-xs text-white/40 block mb-2">
                Your Thoughts (optional)
              </label>
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
                <button
                  onClick={() => {
                    setUserRating(0);
                    setReviewText('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Clear
                </button>
              )}
              <button onClick={saveReview} className="btn-primary flex-1">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
