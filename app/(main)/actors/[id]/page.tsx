'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Film, Tv, Calendar, MapPin, ChevronLeft, Award, ArrowUpDown,
} from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';
import {
  enrichChart,
  applyStoredScores,
  loadStaticScoreDB,
} from '@/lib/scoring';
import { getPersonDetails } from '@/lib/api/person';
import { getOmdbEntry } from '@/lib/scoring';
import { aggregateActorAwards } from '@/lib/awards-data';
import { TMDB_IMG } from '@/lib/constants';

const TMDB_PROFILE_LG = 'https://image.tmdb.org/t/p/w500';
const MAX_ENRICH = 30;

type SortMode = 'rating' | 'year' | 'popularity';
type CreditTab = 'movies' | 'tv';

export default function ActorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filmography
  const [tab, setTab] = useState<CreditTab>('movies');
  const [sort, setSort] = useState<SortMode>('rating');
  const [movieCredits, setMovieCredits] = useState<any[]>([]);
  const [tvCredits, setTvCredits] = useState<any[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  // Awards summary
  const [awards, setAwards] = useState<ReturnType<typeof aggregateActorAwards> | null>(null);

  // Bio expansion
  const [bioExpanded, setBioExpanded] = useState(false);

  const enrichedRef = useRef<{ movies: boolean; tv: boolean }>({ movies: false, tv: false });

  useEffect(() => {
    loadStaticScoreDB();

    async function load() {
      try {
        const data = await getPersonDetails(id);
        setPerson(data);

        // Process movie credits — dedupe, add media_type
        const movies = dedupeCredits(
          (data.movie_credits?.cast || []).map((c: any) => ({
            ...c,
            media_type: 'movie',
          }))
        );
        applyStoredScores(movies, 'movie');
        setMovieCredits(sortCredits(movies, 'rating'));

        // Process TV credits
        const tv = dedupeCredits(
          (data.tv_credits?.cast || []).map((c: any) => ({
            ...c,
            media_type: 'tv',
          }))
        );
        applyStoredScores(tv, 'tv');
        setTvCredits(sortCredits(tv, 'rating'));

        // Background enrich movies (top 30 by popularity)
        enrichCredits(movies, 'movie', (enriched) => {
          setMovieCredits(sortCredits(enriched, 'rating'));
          enrichedRef.current.movies = true;
          buildAwardsSummary(enriched);
        });
      } catch (err) {
        console.error('[Actor] Failed to load:', err);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Re-enrich when switching to TV tab for the first time
  useEffect(() => {
    if (tab === 'tv' && !enrichedRef.current.tv && tvCredits.length > 0) {
      enrichCredits(tvCredits, 'tv', (enriched) => {
        setTvCredits(sortCredits(enriched, sort));
        enrichedRef.current.tv = true;
      });
    }
  }, [tab]);

  async function enrichCredits(
    credits: any[],
    mediaType: string,
    onDone: (enriched: any[]) => void
  ) {
    setEnriching(true);
    setProgress(0);

    // Only enrich top 30 by popularity to avoid rate limits
    const toEnrich = [...credits]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, MAX_ENRICH);

    const rest = credits.filter(
      (c) => !toEnrich.find((e) => e.id === c.id)
    );

    const enriched = await enrichChart(
      toEnrich,
      mediaType,
      null,
      (p) => {
        setProgress(p.total > 0 ? Math.round((p.completed / p.total) * 100) : 100);
      }
    );

    onDone([...enriched, ...rest]);
    setEnriching(false);
    setProgress(null);
  }

  function buildAwardsSummary(movies: any[]) {
    const filmsWithAwards: { title: string; awards?: string }[] = [];
    for (const m of movies) {
      const omdb = getOmdbEntry(`movie:${m.id}`);
      if (omdb?.awards) {
        filmsWithAwards.push({ title: m.title || m.name, awards: omdb.awards });
      }
    }
    if (filmsWithAwards.length > 0) {
      setAwards(aggregateActorAwards(filmsWithAwards));
    }
  }

  // Re-sort when sort mode changes
  useEffect(() => {
    if (tab === 'movies') {
      setMovieCredits((prev) => sortCredits([...prev], sort));
    } else {
      setTvCredits((prev) => sortCredits([...prev], sort));
    }
  }, [sort]);

  const credits = tab === 'movies' ? movieCredits : tvCredits;

  // Person info
  const age = person?.birthday
    ? Math.floor(
        (Date.now() - new Date(person.birthday).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;
  const deathAge =
    person?.birthday && person?.deathday
      ? Math.floor(
          (new Date(person.deathday).getTime() -
            new Date(person.birthday).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

  // Career span
  const allYears = [
    ...movieCredits.map((c) => c.release_date?.slice(0, 4)),
    ...tvCredits.map((c) => c.first_air_date?.slice(0, 4)),
  ]
    .filter(Boolean)
    .map(Number)
    .filter((y) => y > 1900);
  const careerStart = allYears.length > 0 ? Math.min(...allYears) : null;
  const careerEnd = allYears.length > 0 ? Math.max(...allYears) : null;

  if (loading) {
    return (
      <div className="min-w-0 animate-pulse">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded bg-white/5" />
          <div className="h-4 w-16 rounded bg-white/5" />
        </div>
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-40 h-52 rounded-2xl bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 rounded bg-white/5" />
            <div className="h-4 w-32 rounded bg-white/5" />
            <div className="h-4 w-64 rounded bg-white/5" />
            <div className="h-20 w-full rounded bg-white/5" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-20 text-white/30">
        <p className="text-lg">Actor not found</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Photo */}
        {person.profile_path ? (
          <img
            src={`${TMDB_PROFILE_LG}${person.profile_path}`}
            alt={person.name}
            className="w-40 h-52 rounded-2xl object-cover border-2 border-white/[0.06] flex-shrink-0"
          />
        ) : (
          <div className="w-40 h-52 rounded-2xl bg-dark-600 flex items-center justify-center text-white/20 text-4xl font-bold border-2 border-white/[0.06] flex-shrink-0">
            {person.name?.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black mb-2">{person.name}</h1>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-sm text-white/40 mb-3">
            {person.birthday && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(person.birthday).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {person.deathday
                  ? ` (died age ${deathAge})`
                  : age
                    ? ` (age ${age})`
                    : ''}
              </span>
            )}
            {person.place_of_birth && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {person.place_of_birth}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-4">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold">{movieCredits.length}</p>
              <p className="text-[10px] text-white/30 uppercase">Movies</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold">{tvCredits.length}</p>
              <p className="text-[10px] text-white/30 uppercase">TV Shows</p>
            </div>
            {careerStart && careerEnd && (
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-center">
                <p className="text-lg font-bold">
                  {careerEnd - careerStart}
                </p>
                <p className="text-[10px] text-white/30 uppercase">Year Career</p>
              </div>
            )}
          </div>

          {/* Biography */}
          {person.biography && (
            <div className="relative">
              <p
                className={`text-sm text-white/50 leading-relaxed ${
                  !bioExpanded ? 'line-clamp-4' : ''
                }`}
              >
                {person.biography}
              </p>
              {person.biography.length > 300 && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-accent text-xs mt-1 hover:underline"
                >
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Awards Summary */}
      {awards && (awards.totalOscarWins > 0 || awards.totalEmmyWins > 0 || awards.totalWins > 5) && (
        <div className="mb-8 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Award size={14} className="text-gold" /> Awards Across Filmography
          </h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {awards.totalOscarWins > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gold font-bold">{awards.totalOscarWins}</span>
                <span className="text-white/40">
                  Oscar Win{awards.totalOscarWins > 1 ? 's' : ''} across{' '}
                  {awards.oscarWinningFilms.length} film{awards.oscarWinningFilms.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {awards.totalOscarNoms > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-bold">{awards.totalOscarNoms}</span>
                <span className="text-white/40">Oscar Nominations</span>
              </div>
            )}
            {awards.totalEmmyWins > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gold font-bold">{awards.totalEmmyWins}</span>
                <span className="text-white/40">
                  Emmy Win{awards.totalEmmyWins > 1 ? 's' : ''} across{' '}
                  {awards.emmyWinningShows.length} show{awards.emmyWinningShows.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {awards.totalWins > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-bold">{awards.totalWins}</span>
                <span className="text-white/40">Total Wins</span>
              </div>
            )}
            {awards.totalNoms > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-bold">{awards.totalNoms}</span>
                <span className="text-white/40">Total Nominations</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filmography Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg font-bold mr-2">Filmography</h2>

        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('movies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === 'movies'
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <Film size={14} /> Movies
          </button>
          <button
            onClick={() => setTab('tv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === 'tv'
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <Tv size={14} /> TV Shows
          </button>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown size={14} className="text-white/30" />
          {(['rating', 'year', 'popularity'] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                sort === s
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/[0.02] text-white/35 hover:text-white/60 hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {s === 'rating' ? 'By Rating' : s === 'year' ? 'By Year' : 'By Popularity'}
            </button>
          ))}
        </div>
      </div>

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

      {/* Credits Grid */}
      {credits.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-lg">No {tab === 'movies' ? 'movie' : 'TV'} credits found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {credits.map((c: any) => (
            <div key={`${c.id}-${c.character}`} className="w-full">
              <MediaCard
                item={c}
                mediaType={tab === 'movies' ? 'movie' : 'tv'}
              />
              {c.character && (
                <p className="text-[10px] text-white/25 mt-1 truncate px-0.5">
                  as {c.character}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function dedupeCredits(credits: any[]): any[] {
  const seen = new Set<number>();
  return credits.filter((c) => {
    if (!c.id || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function sortCredits(credits: any[], mode: SortMode): any[] {
  const arr = [...credits];
  switch (mode) {
    case 'rating':
      return arr.sort((a, b) => {
        const ra = a.unified_rating ?? a.vote_average ?? 0;
        const rb = b.unified_rating ?? b.vote_average ?? 0;
        return rb - ra;
      });
    case 'year':
      return arr.sort((a, b) => {
        const ya = (a.release_date || a.first_air_date || '0').slice(0, 4);
        const yb = (b.release_date || b.first_air_date || '0').slice(0, 4);
        return yb.localeCompare(ya);
      });
    case 'popularity':
      return arr.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
}
