'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import {
  getMoviesByCompany,
  getMoviesByLanguage,
  getTVByCompany,
  getTVByLanguage,
  getTopRatedByCompany,
  getTopRatedByLanguage,
} from '@/lib/api/tmdb';
import {
  applyStoredScores,
  loadStaticScoreDB,
  enrichItemsWithRatings,
} from '@/lib/scoring';
import { STUDIOS, type Studio } from '@/lib/constants';

type Tab = 'movies' | 'tv';

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = STUDIOS.find((s) => s.slug === slug);

  const [tab, setTab] = useState<Tab>('movies');
  const [popular, setPopular] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [page2, setPage2] = useState<any[]>([]);
  const [page3, setPage3] = useState<any[]>([]);
  const [tvPopular, setTvPopular] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tvLoaded, setTvLoaded] = useState(false);

  const fetchMovies = useCallback(async (s: Studio) => {
    setLoading(true);
    const fetcher = s.tmdb_id
      ? (page: number) => getMoviesByCompany(s.tmdb_id!, page)
      : (page: number) => getMoviesByLanguage(s.language!, page);
    const topFetcher = s.tmdb_id
      ? () => getTopRatedByCompany(s.tmdb_id!)
      : () => getTopRatedByLanguage(s.language!);

    const [p1, p2, p3, top] = await Promise.all([
      fetcher(1),
      fetcher(2),
      fetcher(3),
      topFetcher(),
    ]);

    applyStoredScores(p1, 'movie');
    applyStoredScores(p2, 'movie');
    applyStoredScores(p3, 'movie');
    applyStoredScores(top, 'movie');

    setPopular(p1);
    setPage2(p2);
    setPage3(p3);
    setTopRated(top);
    setLoading(false);

    enrichItemsWithRatings(p1, 'movie').then(setPopular);
    enrichItemsWithRatings(top, 'movie').then(setTopRated);
  }, []);

  const fetchTV = useCallback(async (s: Studio) => {
    if (tvLoaded) return;
    const fetcher = s.tmdb_id
      ? () => getTVByCompany(s.tmdb_id!)
      : () => getTVByLanguage(s.language!);

    const data = await fetcher();
    applyStoredScores(data, 'tv');
    setTvPopular(data);
    setTvLoaded(true);

    enrichItemsWithRatings(data, 'tv').then(setTvPopular);
  }, [tvLoaded]);

  useEffect(() => {
    if (!studio) return;
    loadStaticScoreDB();
    fetchMovies(studio);
  }, [studio, fetchMovies]);

  useEffect(() => {
    if (!studio || tab !== 'tv') return;
    fetchTV(studio);
  }, [studio, tab, fetchTV]);

  if (!studio) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 text-lg">Studio not found</p>
        <button onClick={() => router.push('/studios')} className="mt-4 text-accent hover:underline text-sm">
          Back to Studios
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/studios')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          All Studios
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${studio.color} flex items-center justify-center text-2xl sm:text-3xl shadow-lg`}>
            {studio.icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">{studio.name}</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {studio.tmdb_id ? 'Production Company' : studio.language === 'hi' ? 'Indian Film Industry' : studio.language === 'ko' ? 'South Korean Cinema' : 'Japanese Animation'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['movies', 'tv'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {t === 'movies' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {tab === 'movies' ? (
        loading ? (
          <div className="space-y-8">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {topRated.length > 0 && (
              <ScrollRow title="Top Rated">
                {topRated.map((m: any) => (
                  <div key={m.id} className="flex-shrink-0 w-[150px]">
                    <MediaCard item={m} mediaType="movie" />
                  </div>
                ))}
              </ScrollRow>
            )}

            {popular.length > 0 && (
              <ScrollRow title="Popular">
                {popular.map((m: any) => (
                  <div key={m.id} className="flex-shrink-0 w-[150px]">
                    <MediaCard item={m} mediaType="movie" />
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* More movies as grid */}
            {(page2.length > 0 || page3.length > 0) && (
              <div className="mt-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">More from {studio.name}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {[...page2, ...page3].map((m: any) => (
                    <MediaCard key={m.id} item={m} mediaType="movie" />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      ) : (
        !tvLoaded ? (
          <div className="space-y-8">
            <SkeletonRow />
          </div>
        ) : tvPopular.length > 0 ? (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">TV Shows</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {tvPopular.map((s: any) => (
                <MediaCard key={s.id} item={s} mediaType="tv" />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-sm py-10 text-center">No TV shows found for {studio.name}</p>
        )
      )}
    </div>
  );
}
