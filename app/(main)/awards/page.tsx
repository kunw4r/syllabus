'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Award, Film, Tv, Grid3X3, Rows3 } from 'lucide-react';
import { TMDB_IMG, TMDB_IMG_ORIGINAL } from '@/lib/constants';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import {
  enrichChart,
  applyStoredScores,
  loadStaticScoreDB,
} from '@/lib/scoring';

// ─── Types ───

interface AwardEntry {
  year: number;
  title: string;
  tmdb_id: number;
}

interface EnrichedEntry extends AwardEntry {
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  unified_rating?: number | null;
  overview?: string;
  id: number;
  [key: string]: unknown;
}

// ─── Tab definitions ───

const TABS = [
  { key: 'oscars', label: 'Oscars', icon: Award },
  { key: 'emmys', label: 'Emmys', icon: Tv },
] as const;

const EMMY_SUBTABS = [
  { key: 'drama', label: 'Outstanding Drama' },
  { key: 'comedy', label: 'Outstanding Comedy' },
] as const;

// ─── Fetch TMDB details in batches ───

async function fetchTmdbDetails(
  entries: AwardEntry[],
  mediaType: 'movie' | 'tv',
  onBatch?: (items: EnrichedEntry[]) => void
): Promise<EnrichedEntry[]> {
  const BATCH = 10;
  const results: EnrichedEntry[] = [];

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (entry) => {
        try {
          const res = await fetch(
            `/api/tmdb/${mediaType}/${entry.tmdb_id}`
          );
          const data = await res.json();
          return {
            ...entry,
            id: entry.tmdb_id,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            vote_average: data.vote_average,
            overview: data.overview,
            name: mediaType === 'tv' ? data.name : undefined,
            release_date: data.release_date,
            first_air_date: data.first_air_date,
            original_language: data.original_language,
            genre_ids: data.genre_ids || (data.genres || []).map((g: any) => g.id),
          } as EnrichedEntry;
        } catch {
          return {
            ...entry,
            id: entry.tmdb_id,
          } as EnrichedEntry;
        }
      })
    );
    results.push(...fetched);
    onBatch?.(results.slice());
  }

  return results;
}

// ─── View layout type ───

type ViewLayout = 'poster' | 'landscape';

// ─── AwardCard sub-component ───

