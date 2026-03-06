'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, Film, Tv, Calendar, MapPin, ChevronLeft, Award, ArrowUpDown,
  Heart, Users, Ruler,
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

  // Wikidata personal details
  const [wikiDetails, setWikiDetails] = useState<{
    height?: string;
    spouse?: string;
    children?: number;
  }>({});

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
        // Fetch personal details from Wikidata via IMDB ID
        const imdbId = data.imdb_id || data.external_ids?.imdb_id;
        if (imdbId) {
          fetchWikidata(imdbId).then((details) => {
            if (details) setWikiDetails(details);
          });
        }
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

  // Parse personal details from biography
  const personalDetails = useMemo(() => {
    if (!person?.biography) return {};
    const bio = person.biography;
    const details: { spouse?: string; children?: string; height?: string } = {};

    // Spouse patterns
    const spousePatterns = [
      /(?:married|wed)\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      /(?:spouse|wife|husband|partner)(?:\s+is)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      /(?:married)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+in/i,
    ];
    for (const pattern of spousePatterns) {
      const match = bio.match(pattern);
      if (match) { details.spouse = match[1].trim(); break; }
    }

    // Children patterns
    const childPatterns = [
      /(\w+)\s+children/i,
      /(?:has|have)\s+(\d+)\s+(?:children|kids|daughters?|sons?)/i,
      /(?:father|mother)\s+of\s+(\w+)/i,
    ];
    const numberWords: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6' };
    for (const pattern of childPatterns) {
      const match = bio.match(pattern);
      if (match) {
        const val = match[1].toLowerCase();
        details.children = numberWords[val] || match[1];
        break;
      }
    }

    // Height patterns
    const heightPatterns = [
      /(\d['′']\s*\d{1,2}["″"]?)/,
      /((?:1[5-9]|2[0-2])\d\s*cm)/i,
      /(\d\.\d{1,2}\s*m(?:eters?)?)\b/i,
    ];
    for (const pattern of heightPatterns) {
      const match = bio.match(pattern);
      if (match) { details.height = match[1].trim(); break; }
    }

    return details;
  }, [person?.biography]);

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

  // Career span — use birthday as lower bound so bad data doesn't show 1975 for someone born 1992
  const birthYear = person?.birthday ? new Date(person.birthday).getFullYear() : null;
  const minCareerYear = birthYear ? birthYear + 5 : 1900; // no one starts before age 5
  const allYears = [
    ...movieCredits.map((c) => c.release_date?.slice(0, 4)),
    ...tvCredits.map((c) => c.first_air_date?.slice(0, 4)),
  ]
    .filter(Boolean)
    .map(Number)
    .filter((y) => y >= minCareerYear);
  const careerStart = allYears.length > 0 ? Math.min(...allYears) : null;
  const careerEnd = allYears.length > 0 ? Math.max(...allYears) : null;

  if (loading) {
    return (
      <div className="min-w-0 animate-pulse">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-white/5" />
          <div className="h-4 w-16 rounded bg-white/5" />
        </div>
        <div className="flex flex-col sm:flex-row gap-8 mb-10">
          <div className="w-48 sm:w-56 aspect-[2/3] rounded-2xl bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-9 w-56 rounded bg-white/5" />
            <div className="h-4 w-40 rounded bg-white/5" />
            <div className="flex gap-3">
              <div className="h-20 w-24 rounded-xl bg-white/5" />
              <div className="h-20 w-24 rounded-xl bg-white/5" />
              <div className="h-20 w-24 rounded-xl bg-white/5" />
            </div>
            <div className="h-24 w-full rounded bg-white/5" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors"
      >
        <ChevronLeft size={18} /> Back
      </button>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row gap-8 mb-10">
        {/* Photo — larger, with glow */}
        <div className="relative flex-shrink-0">
          {person.profile_path ? (
            <img
              src={`${TMDB_PROFILE_LG}${person.profile_path}`}
              alt={person.name}
              className="w-48 sm:w-56 aspect-[2/3] rounded-2xl object-cover ring-1 ring-white/[0.08]"
            />
          ) : (
            <div className="w-48 sm:w-56 aspect-[2/3] rounded-2xl bg-dark-700 flex items-center justify-center text-white/15 text-5xl font-bold ring-1 ring-white/[0.08]">
              {person.name?.charAt(0)}
            </div>
          )}
          {/* Ambient glow behind photo */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-accent/10 blur-2xl opacity-40" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">{person.name}</h1>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 text-sm text-white/40 mb-4">
            {person.birthday && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <Calendar size={13} className="text-white/30" />
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
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <MapPin size={13} className="text-white/30" />
                {person.place_of_birth}
              </span>
            )}
            {(wikiDetails.height || personalDetails.height) && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <Ruler size={13} className="text-white/30" />
                {wikiDetails.height || personalDetails.height}
              </span>
            )}
            {(wikiDetails.spouse || personalDetails.spouse) && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <Heart size={13} className="text-white/30" />
                {wikiDetails.spouse || personalDetails.spouse}
              </span>
            )}
            {(wikiDetails.children || personalDetails.children) && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                <Users size={13} className="text-white/30" />
                {wikiDetails.children || personalDetails.children} children
              </span>
            )}
          </div>

          {/* Glassmorphic Stats */}
          <div className="flex gap-3 mb-5">
            <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl px-5 py-3 text-center">
              <p className="text-xl font-black">{movieCredits.length}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Movies</p>
            </div>
            <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl px-5 py-3 text-center">
              <p className="text-xl font-black">{tvCredits.length}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">TV Shows</p>
            </div>
            {careerStart && careerEnd && (
              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl px-5 py-3 text-center">
                <p className="text-xl font-black">
                  {careerStart}–{careerEnd === new Date().getFullYear() ? 'Now' : careerEnd}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Career</p>
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
                  className="text-accent text-xs mt-1.5 hover:underline font-medium"
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
        <div className="mb-10 bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/50 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Award size={14} className="text-gold" /> Awards Across Filmography
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {awards.totalOscarWins > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-gold">{awards.totalOscarWins}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                  Oscar Win{awards.totalOscarWins > 1 ? 's' : ''}
                </p>
              </div>
            )}
            {awards.totalOscarNoms > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-white/60">{awards.totalOscarNoms}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Oscar Noms</p>
              </div>
            )}
            {awards.totalEmmyWins > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-gold">{awards.totalEmmyWins}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                  Emmy Win{awards.totalEmmyWins > 1 ? 's' : ''}
                </p>
              </div>
            )}
            {awards.totalWins > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-white/60">{awards.totalWins}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Total Wins</p>
              </div>
            )}
            {awards.totalNoms > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-white/60">{awards.totalNoms}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Total Noms</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filmography Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-xl font-black mr-2">Filmography</h2>

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
        <div className="mb-5">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {credits.map((c: any) => (
            <div key={`${c.id}-${c.character}`}>
              <MediaCard
                item={c}
                mediaType={tab === 'movies' ? 'movie' : 'tv'}
                variant="landscape"
              />
              {c.character && (
                <p className="text-[10px] text-white/25 mt-1.5 truncate px-0.5">
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

async function fetchWikidata(imdbId: string): Promise<{ height?: string; spouse?: string; children?: number } | null> {
  try {
    // Step 1: Find Wikidata entity from IMDB ID
    const sparqlQuery = `
      SELECT ?person ?height ?spouseLabel ?children WHERE {
        ?person wdt:P345 "${imdbId}" .
        OPTIONAL { ?person wdt:P2048 ?height . }
        OPTIONAL { ?person wdt:P26 ?spouse . }
        OPTIONAL { ?person wdt:P1971 ?children . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      } LIMIT 10
    `;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results?.bindings;
    if (!results || results.length === 0) return null;

    const details: { height?: string; spouse?: string; children?: number } = {};

    // Height — convert meters to ft/in
    const heightM = results[0].height?.value;
    if (heightM) {
      const m = parseFloat(heightM);
      const totalInches = m * 39.3701;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      details.height = `${ft}'${inches}" (${m.toFixed(2)}m)`;
    }

    // Spouse — collect unique names
    const spouses = [...new Set(results.map((r: any) => r.spouseLabel?.value).filter(Boolean))];
    if (spouses.length > 0) {
      details.spouse = spouses.join(', ');
    }

    // Children
    const childCount = results[0].children?.value;
    if (childCount) {
      details.children = parseInt(childCount, 10);
    }

    return Object.keys(details).length > 0 ? details : null;
  } catch {
    return null;
  }
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
