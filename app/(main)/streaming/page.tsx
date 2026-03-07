'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Star, Clock, Settings, Search, Film, Tv, ChevronRight,
  Library, Heart, Grid3X3,
} from 'lucide-react';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow, SkeletonHero } from '@/components/ui/SkeletonCard';
import {
  getStoredConfig,
  getLibraries,
  getItems,
  getResumeItems,
  getNextUp,
  getLatestItems,
  getImageUrl,
  getProgressPercent,
  formatDuration,
  ticksToSeconds,
  searchJellyfin,
  type JellyfinConfig,
  type JellyfinItem,
  type JellyfinLibrary,
} from '@/lib/api/jellyfin';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

export default function StreamingPage() {
  const router = useRouter();
  const [config, setConfig] = useState<JellyfinConfig | null>(null);
  const [libraries, setLibraries] = useState<JellyfinLibrary[]>([]);
  const [resumeItems, setResumeItems] = useState<JellyfinItem[]>([]);
  const [nextUp, setNextUp] = useState<JellyfinItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<JellyfinItem[]>([]);
  const [latestTV, setLatestTV] = useState<JellyfinItem[]>([]);
  const [allMovies, setAllMovies] = useState<JellyfinItem[]>([]);
  const [allTV, setAllTV] = useState<JellyfinItem[]>([]);
  const [hero, setHero] = useState<JellyfinItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'tv' | 'search'>('home');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JellyfinItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const cfg = getStoredConfig();
    if (!cfg?.accessToken) {
      router.push('/streaming/settings');
      return;
    }
    setConfig(cfg);
    loadData(cfg);
  }, [router]);

  async function loadData(cfg: JellyfinConfig) {
    try {
      const [libs, resume, next] = await Promise.all([
        getLibraries(cfg),
        getResumeItems(cfg),
        getNextUp(cfg),
      ]);
      setLibraries(libs);
      setResumeItems(resume);
      setNextUp(next);

      // Find movie and TV libraries
      const movieLib = libs.find((l) => l.CollectionType === 'movies');
      const tvLib = libs.find((l) => l.CollectionType === 'tvshows');

      const promises: Promise<void>[] = [];

      if (movieLib) {
        promises.push(
          getLatestItems(cfg, movieLib.Id, 20).then(setLatestMovies),
          getItems(cfg, {
            parentId: movieLib.Id,
            includeTypes: 'Movie',
            sortBy: 'SortName',
            sortOrder: 'Ascending',
            limit: 50,
          }).then((r) => setAllMovies(r.Items)),
        );
      }

      if (tvLib) {
        promises.push(
          getLatestItems(cfg, tvLib.Id, 20).then(setLatestTV),
          getItems(cfg, {
            parentId: tvLib.Id,
            includeTypes: 'Series',
            sortBy: 'SortName',
            sortOrder: 'Ascending',
            limit: 50,
          }).then((r) => setAllTV(r.Items)),
        );
      }

      await Promise.all(promises);

      // Pick hero from resume or latest
      const heroPool = resume.length > 0 ? resume : [...(latestMovies || []), ...(latestTV || [])];
      if (heroPool.length > 0) {
        setHero(heroPool[Math.floor(Math.random() * Math.min(5, heroPool.length))]);
      }
    } catch (err) {
      console.error('[Streaming] Load failed:', err);
    }
    setLoaded(true);
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !query.trim()) return;
    setSearching(true);
    const res = await searchJellyfin(config, query.trim());
    setSearchResults(res.Items);
    setSearching(false);
  };

  const navigateToItem = (item: JellyfinItem) => {
    if (item.Type === 'Movie' || item.Type === 'Episode') {
      router.push(`/streaming/watch/${item.Id}`);
    } else if (item.Type === 'Series') {
      router.push(`/streaming/watch/${item.Id}`);
    }
  };

  if (!config) return null;

  if (!loaded) {
    return (
      <div className="min-w-0">
        <SkeletonHero />
        <div className="mt-8"><SkeletonRow /></div>
        <div className="mt-8"><SkeletonRow /></div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 -mt-2">
        {[
          { key: 'home' as const, icon: Library, label: 'Home' },
          { key: 'movies' as const, icon: Film, label: 'Movies' },
          { key: 'tv' as const, icon: Tv, label: 'TV Shows' },
          { key: 'search' as const, icon: Search, label: 'Search' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => router.push('/streaming/settings')}
          className="text-white/30 hover:text-white/60 transition-colors p-2"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search your Jellyfin library..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-white/20"
                autoFocus
              />
            </div>
          </form>
          {searching && <div className="text-center text-white/40 py-12">Searching...</div>}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {searchResults.map((item) => (
                <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Home Tab */}
      {activeTab === 'home' && (
        <>
          {/* Hero */}
          {hero && (
            <JellyfinHero item={hero} config={config} onPlay={() => navigateToItem(hero)} />
          )}

          {/* Continue Watching */}
          {resumeItems.length > 0 && (
            <ScrollRow title="Continue Watching">
              {resumeItems.map((item) => (
                <JellyfinResumeCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
              ))}
            </ScrollRow>
          )}

          {/* Next Up */}
          {nextUp.length > 0 && (
            <ScrollRow title="Next Up">
              {nextUp.map((item) => (
                <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
              ))}
            </ScrollRow>
          )}

          {/* Latest Movies */}
          {latestMovies.length > 0 && (
            <ScrollRow title="Recently Added Movies">
              {latestMovies.map((item) => (
                <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
              ))}
            </ScrollRow>
          )}

          {/* Latest TV */}
          {latestTV.length > 0 && (
            <ScrollRow title="Recently Added TV">
              {latestTV.map((item) => (
                <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
              ))}
            </ScrollRow>
          )}
        </>
      )}

      {/* Movies Tab */}
      {activeTab === 'movies' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {allMovies.map((item) => (
            <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
          ))}
          {allMovies.length === 0 && (
            <p className="col-span-full text-center text-white/30 py-12">No movies found in your library.</p>
          )}
        </div>
      )}

      {/* TV Tab */}
      {activeTab === 'tv' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {allTV.map((item) => (
            <JellyfinCard key={item.Id} item={item} config={config} onClick={() => navigateToItem(item)} />
          ))}
          {allTV.length === 0 && (
            <p className="col-span-full text-center text-white/30 py-12">No TV shows found in your library.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Jellyfin Hero Banner ───

function JellyfinHero({
  item,
  config,
  onPlay,
}: {
  item: JellyfinItem;
  config: JellyfinConfig;
  onPlay: () => void;
}) {
  const hasBackdrop = item.BackdropImageTags && item.BackdropImageTags.length > 0;
  const bgUrl = hasBackdrop
    ? getImageUrl(config, item.Id, 'Backdrop', 1920)
    : getImageUrl(config, item.Id, 'Primary', 1920);

  const rating = item.CommunityRating;
  const progress = getProgressPercent(item);

  return (
    <div className="relative -mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-2 mb-10 h-[45vh] sm:h-[55vh] lg:h-[60vh] min-h-[300px] overflow-hidden rounded-b-3xl">
      <img src={bgUrl} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />

      <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-6 lg:left-10 max-w-lg pr-4">
        <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2 sm:mb-3 leading-tight">
          {item.Name}
        </h1>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-white/50 mb-2 sm:mb-3">
          {rating && rating > 0 && (() => {
            const val = rating;
            return (
              <span
                className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 shadow-lg"
                style={{ background: getRatingBg(val), boxShadow: getRatingGlow(val) }}
              >
                <Star size={14} className="fill-current" style={{ color: getRatingHex(val) }} />
                <span className="drop-shadow-sm" style={{ color: getRatingHex(val) }}>{val.toFixed(1)}</span>
              </span>
            );
          })()}
          {item.ProductionYear && <span>{item.ProductionYear}</span>}
          {item.RunTimeTicks && <span>{formatDuration(item.RunTimeTicks)}</span>}
          {item.OfficialRating && (
            <span className="border border-white/20 rounded px-1.5 py-0.5 text-[10px]">{item.OfficialRating}</span>
          )}
        </div>
        {item.Overview && (
          <p className="text-white/50 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5">
            {item.Overview}
          </p>
        )}

        {/* Progress bar */}
        {progress > 0 && (
          <div className="w-48 h-1 bg-white/20 rounded-full mb-4">
            <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button
          onClick={onPlay}
          className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors flex items-center gap-2"
        >
          <Play size={18} className="fill-current" />
          {progress > 0 ? 'Resume' : 'Play'}
        </button>
      </div>
    </div>
  );
}

// ─── Jellyfin Card (poster style) ───

function JellyfinCard({
  item,
  config,
  onClick,
}: {
  item: JellyfinItem;
  config: JellyfinConfig;
  onClick: () => void;
}) {
  const posterUrl = getImageUrl(config, item.Id, 'Primary', 400);
  const rating = item.CommunityRating;
  const played = item.UserData?.Played;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-2">
        <img
          src={posterUrl}
          alt={item.Name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={24} className="fill-white ml-0.5" />
          </div>
        </div>

        {/* Rating badge */}
        {rating && rating > 0 && (
          <div
            className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md border border-white/10"
            style={{ background: getRatingBg(rating), color: getRatingHex(rating) }}
          >
            {rating.toFixed(1)}
          </div>
        )}

        {/* Played indicator */}
        {played && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Unplayed count (for series) */}
        {item.UserData?.UnplayedItemCount !== undefined && item.UserData.UnplayedItemCount > 0 && (
          <div className="absolute top-2 right-2 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {item.UserData.UnplayedItemCount}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-white truncate">{item.Name}</p>
      <p className="text-xs text-white/40 truncate">
        {item.ProductionYear}
        {item.Type === 'Episode' && item.SeriesName && ` — ${item.SeriesName}`}
        {item.Type === 'Episode' && item.ParentIndexNumber !== undefined && ` S${item.ParentIndexNumber}`}
        {item.Type === 'Episode' && item.IndexNumber !== undefined && `E${item.IndexNumber}`}
      </p>
    </button>
  );
}

// ─── Resume Card (landscape with progress) ───

function JellyfinResumeCard({
  item,
  config,
  onClick,
}: {
  item: JellyfinItem;
  config: JellyfinConfig;
  onClick: () => void;
}) {
  const hasBackdrop = item.BackdropImageTags && item.BackdropImageTags.length > 0;
  const imgUrl = hasBackdrop
    ? getImageUrl(config, item.Id, 'Backdrop', 500)
    : getImageUrl(config, item.Id, 'Primary', 500);
  const progress = getProgressPercent(item);

  const label = item.Type === 'Episode'
    ? `${item.SeriesName || ''} — S${item.ParentIndexNumber || 0}E${item.IndexNumber || 0}`
    : item.Name;

  return (
    <button
      onClick={onClick}
      className="group shrink-0 w-[280px] sm:w-[320px]"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5">
        <img
          src={imgUrl}
          alt={item.Name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={24} className="fill-white ml-0.5" />
          </div>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-medium text-white truncate">{item.Name}</p>
          {item.Type === 'Episode' && (
            <p className="text-xs text-white/50 truncate">{label}</p>
          )}
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}
