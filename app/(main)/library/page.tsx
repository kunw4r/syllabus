'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  Rows3,
  Grid3X3,
} from 'lucide-react';
import { m, useSpring, useTransform } from 'framer-motion';
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
  getMovieDetails,
  getTVDetails,
  getTrendingMovies,
  getTrendingTV,
} from '@/lib/api/tmdb';
import { TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingHex, getRatingBg, getRatingGlow, getUserRatingRed, getUserRatingGlow, getUserRatingBg, sampleImageBrightness } from '@/lib/utils/rating-colors';
import { loadStaticScoreDB, getSyllabusScore, applyStoredScores } from '@/lib/scoring';
import { FadeInView } from '@/components/motion/FadeInView';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
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

const GENRE_COLORS = ['bg-rose-400', 'bg-cyan-400', 'bg-amber-400', 'bg-violet-400', 'bg-emerald-400'];
const GENRE_TEXT_COLORS = ['text-rose-400', 'text-cyan-400', 'text-amber-400', 'text-violet-400', 'text-emerald-400'];

function StatsPanel({ items }: { items: any[] }) {
  const router = useRouter();
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
      ? (rated.reduce((s, i) => s + i.user_rating, 0) / rated.length).toFixed(1)
      : null;

    // Rating distribution (1-10)
    const ratingDist = Array(10).fill(0);
    rated.forEach((i) => {
      const bucket = Math.min(Math.max(Math.round(i.user_rating) - 1, 0), 9);
      ratingDist[bucket]++;
    });

    const genreCounts: Record<string, number> = {};
    items.forEach((i) => {
      if (i.genres)
        i.genres.split(',').map((g: string) => g.trim()).filter(Boolean)
          .forEach((g: string) => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    });
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const topRated = [...items]
      .filter((i) => i.user_rating)
      .sort((a, b) => b.user_rating - a.user_rating)
      .slice(0, 5);

    return {
      total, finished: finished.length, watching: watching.length, want: want.length,
      movies: movies.length, tv: tv.length, books: books.length,
      avgRating, ratingDist, topGenres, topRated, rated: rated.length,
    };
  }, [items]);

  const completionPct = stats.total > 0 ? Math.round((stats.finished / stats.total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const maxRatingCount = Math.max(...stats.ratingDist, 1);

  return (
    <div className="space-y-5">
      {/* ── Top row: Completion ring + stat numbers ── */}
      <FadeInView>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6">
          <div className="flex items-center gap-5 sm:gap-8">
            {/* Completion ring */}
            <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
              <svg width={96} height={96} className="-rotate-90">
                <circle cx={48} cy={48} r={40} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} />
                <circle
                  cx={48} cy={48} r={40} fill="none"
                  stroke={completionPct >= 75 ? '#22c55e' : completionPct >= 40 ? '#eab308' : '#f97316'}
                  strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (completionPct / 100) * circumference}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${completionPct >= 75 ? 'rgba(34,197,94,0.3)' : completionPct >= 40 ? 'rgba(234,179,8,0.3)' : 'rgba(249,115,22,0.3)'})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black">{completionPct}%</span>
                <span className="text-[9px] text-white/30 tracking-wide">COMPLETE</span>
              </div>
            </div>

            {/* Stat numbers */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Library, label: 'Total', value: stats.total, color: 'text-accent' },
                { icon: CheckCircle2, label: 'Completed', value: stats.finished, color: 'text-green-400' },
                { icon: Eye, label: 'In Progress', value: stats.watching, color: 'text-blue-400' },
                { icon: Clock, label: 'Up Next', value: stats.want, color: 'text-purple-400' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <s.icon size={13} className={s.color} />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black"><AnimatedNumber value={s.value} /></p>
                </div>
              ))}
            </div>
          </div>

          {/* Media type breakdown — inline pills */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.05]">
            {[
              { label: 'Movies', count: stats.movies, color: 'bg-rose-400', icon: Film },
              { label: 'TV Shows', count: stats.tv, color: 'bg-cyan-400', icon: Tv },
              { label: 'Books', count: stats.books, color: 'bg-amber-400', icon: BookOpen },
            ].map((t) => (
              <div key={t.label} className="flex-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <t.icon size={12} className="text-white/30" />
                  <span className="text-[11px] text-white/40">{t.label}</span>
                  <span className="text-[11px] font-bold text-white/60 ml-auto">{t.count}</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: stats.total > 0 ? `${(t.count / stats.total) * 100}%` : '0%' }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    className={`h-full rounded-full ${t.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInView>

      {/* ── Middle row: Rating stats + Top Genres side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rating Stats with distribution */}
        <FadeInView delay={0.1}>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Star size={12} className="text-yellow-500" /> Your Ratings
            </h3>
            {stats.avgRating ? (
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black" style={{ color: getRatingHex(Number(stats.avgRating)) }}>
                    {stats.avgRating}
                  </span>
                  <div>
                    <span className="text-white/25 text-sm">/10 avg</span>
                    <p className="text-[11px] text-white/20">{stats.rated} rated</p>
                  </div>
                </div>
                {/* Rating distribution histogram */}
                <div className="flex items-end gap-[3px] h-16">
                  {stats.ratingDist.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <m.div
                        initial={{ height: 0 }}
                        animate={{ height: count > 0 ? `${Math.max((count / maxRatingCount) * 100, 8)}%` : '3%' }}
                        transition={{ duration: 0.6, delay: 0.1 * i, ease: 'easeOut' }}
                        className="w-full rounded-sm"
                        style={{
                          backgroundColor: count > 0 ? getRatingHex((i + 1)) : 'rgba(255,255,255,0.04)',
                          opacity: count > 0 ? 0.8 : 1,
                        }}
                      />
                      <span className="text-[8px] text-white/20">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/25">Rate items to see your stats</p>
            )}
          </div>
        </FadeInView>

        {/* Top Genres */}
        <FadeInView delay={0.15}>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={12} className="text-accent" /> Top Genres
            </h3>
            {stats.topGenres.length > 0 ? (
              <div className="space-y-3">
                {stats.topGenres.map(([genre, count], idx) => (
                  <div key={genre} className="flex items-center gap-2.5">
                    <span className={`text-xs font-black w-4 ${GENRE_TEXT_COLORS[idx] || 'text-white/20'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-white/80 truncate">{genre}</span>
                        <span className="text-[11px] font-bold text-white/40 ml-2">{count}</span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / stats.topGenres[0][1]) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 * idx, ease: 'easeOut' }}
                          className={`h-full rounded-full ${GENRE_COLORS[idx] || 'bg-white/20'}`}
                          style={{ opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/25">Add items with genres to see breakdown</p>
            )}
          </div>
        </FadeInView>
      </div>

      {/* ── Highest Rated — visual podium ── */}
      {stats.topRated.length > 0 && (
        <FadeInView delay={0.2}>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Award size={12} className="text-yellow-500" /> Your Highest Rated
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {stats.topRated.map((item, idx) => {
                const ratingColor = getRatingHex(Number(item.user_rating));
                const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#9CA3AF', '#6B7280'];
                return (
                  <div
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => {
                      const mt = item.media_type || 'movie';
                      if (mt === 'book') {
                        if (item.openlibrary_key) router.push(`/details/book/${item.openlibrary_key}`);
                      } else {
                        if (item.tmdb_id) router.push(`/details/${mt}/${item.tmdb_id}`);
                      }
                    }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 group-hover:scale-[1.03] transition-transform duration-200">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-white/[0.04] flex items-center justify-center text-white/10 text-3xl">
                          {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
                        </div>
                      )}
                      {/* Rank badge */}
                      <div
                        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                        style={{
                          backgroundColor: `${medalColors[idx]}20`,
                          color: medalColors[idx],
                          border: `1.5px solid ${medalColors[idx]}40`,
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {idx + 1}
                      </div>
                      {/* Bottom gradient */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                      {/* Rating */}
                      <div
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-md border border-white/10"
                        style={{ background: getRatingBg(Number(item.user_rating)), boxShadow: getRatingGlow(Number(item.user_rating)) }}
                      >
                        <Star size={9} className="fill-current" style={{ color: getRatingHex(Number(item.user_rating)) }} />
                        <span className="text-[11px] font-bold drop-shadow-sm" style={{ color: getRatingHex(Number(item.user_rating)) }}>
                          {item.user_rating}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] font-medium text-white/70 truncate group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeInView>
      )}
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

  // "Because you watched X" grouped recs
  const [becauseGroups, setBecauseGroups] = useState<{ source: string; sourceId: number; sourceType: string; items: any[] }[]>([]);
  const [topPick, setTopPick] = useState<any>(null);
  const [loadingRecs, setLoadingRecs] = useState(true);

  // Trending (personalized by filtering out library items)
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Mood picks
  const [moodPicks, setMoodPicks] = useState<any[]>([]);
  const [activeMood, setActiveMood] = useState<string | null>(null);
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
    { key: 'light', label: 'Something Light', icon: Sun, color: 'text-yellow-400', bg: 'from-yellow-500/15 to-orange-500/10' },
    { key: 'dark', label: 'Dark & Intense', icon: Zap, color: 'text-red-400', bg: 'from-red-500/15 to-rose-500/10' },
    { key: 'mind', label: 'Mind-Bending', icon: Brain, color: 'text-purple-400', bg: 'from-purple-500/15 to-violet-500/10' },
    { key: 'feel', label: 'Feel Good', icon: Heart, color: 'text-pink-400', bg: 'from-pink-500/15 to-rose-500/10' },
    { key: 'adventure', label: 'Adventure', icon: Compass, color: 'text-emerald-400', bg: 'from-emerald-500/15 to-teal-500/10' },
    { key: 'chill', label: 'Chill & Learn', icon: Coffee, color: 'text-sky-400', bg: 'from-sky-500/15 to-blue-500/10' },
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
    'Feel good comedy',
    'Mind-bending sci-fi',
    'Heist thriller',
    'Bollywood drama',
    'Korean thriller',
  ];

  const libIds = useMemo(() => new Set(items.map((i) => String(i.tmdb_id))), [items]);

  // Load grouped recs + top pick hero
  useEffect(() => {
    if (items.length === 0) { setLoadingRecs(false); return; }

    setLoadingRecs(true);

    const rated = items
      .filter((i) => i.status === 'finished' && i.media_type !== 'book')
      .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
      .slice(0, 5);
    const watching = items
      .filter((i) => i.status === 'watching' && i.media_type !== 'book')
      .slice(0, 3);
    const seeds = [...rated, ...watching].slice(0, 6);

    if (seeds.length === 0) { setLoadingRecs(false); return; }

    const globalSeen = new Set<string>();

    Promise.all(
      seeds.map(async (seed) => {
        try {
          const mt = seed.media_type === 'tv' ? 'tv' : 'movie';
          const data = await (mt === 'tv' ? getTVDetails(seed.tmdb_id) : getMovieDetails(seed.tmdb_id));
          const recItems = (data.recommendations?.results || [])
            .map((r: any) => ({ ...r, media_type: r.media_type || mt }))
            .filter((r: any) => {
              const key = `${r.media_type}-${r.id}`;
              if (globalSeen.has(key) || libIds.has(String(r.id))) return false;
              globalSeen.add(key);
              return true;
            });
          applyStoredScores(recItems.filter((r: any) => r.media_type !== 'tv'), 'movie');
          applyStoredScores(recItems.filter((r: any) => r.media_type === 'tv'), 'tv');
          return { source: seed.title, sourceId: seed.tmdb_id, sourceType: mt, items: recItems.slice(0, 15) };
        } catch {
          return { source: seed.title, sourceId: seed.tmdb_id, sourceType: 'movie', items: [] };
        }
      })
    ).then((groups) => {
      const validGroups = groups.filter((g) => g.items.length >= 3);
      setBecauseGroups(validGroups);

      // Pick the highest-rated rec across all groups as hero
      const allItems = validGroups.flatMap((g) => g.items);
      if (allItems.length > 0) {
        const best = allItems.sort((a, b) => (b.unified_rating || b.vote_average || 0) - (a.unified_rating || a.vote_average || 0))[0];
        setTopPick(best);
      }
      setLoadingRecs(false);
    });
  }, [items, libIds]);

  // Load trending
  useEffect(() => {
    setLoadingTrending(true);
    Promise.all([getTrendingMovies(), getTrendingTV()]).then(([movies, tv]) => {
      applyStoredScores(movies, 'movie');
      applyStoredScores(tv, 'tv');
      setTrendingMovies(movies.filter((m: any) => !libIds.has(String(m.id))).slice(0, 15));
      setTrendingTV(tv.filter((t: any) => !libIds.has(String(t.id))).slice(0, 15));
      setLoadingTrending(false);
    });
  }, [libIds]);

  // Load curated picks when genre changes
  useEffect(() => {
    setLoadingCurated(true);
    getCuratedPicks(curatedGenre).then((d) => {
      const filtered = d.filter((r: any) => !libIds.has(String(r.id))).slice(0, 20);
      applyStoredScores(filtered, 'movie');
      setCuratedPicks(filtered);
      setLoadingCurated(false);
    });
  }, [curatedGenre, libIds]);

  const handleMood = async (mood: string) => {
    if (activeMood === mood) { setActiveMood(null); setMoodPicks([]); return; }
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
    const filtered = combined.filter((r) => !libIds.has(String(r.id))).slice(0, 20);
    applyStoredScores(filtered.filter((r: any) => r.media_type !== 'tv'), 'movie');
    applyStoredScores(filtered.filter((r: any) => r.media_type === 'tv'), 'tv');
    setMoodPicks(filtered);
    setLoadingMood(false);
  };

  const runScenario = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoadingScenario(true);
    setSearchedFor(q);
    const results = await searchByScenario(q);
    const filtered = results.filter((r: any) => !libIds.has(String(r.id)));
    applyStoredScores(filtered.filter((r: any) => r.media_type !== 'tv'), 'movie');
    applyStoredScores(filtered.filter((r: any) => r.media_type === 'tv'), 'tv');
    setScenarioResults(filtered);
    setLoadingScenario(false);
  }, [libIds]);

  const handleScenarioSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    runScenario(scenarioQuery);
  };

  const SkeletonRowLocal = () => (
    <div className="flex gap-3 overflow-hidden pb-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="shrink-0 w-[260px] sm:w-[320px] lg:w-[380px] aspect-[16/9] rounded-lg bg-dark-700 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      {/* ── Top Pick Hero ── */}
      {topPick && topPick.backdrop_path && (
        <FadeInView>
          <div
            className="relative -mx-5 sm:-mx-8 lg:-mx-14 rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => router.push(`/details/${topPick.media_type || 'movie'}/${topPick.id}`)}
          >
            <div className="relative h-[280px] sm:h-[340px] lg:h-[400px]">
              <img
                src={`${TMDB_IMG_ORIGINAL}${topPick.backdrop_path}`}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-dark-900/70 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Top Pick For You</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 leading-tight">
                {topPick.title || topPick.name}
              </h2>
              <div className="flex items-center gap-3 text-sm text-white/50 mb-3">
                {(topPick.unified_rating ?? topPick.vote_average) > 0 && (() => {
                  const val = Number(topPick.unified_rating ?? topPick.vote_average);
                  return (
                    <span className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5" style={{ background: getRatingBg(val), boxShadow: getRatingGlow(val) }}>
                      <Star size={12} className="fill-current" style={{ color: getRatingHex(val) }} />
                      <span className="text-xs font-bold" style={{ color: getRatingHex(val) }}>{val.toFixed(1)}</span>
                    </span>
                  );
                })()}
                <span>{(topPick.release_date || topPick.first_air_date || '').slice(0, 4)}</span>
                <span className="capitalize text-white/30">{topPick.media_type}</span>
              </div>
              {topPick.overview && (
                <p className="text-white/40 text-sm leading-relaxed line-clamp-2 max-w-xl">{topPick.overview}</p>
              )}
            </div>
          </div>
        </FadeInView>
      )}

      {/* ── Because You Watched X ── */}
      {loadingRecs ? (
        <section>
          <div className="h-6 w-64 bg-dark-700 rounded animate-pulse mb-4" />
          <SkeletonRowLocal />
        </section>
      ) : becauseGroups.length > 0 ? (
        becauseGroups.map((group) => (
          <ScrollRow
            key={`because-${group.sourceId}`}
            title={
              <span className="flex items-center gap-2">
                Because you watched
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/details/${group.sourceType}/${group.sourceId}`); }}
                  className="text-accent hover:text-accent/80 transition-colors"
                >
                  {group.source}
                </button>
              </span>
            }
          >
            {group.items.map((item: any) => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} mediaType={item.media_type === 'tv' ? 'tv' : 'movie'} />
            ))}
          </ScrollRow>
        ))
      ) : items.length > 0 ? null : (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <Sparkles size={28} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Add and rate items to get personalized recommendations</p>
        </div>
      )}

      {/* ── Trending Now (filtered) ── */}
      {loadingTrending ? (
        <section>
          <div className="h-6 w-48 bg-dark-700 rounded animate-pulse mb-4" />
          <SkeletonRowLocal />
        </section>
      ) : (
        <>
          {trendingMovies.length > 0 && (
            <ScrollRow title={<span className="flex items-center gap-2"><TrendingUp size={18} className="text-orange-400" /> Trending Movies</span>}>
              {trendingMovies.map((m: any) => (
                <MediaCard key={m.id} item={m} mediaType="movie" />
              ))}
            </ScrollRow>
          )}
          {trendingTV.length > 0 && (
            <ScrollRow title={<span className="flex items-center gap-2"><TrendingUp size={18} className="text-blue-400" /> Trending TV Shows</span>}>
              {trendingTV.map((t: any) => (
                <MediaCard key={t.id} item={t} mediaType="tv" />
              ))}
            </ScrollRow>
          )}
        </>
      )}

      {/* ── Switch It Up — Mood Discovery ── */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2.5">Switch It Up</h2>
          <p className="text-sm text-white/30">Pick a vibe</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {moods.map((mood) => (
            <button
              key={mood.key}
              onClick={() => handleMood(mood.key)}
              className={`rounded-xl p-3 text-left transition-all duration-200 hover:scale-[1.03] border bg-gradient-to-br ${mood.bg} ${
                activeMood === mood.key
                  ? 'border-accent/50 ring-1 ring-accent/20'
                  : 'border-white/[0.06] hover:border-white/15'
              }`}
            >
              <mood.icon size={18} className={`${mood.color} mb-1.5`} />
              <p className="text-[11px] sm:text-xs font-semibold leading-tight">{mood.label}</p>
            </button>
          ))}
        </div>

        {loadingMood ? (
          <SkeletonRowLocal />
        ) : moodPicks.length > 0 ? (
          <ScrollRow title={moods.find((m) => m.key === activeMood)?.label || 'Mood Picks'}>
            {moodPicks.map((item: any) => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} mediaType={item.media_type === 'tv' ? 'tv' : 'movie'} />
            ))}
          </ScrollRow>
        ) : null}
      </section>

      {/* ── Must Watch — Curated picks with genre tabs ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2.5">
            <Flame size={18} className="text-orange-400" />
            Must Watch
          </h2>
          <p className="text-sm text-white/30">Highly-rated films loved by critics and audiences</p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-4">
          {genreTabs.map((gTab) => (
            <button
              key={gTab.key}
              onClick={() => setCuratedGenre(gTab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                curatedGenre === gTab.key
                  ? 'bg-accent text-white'
                  : 'bg-white/[0.04] text-white/35 hover:text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {gTab.label}
            </button>
          ))}
        </div>

        {loadingCurated ? (
          <SkeletonRowLocal />
        ) : curatedPicks.length > 0 ? (
          <ScrollRow>
            {curatedPicks.map((item: any) => (
              <MediaCard key={`curated-${item.id}`} item={item} mediaType="movie" />
            ))}
          </ScrollRow>
        ) : (
          <p className="text-sm text-white/30 text-center py-6">No picks found for this genre</p>
        )}
      </section>

      {/* ── Quick Find ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2.5">
            <Search size={18} className="text-accent" />
            Quick Find
          </h2>
          <p className="text-sm text-white/30">Describe what you&apos;re looking for</p>
        </div>

        <form onSubmit={handleScenarioSearch} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={scenarioQuery}
              onChange={(e) => setScenarioQuery(e.target.value)}
              placeholder="e.g. date night, bollywood drama, heist thriller..."
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

        <div className="flex flex-wrap gap-1.5 mb-4">
          {scenarioExamples.map((ex) => (
            <button
              key={ex}
              onClick={() => { setScenarioQuery(ex); runScenario(ex); }}
              className="text-[11px] px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white hover:border-white/15 hover:bg-white/[0.05] transition-all"
            >
              {ex}
            </button>
          ))}
        </div>

        {loadingScenario ? (
          <SkeletonRowLocal />
        ) : scenarioResults.length > 0 ? (
          <ScrollRow title={<span>Results for &ldquo;<span className="text-white/70">{searchedFor}</span>&rdquo;</span>}>
            {scenarioResults.map((item: any) => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} mediaType={item.media_type === 'tv' ? 'tv' : 'movie'} />
            ))}
          </ScrollRow>
        ) : searchedFor ? (
          <p className="text-sm text-white/30 text-center py-4">No results — try describing it differently!</p>
        ) : null}
      </section>
    </div>
  );
}

/* ================================================================
   MAIN LIBRARY COMPONENT
   ================================================================ */

function AnimatedRatingNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });
  const display = useTransform(spring, (v) => v > 0 ? v.toFixed(1) : '\u2014');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => display.on('change', (v) => { if (ref.current) ref.current.textContent = v; }), [display]);

  return <span ref={ref}>{value > 0 ? value.toFixed(1) : '\u2014'}</span>;
}

/* ================================================================
   LIBRARY GRID CARD — extracted for per-card brightness state
   ================================================================ */

function LibraryGridCard({
  item,
  layout = 'landscape',
  backdropUrl,
  onCardClick,
  onStatusChange,
  onRemove,
  onRate,
}: {
  item: any;
  layout?: 'landscape' | 'poster';
  backdropUrl?: string;
  onCardClick: (item: any) => void;
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onRate: (item: any) => void;
}) {
  const [brightTL, setBrightTL] = useState(false);
  const [brightTR, setBrightTR] = useState(false);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setBrightTL(sampleImageBrightness(img, 'top-left'));
    setBrightTR(sampleImageBrightness(img, 'top-right'));
  }, []);

  const ratingVal = Number(item.user_rating);
  const redHex = getUserRatingRed(ratingVal);

  const isLandscape = layout === 'landscape';
  const aspectClass = isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]';
  const hasBackdrop = isLandscape && backdropUrl;
  const displayImg = hasBackdrop ? backdropUrl : item.poster_url;
  // Landscape without backdrop: center poster over blurred bg
  const posterFallbackLandscape = isLandscape && !backdropUrl && item.poster_url;

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] transition-all duration-300 hover:border-white/[0.12] cursor-pointer hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/40"
      onClick={() => onCardClick(item)}
    >
      <div className="relative">
        {posterFallbackLandscape ? (
          <div className={`relative w-full ${aspectClass} bg-dark-800`}>
            <img
              src={item.poster_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={item.poster_url}
                alt={item.title}
                crossOrigin="anonymous"
                onLoad={handleImgLoad}
                className="h-full w-auto max-w-[45%] object-contain drop-shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>
        ) : displayImg ? (
          <img
            src={displayImg}
            alt={item.title}
            loading="lazy"
            crossOrigin="anonymous"
            onLoad={handleImgLoad}
            className={`w-full ${aspectClass} object-cover`}
          />
        ) : (
          <div className={`w-full ${aspectClass} bg-dark-600 flex items-center justify-center text-white/30 text-xs p-4 text-center`}>
            {item.title}
          </div>
        )}

        {/* External rating — top right */}
        {item.external_rating > 0 && (
          <div className="absolute top-2.5 right-2.5 backdrop-blur-xl border border-white/10 rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-xs font-semibold transition-colors duration-300" style={{ background: getRatingBg(Number(item.external_rating), brightTR), boxShadow: getRatingGlow(Number(item.external_rating)) }}>
            <Star size={11} className="fill-current" style={{ color: getRatingHex(Number(item.external_rating)) }} />
            <span className="drop-shadow-sm" style={{ color: getRatingHex(Number(item.external_rating)) }}>{Number(item.external_rating).toFixed(1)}</span>
          </div>
        )}

        {/* User rating — top left, red neon scale + brightness-aware tint */}
        {item.user_rating > 0 && (
          <div
            className="absolute top-2.5 left-2.5 backdrop-blur-xl rounded-lg px-1.5 py-0.5 text-xs font-bold flex items-center gap-1 transition-colors duration-300"
            style={{
              background: getUserRatingBg(ratingVal, brightTL),
              boxShadow: getUserRatingGlow(ratingVal),
              borderWidth: 1,
              borderColor: `${redHex}40`,
            }}
          >
            <span style={{ color: redHex, textShadow: `0 0 6px ${redHex}88` }}>
              {ratingVal % 1 === 0 ? item.user_rating : ratingVal.toFixed(1)}
            </span>
            <span style={{ color: redHex, opacity: 0.45 }}>/10</span>
          </div>
        )}

        {/* Status badge — bottom left of poster */}
        <div
          className={`absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold backdrop-blur-xl border ${
            item.status === 'finished'
              ? 'bg-green-500/15 border-green-500/30 text-green-400'
              : item.status === 'watching'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
          }`}
        >
          {item.status === 'want' ? (
            <><Clock size={11} /> Up Next</>
          ) : item.status === 'watching' ? (
            <><Eye size={11} /> In Progress</>
          ) : (
            <><CheckCircle2 size={11} /> Completed</>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end">
          <div className="flex gap-1.5 px-2.5 mb-2">
            {[
              { key: 'want', icon: Clock, label: 'Up Next', activeBorder: 'border-purple-400/50', activeBg: 'bg-purple-500/20', activeText: 'text-purple-300' },
              { key: 'watching', icon: Eye, label: 'In Progress', activeBorder: 'border-blue-400/50', activeBg: 'bg-blue-500/20', activeText: 'text-blue-300' },
              { key: 'finished', icon: CheckCircle2, label: 'Completed', activeBorder: 'border-green-400/50', activeBg: 'bg-green-500/20', activeText: 'text-green-300' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, s.key); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all backdrop-blur-sm border ${
                  item.status === s.key
                    ? `${s.activeBg} ${s.activeBorder} ${s.activeText}`
                    : 'bg-white/[0.06] border-white/[0.08] text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                <s.icon size={12} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 px-2.5 mb-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); onRate(item); }}
              className="flex-1 py-2 rounded-lg bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.14] text-white/80 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all backdrop-blur-sm"
            >
              <Star size={13} /> Rate
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="py-2 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] hover:bg-red-500/20 hover:border-red-500/30 text-white/40 hover:text-red-400 text-xs transition-all backdrop-blur-sm"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold truncate text-white/90">{item.title}</p>
        {item.review && (
          <p className="text-[11px] text-white/25 mt-1.5 line-clamp-2 italic leading-relaxed">
            &ldquo;{item.review}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

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
  const [cardLayout, setCardLayout] = useState<'landscape' | 'poster'>('landscape');
  const [backdropMap, setBackdropMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('lib_backdrops') || '{}'); } catch { return {}; }
  });
  const toast = useToast();
  const router = useRouter();

  const loadLibrary = useCallback(async () => {
    try {
      const data = await getLibrary();

      // Enrich ratings from scores.json so library matches detail pages
      await loadStaticScoreDB();
      for (const item of data) {
        if (item.tmdb_id && item.media_type && item.media_type !== 'book') {
          const score = getSyllabusScore(item.media_type, item.tmdb_id);
          if (score != null) item.external_rating = score;
        }
      }

      setAllItems(data);

      // Background: fix items missing poster_url & fetch backdrops
      const needsEnrich = data.filter(
        (i: any) => i.tmdb_id && i.media_type !== 'book',
      );
      if (needsEnrich.length > 0) {
        const newBackdrops: Record<string, string> = {};
        // Load cached backdrops from localStorage
        try {
          const cached = JSON.parse(localStorage.getItem('lib_backdrops') || '{}');
          Object.assign(newBackdrops, cached);
        } catch { /* ignore */ }

        const needsFetch = needsEnrich.filter(
          (i: any) => !i.poster_url || !newBackdrops[String(i.tmdb_id)],
        );
        let updated = false;

        // Fetch in batches of 3 to avoid rate limits
        for (let i = 0; i < needsFetch.length; i += 3) {
          const batch = needsFetch.slice(i, i + 3);
          await Promise.all(batch.map(async (item: any) => {
            try {
              const details =
                item.media_type === 'tv'
                  ? await getTVDetails(item.tmdb_id)
                  : await getMovieDetails(item.tmdb_id);
              if (!item.poster_url && details?.poster_path) {
                const url = `${TMDB_IMG}${details.poster_path}`;
                item.poster_url = url;
                updated = true;
                updateLibraryItem(item.id, { poster_url: url }).catch(() => {});
              }
              if (details?.backdrop_path) {
                newBackdrops[String(item.tmdb_id)] = `${TMDB_IMG_ORIGINAL}${details.backdrop_path}`;
              }
            } catch { /* best-effort */ }
          }));
        }

        // Cache backdrops in localStorage
        try { localStorage.setItem('lib_backdrops', JSON.stringify(newBackdrops)); } catch { /* quota */ }
        setBackdropMap(newBackdrops);
        if (updated) setAllItems([...data]);
      }
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

  // Pinned favourites (rated 9+)
  const pinnedFavourites = useMemo(() => {
    return [...allItems]
      .filter((i) => i.user_rating && i.user_rating >= 9)
      .sort((a, b) => b.user_rating - a.user_rating)
      .slice(0, 5);
  }, [allItems]);

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
        `"${item?.title}" \u2192 ${newStatus === 'want' ? 'Up Next' : newStatus === 'watching' ? 'In Progress' : 'Completed'}`,
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
    want: 'Up Next',
    watching: 'In Progress',
    finished: 'Completed',
  };
  const sortLabels: Record<string, string> = {
    added: 'Date Added',
    rating: 'Your Rating',
    external: 'Score',
    title: 'Title',
  };

  const hasActiveFilter = typeFilter !== 'all' || filter !== 'all';

  return (
    <div>
      {/* ── Header row: title + tabs ── */}
      <FadeInView>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl font-bold">My Library</h1>
          <div className="flex gap-1 bg-dark-700/50 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === t.key
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </FadeInView>

      {/* Shelf Tab */}
      {activeTab === 'shelf' && (
        <div>
          {/* Pinned Favourites — only when no filters active */}
          {!hasActiveFilter && pinnedFavourites.length > 0 && (
            <FadeInView>
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-white/40 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Award size={14} className="text-gold" /> Top Rated
                </h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {pinnedFavourites.map((item) => {
                    const rv = Number(item.user_rating);
                    const ratingColor = getRatingHex(rv);
                    return (
                      <div
                        key={item.id}
                        className="shrink-0 w-[160px] sm:w-[200px] cursor-pointer group"
                        onClick={() => handleCardClick(item)}
                      >
                        <div
                          className="aspect-[2/3] rounded-xl overflow-hidden ring-2 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl relative"
                          style={{ '--tw-ring-color': `${ratingColor}30`, boxShadow: `0 0 0 2px ${ratingColor}30` } as React.CSSProperties}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${ratingColor}60, 0 4px 20px ${ratingColor}15`; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${ratingColor}30`; }}
                        >
                          {item.poster_url ? (
                            <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-4xl">
                              {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
                            </div>
                          )}
                          <div
                            className="absolute top-2 right-2 backdrop-blur-md rounded-lg px-2 py-0.5 flex items-center gap-1 border border-white/10"
                            style={{ background: getRatingBg(rv), boxShadow: getRatingGlow(rv) }}
                          >
                            <Star size={12} className="fill-current" style={{ color: ratingColor, filter: `drop-shadow(0 0 4px ${ratingColor}88)` }} />
                            <span className="text-xs font-black drop-shadow-sm" style={{ color: ratingColor, textShadow: `0 0 6px ${ratingColor}88` }}>
                              {rv % 1 === 0 ? item.user_rating : rv.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-medium text-white/70 truncate group-hover:text-white transition-colors">
                          {item.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeInView>
          )}

          {/* ── Filter & View Controls ── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
            {/* Type filters */}
            <div className="flex gap-1">
              {Object.entries(typeLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    typeFilter === key
                      ? 'bg-accent text-white'
                      : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/10" />

            {/* Status filters */}
            <div className="flex gap-1">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    filter === key
                      ? 'bg-white/12 text-white'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Right side: sort + view mode */}
            <div className="flex items-center gap-1 ml-auto">
              {Object.entries(sortLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                    sortBy === key
                      ? 'bg-white/10 text-white/80 font-medium'
                      : 'text-white/20 hover:text-white/50'
                  }`}
                >
                  {label}{sortBy === key ? (sortDir === 'desc' ? ' \u2193' : ' \u2191') : ''}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-1" />
              {(['grid', 'shelf', 'kanban'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                    viewMode === v ? 'bg-accent/20 text-accent font-medium' : 'text-white/20 hover:text-white/50'
                  }`}
                >
                  {v === 'kanban' ? 'Board' : v === 'shelf' ? 'Shelf' : 'Grid'}
                </button>
              ))}
              {viewMode === 'grid' && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <div className="flex gap-0.5 bg-white/[0.04] rounded-md p-0.5">
                    <button
                      onClick={() => setCardLayout('landscape')}
                      className={`p-1 rounded transition-all ${cardLayout === 'landscape' ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
                      title="Landscape"
                    >
                      <Rows3 size={13} />
                    </button>
                    <button
                      onClick={() => setCardLayout('poster')}
                      className={`p-1 rounded transition-all ${cardLayout === 'poster' ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
                      title="Poster"
                    >
                      <Grid3X3 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            allItems.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                <Library size={40} className="mx-auto mb-3 text-white/10" />
                <h3 className="text-lg font-medium text-white/60 mb-2">
                  Nothing here yet
                </h3>
                <p className="text-sm">
                  Browse movies, TV shows, or books and add them to your library
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-sm text-white/30">No items match your filters</p>
                <button
                  onClick={() => { setTypeFilter('all'); setFilter('all'); }}
                  className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )
          ) : viewMode === 'kanban' ? (
            <DragDropShelf
              items={filteredItems}
              onStatusChange={handleStatusChange}
              onCardClick={handleCardClick}
            />
          ) : viewMode === 'shelf' ? (
            <VirtualShelf items={filteredItems} onCardClick={handleCardClick} />
          ) : (
            <div className={cardLayout === 'landscape'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
            }>
              {filteredItems.map((item) => (
                <LibraryGridCard
                  key={item.id}
                  item={item}
                  layout={cardLayout}
                  backdropUrl={backdropMap[String(item.tmdb_id)]}
                  onCardClick={handleCardClick}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemove}
                  onRate={openReview}
                />
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
                    label: 'Up Next',
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
                    label: 'Completed',
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
                  className="text-5xl font-black"
                  style={{ color: userRating > 0 ? getRatingHex(userRating) : 'rgba(255,255,255,0.2)' }}
                >
                  <AnimatedRatingNumber value={userRating} />
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
                <div className="relative h-2 rounded-full bg-dark-600">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${(userRating / 10) * 100}%`,
                      background: userRating > 0 ? getRatingHex(userRating) : 'transparent',
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={userRating}
                    onChange={(e) => setUserRating(parseFloat(e.target.value))}
                    className="rating-slider absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent"
                    style={{ '--thumb-color': userRating > 0 ? getRatingHex(userRating) : '#666' } as React.CSSProperties}
                  />
                </div>
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
