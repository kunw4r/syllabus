import { GENRE_ID_TO_NAME } from '@/lib/constants';

// ─── Types ───

interface LibraryItem {
  id: string;
  title: string;
  media_type?: string;
  status?: string;
  poster_url?: string;
  tmdb_id?: number;
  openlibrary_key?: string;
  user_rating?: number;
  external_rating?: number;
  genres?: string;
  added_at?: string;
  updated_at?: string;
}

export interface RecommendationRow {
  strategy: 'because_you_watched' | 'top_genre' | 'throwback' | 'picked_for_you';
  title: string;
  icon: string;
  color: string;
  items: any[];
  sourceTitle?: string;
}

// ─── TMDB Client Helper (uses existing proxy) ───

async function tmdb(endpoint: string, params = '') {
  const res = await fetch(`/api/tmdb${endpoint}?${params.replace(/^&/, '')}`);
  return res.json();
}

// ─── Strategy 1: "Because You Watched [Title]" ───

async function becauseYouWatched(library: LibraryItem[]): Promise<RecommendationRow[]> {
  const recent = library
    .filter((i) => (i.status === 'finished' || i.status === 'watching') && i.media_type !== 'book' && i.tmdb_id)
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.added_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.added_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 3);

  if (recent.length === 0) return [];

  const libraryIds = new Set(library.map((i) => String(i.tmdb_id)));
  const rows: RecommendationRow[] = [];

  await Promise.all(
    recent.map(async (item) => {
      try {
        const mt = item.media_type === 'tv' ? 'tv' : 'movie';
        const data = await tmdb(`/${mt}/${item.tmdb_id}/recommendations`);
        const recs = (data.results || [])
          .filter((r: any) => !libraryIds.has(String(r.id)))
          .slice(0, 15)
          .map((r: any) => ({ ...r, media_type: r.media_type || mt }));

        if (recs.length >= 3) {
          rows.push({
            strategy: 'because_you_watched',
            title: `Because You Watched ${item.title}`,
            icon: '🎯',
            color: 'text-blue-400',
            items: recs,
            sourceTitle: item.title,
          });
        }
      } catch {
        // skip this seed
      }
    })
  );

  return rows;
}

// ─── Strategy 2: "Top 10 [Genre] This Week" ───

async function topGenreRow(library: LibraryItem[]): Promise<RecommendationRow[]> {
  // Count genres from library
  const genreCounts: Record<string, number> = {};
  for (const item of library) {
    if (item.genres) {
      const genreList = item.genres.split(',').map((g) => g.trim());
      for (const g of genreList) {
        if (g && !['TV Movie'].includes(g)) {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      }
    }
  }

  if (Object.keys(genreCounts).length === 0) return [];

  // Find top genre
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Find TMDB genre ID
  const genreId = Object.entries(GENRE_ID_TO_NAME).find(
    ([, name]) => name.toLowerCase() === topGenre.toLowerCase()
  )?.[0];

  if (!genreId) return [];

  const libraryIds = new Set(library.map((i) => String(i.tmdb_id)));

  try {
    const data = await tmdb(
      '/discover/movie',
      `with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&page=1`
    );
    const items = (data.results || [])
      .filter((r: any) => !libraryIds.has(String(r.id)))
      .slice(0, 10)
      .map((r: any) => ({ ...r, media_type: 'movie' }));

    if (items.length < 3) return [];

    return [{
      strategy: 'top_genre',
      title: `Top ${topGenre} This Week`,
      icon: '🔥',
      color: 'text-orange-400',
      items,
    }];
  } catch {
    return [];
  }
}

// ─── Strategy 3: "Throwback Classics" ───

async function throwbackClassics(library: LibraryItem[]): Promise<RecommendationRow[]> {
  // Find most-watched decade
  const decadeCounts: Record<number, number> = {};
  for (const item of library) {
    if (item.added_at) {
      // We don't have release year in library items, so use genres/ratings instead
      // Actually, let's just pick a decade from the 90s/2000s as a safe default
    }
  }

  // Pick a random classic decade (1990s or 2000s)
  const decades = [1990, 2000, 1980];
  const decade = decades[Math.floor(Math.random() * decades.length)];
  const libraryIds = new Set(library.map((i) => String(i.tmdb_id)));

  try {
    const data = await tmdb(
      '/discover/movie',
      `sort_by=vote_average.desc&vote_count.gte=500&primary_release_date.gte=${decade}-01-01&primary_release_date.lte=${decade + 9}-12-31&page=1`
    );
    const items = (data.results || [])
      .filter((r: any) => !libraryIds.has(String(r.id)))
      .slice(0, 15)
      .map((r: any) => ({ ...r, media_type: 'movie' }));

    if (items.length < 3) return [];

    return [{
      strategy: 'throwback',
      title: `Throwback Classics — ${decade}s`,
      icon: '📼',
      color: 'text-purple-400',
      items,
    }];
  } catch {
    return [];
  }
}

// ─── Strategy 4: "Picked for You" (reuses getSmartRecommendations logic) ───

async function pickedForYou(library: LibraryItem[]): Promise<RecommendationRow[]> {
  const rated = library
    .filter((i) => i.status === 'finished' && i.media_type !== 'book' && i.tmdb_id)
    .sort((a, b) => (b.user_rating || b.external_rating || 0) - (a.user_rating || a.external_rating || 0))
    .slice(0, 5);

  const watching = library
    .filter((i) => i.status === 'watching' && i.media_type !== 'book' && i.tmdb_id)
    .slice(0, 3);

  const seeds = [...rated, ...watching].slice(0, 6);
  if (seeds.length === 0) return [];

  const libraryIds = new Set(library.map((i) => String(i.tmdb_id)));

  try {
    const allRecs = await Promise.all(
      seeds.map(async (item) => {
        try {
          const mt = item.media_type === 'tv' ? 'tv' : 'movie';
          const data = await tmdb(`/${mt}/${item.tmdb_id}`, 'append_to_response=recommendations');
          return (data.recommendations?.results || []).map((r: any) => ({
            ...r,
            media_type: r.media_type || mt,
          }));
        } catch {
          return [];
        }
      })
    );

    const seen = new Set<string>();
    const unique = allRecs.flat().filter((r: any) => {
      const key = `${r.media_type}-${r.id}`;
      if (seen.has(key) || libraryIds.has(String(r.id))) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
    const items = unique.slice(0, 20);

    if (items.length < 3) return [];

    return [{
      strategy: 'picked_for_you',
      title: 'Picked for You',
      icon: '✨',
      color: 'text-accent',
      items,
    }];
  } catch {
    return [];
  }
}

// ─── Orchestrator ───

export async function getAllRecommendations(library: LibraryItem[]): Promise<RecommendationRow[]> {
  // Cold start: skip if library < 3 items
  if (!library || library.length < 3) return [];

  const [picked, because, genre, throwback] = await Promise.all([
    pickedForYou(library),
    becauseYouWatched(library),
    topGenreRow(library),
    throwbackClassics(library),
  ]);

  // Order: Picked for You first, then Because You Watched rows, then genre, then throwback
  return [...picked, ...because, ...genre, ...throwback];
}