function AwardCard({
  entry,
  mediaType,
  layout,
}: {
  entry: EnrichedEntry;
  mediaType: 'movie' | 'tv';
  layout: ViewLayout;
}) {
  const router = useRouter();
  const [imgBroken, setImgBroken] = useState(false);

  const rating = entry.unified_rating ?? entry.vote_average;
  const poster = entry.poster_path ? `${TMDB_IMG}${entry.poster_path}` : null;
  const backdrop = entry.backdrop_path ? `${TMDB_IMG_ORIGINAL}${entry.backdrop_path}` : null;
  const isLandscape = layout === 'landscape';
  const displayImg = isLandscape && backdrop ? backdrop : poster;

  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => router.push(`/details/${mediaType}/${entry.tmdb_id}`)}
    >
      <div className={`relative ${isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]'} rounded-xl overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-accent/50 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300`}>
        {displayImg && !imgBroken ? (
          <img
            src={displayImg}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgBroken(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-5xl">
            {'\u{1F3AC}'}
          </div>
        )}

        {/* Bottom gradient */}
        <div className={`absolute inset-x-0 bottom-0 ${isLandscape ? 'h-3/4' : 'h-2/3'} bg-gradient-to-t from-black/90 via-black/40 to-transparent`} />

        {/* Year badge — top-left */}
        <div className={`absolute ${isLandscape ? 'top-3 left-3' : 'top-2.5 left-2.5'}`}>
          <span className={`inline-flex items-center gap-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg ${isLandscape ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'} font-bold text-gold`}>
            <Award size={isLandscape ? 14 : 12} className="text-gold" />
            {entry.year}
          </span>
        </div>

        {/* Rating badge — top-right */}
        {rating != null && rating > 0 && (
          <div
            className={`absolute ${isLandscape ? 'top-3 right-3 px-2 py-1' : 'top-2.5 right-2.5 px-1.5 py-0.5'} flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg`}
            style={{ background: getRatingBg(Number(rating)), boxShadow: getRatingGlow(Number(rating)) }}
          >
            <Star size={isLandscape ? 12 : 10} className="fill-current" style={{ color: getRatingHex(Number(rating)) }} />
            <span className={`${isLandscape ? 'text-sm' : 'text-xs'} font-bold`} style={{ color: getRatingHex(Number(rating)) }}>
              {Number(rating).toFixed(1)}
            </span>
          </div>
        )}

        {/* Title + overview — bottom */}
        <div className={`absolute bottom-0 left-0 right-0 ${isLandscape ? 'p-4' : 'p-3'}`}>
          <p className={`font-bold ${isLandscape ? 'text-base sm:text-lg' : 'text-sm'} text-white truncate drop-shadow-lg group-hover:text-accent transition-colors`}>
            {entry.title}
          </p>
          {isLandscape && entry.overview && (
            <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">
              {entry.overview}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function AwardsPage() {
  const [tab, setTab] = useState<string>('oscars');
  const [emmyTab, setEmmyTab] = useState<string>('drama');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('poster');
  const [awardsData, setAwardsData] = useState<any>(null);
  const [items, setItems] = useState<EnrichedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    loadStaticScoreDB();
    fetch('/data/awards.json')
      .then((r) => r.json())
      .then(setAwardsData)
      .catch(console.error);
  }, []);

  const fetchEntries = useCallback(
    async (t: string, et: string) => {
      if (!awardsData) return;
      const thisRequest = ++requestIdRef.current;
      const stale = () => requestIdRef.current !== thisRequest;

      setLoading(true);
      setProgress(null);

      let entries: AwardEntry[] = [];
      let mediaType: 'movie' | 'tv' = 'movie';

      if (t === 'oscars') {
        entries = awardsData.oscar_best_picture || [];
        mediaType = 'movie';
      } else {
        mediaType = 'tv';
        entries =
          et === 'drama'
            ? awardsData.emmy_drama || []
            : awardsData.emmy_comedy || [];
      }

      entries = [...entries].sort((a, b) => b.year - a.year);

      const enriched = await fetchTmdbDetails(entries, mediaType, (partial) => {
        if (stale()) return;
        applyStoredScores(partial, mediaType);
        setItems(partial);
        if (loading) setLoading(false);
      });
      if (stale()) return;

      applyStoredScores(enriched, mediaType);
      setItems(enriched);
      setLoading(false);

      const scored = await enrichChart(
        enriched,
        mediaType,
        null,
        (p) => {
          if (stale()) return;
          setProgress(
            p.total > 0 ? Math.round((p.completed / p.total) * 100) : 100
          );
        }
      );

      if (stale()) return;

      scored.sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
      setItems(scored as EnrichedEntry[]);
      setProgress(null);
    },
    [awardsData]
  );

  useEffect(() => {
    fetchEntries(tab, emmyTab);
  }, [tab, emmyTab, fetchEntries]);

  const mediaType = tab === 'oscars' ? 'movie' : 'tv';

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award size={28} className="text-gold" />
          <h1 className="text-3xl font-black">Awards</h1>
        </div>
        <p className="text-white/40 text-sm">
          Award-winning movies and TV shows throughout history.
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Emmy Sub-tabs */}
      {tab === 'emmys' && (
        <div className="flex gap-1.5 mb-4">
          {EMMY_SUBTABS.map((st) => (
            <button
              key={st.key}
              onClick={() => setEmmyTab(st.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                emmyTab === st.key
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/[0.02] text-white/35 hover:text-white/60 hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      )}

      {/* Category label + View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-white/20">
          {tab === 'oscars'
            ? 'Academy Award for Best Picture'
            : emmyTab === 'drama'
              ? 'Primetime Emmy for Outstanding Drama Series'
              : 'Primetime Emmy for Outstanding Comedy Series'}
        </p>
        <div className="flex gap-1 shrink-0 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
          <button
            onClick={() => setViewLayout('poster')}
            className={`p-1.5 rounded-md transition-all ${viewLayout === 'poster' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            title="Poster view"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewLayout('landscape')}
            className={`p-1.5 rounded-md transition-all ${viewLayout === 'landscape' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            title="Landscape view"
          >
            <Rows3 size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {progress !== null && progress < 100 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[11px] text-white/30 mb-1.5">
            <span>Scoring titles...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className={viewLayout === 'poster'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          {Array.from({ length: viewLayout === 'poster' ? 10 : 9 }, (_, i) => (
            <div key={i} className={`${viewLayout === 'poster' ? 'aspect-[2/3]' : 'aspect-[16/9]'} rounded-xl bg-white/[0.02] animate-pulse`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No data available</p>
        </div>
      ) : (
        <div className={viewLayout === 'poster'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          {items.map((entry) => (
            <AwardCard
              key={`${entry.year}-${entry.tmdb_id}`}
              entry={entry}
              mediaType={mediaType as 'movie' | 'tv'}
              layout={viewLayout}
            />
          ))}
        </div>
      )}
    </div>
  );
}
