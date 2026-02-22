'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Award, Film, Tv } from 'lucide-react';
import { TMDB_IMG } from '@/lib/constants';
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
  mediaType: 'movie' | 'tv'
): Promise<EnrichedEntry[]> {
  const BATCH = 5;
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
  }

  return results;
}

// ─── RankedItem sub-component (adapted from Top 100) ───

function AwardItem({
  entry,
  mediaType,
}: {
  entry: EnrichedEntry;
  mediaType: 'movie' | 'tv';
}) {
  const router = useRouter();
  const [imgBroken, setImgBroken] = useState(false);

  const rating = entry.unified_rating ?? entry.vote_average;
  const ratingLabel = entry.unified_rating != null ? 'Syllabus' : '';
  const poster = entry.poster_path ? `${TMDB_IMG}${entry.poster_path}` : null;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer group"
      onClick={() => router.push(`/details/${mediaType}/${entry.tmdb_id}`)}
    >
      {/* Year */}
      <span className="text-lg sm:text-xl font-bold w-14 sm:w-16 text-center flex-shrink-0 text-white/25">
        {entry.year}
      </span>

      {/* Poster */}
      {poster && !imgBroken ? (
        <img
          src={poster}
          alt={entry.title}
          className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform object-cover aspect-[2/3]"
          onError={() => setImgBroken(true)}
          loading="lazy"
        />
      ) : (
        <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-dark-600 flex-shrink-0 flex items-center justify-center aspect-[2/3]">
          <Film size={16} className="text-white/20" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base truncate">
          {entry.title}
        </p>
        {entry.overview && (
          <p className="text-xs text-white/30 mt-0.5 line-clamp-1">
            {entry.overview}
          </p>
        )}
      </div>

      {/* Rating */}
      {rating != null && rating > 0 && (
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-gold fill-gold" />
            <span className="text-sm font-bold">
              {Number(rating).toFixed(1)}
            </span>
            <span className="text-[10px] text-white/20 hidden sm:inline">
              / 10
            </span>
          </div>
          {ratingLabel && (
            <span className="text-[9px] text-white/15 mt-0.5">
              {ratingLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function AwardsPage() {
  const [tab, setTab] = useState<string>('oscars');
  const [emmyTab, setEmmyTab] = useState<string>('drama');
  const [awardsData, setAwardsData] = useState<any>(null);
  const [items, setItems] = useState<EnrichedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  // Load static scores and awards data
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

      // Sort newest first
      entries = [...entries].sort((a, b) => b.year - a.year);

      // Fetch TMDB details
      const enriched = await fetchTmdbDetails(entries, mediaType);
      if (stale()) return;

      // Apply locally stored scores
      applyStoredScores(enriched, mediaType);
      setItems(enriched);
      setLoading(false);

      // Background enrichment for Syllabus scores
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

      // Re-sort by year (not rating) since this is a chronological awards list
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

      {/* Category label */}
      <p className="text-xs text-white/20 mb-4">
        {tab === 'oscars'
          ? 'Academy Award for Best Picture'
          : emmyTab === 'drama'
            ? 'Primetime Emmy for Outstanding Drama Series'
            : 'Primetime Emmy for Outstanding Comedy Series'}
      </p>

      {/* Progress bar */}
      {progress !== null && progress < 100 && (
        <div className="mb-4">
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

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] animate-pulse"
            >
              <div className="w-14 sm:w-16 h-6 rounded bg-white/5" />
              <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-white/5" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-white/5 mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No data available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((entry) => (
            <AwardItem
              key={`${entry.year}-${entry.tmdb_id}`}
              entry={entry}
              mediaType={mediaType as 'movie' | 'tv'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
