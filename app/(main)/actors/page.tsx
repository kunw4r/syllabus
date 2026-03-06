'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users } from 'lucide-react';
import { searchPerson, getPopularActors } from '@/lib/api/person';

const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w500';

export default function ActorsPage() {
  const router = useRouter();
  const [popular, setPopular] = useState<any[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPopularActors()
      .then(setPopular)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchPerson(query);
    setResults(data);
    setSearching(false);
  };

  const clearSearch = () => {
    setResults(null);
    setQuery('');
  };

  const actors = results ?? popular;

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-accent" />
          <h1 className="text-3xl font-black">Actors</h1>
        </div>
        <p className="text-white/40 text-sm">
          Search for actors and explore their filmography.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actors..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Search
        </button>
        {results && (
          <button
            type="button"
            onClick={clearSearch}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </form>

      {/* Results label */}
      {results && (
        <h2 className="text-xl font-semibold mb-5">
          Results for &ldquo;{query}&rdquo;
        </h2>
      )}
      {!results && (
        <h2 className="text-sm font-medium text-white/20 uppercase tracking-wider mb-5">Popular Actors</h2>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : actors.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No actors found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {actors.map((actor: any) => (
            <div
              key={actor.id}
              onClick={() => router.push(`/actors/${actor.id}`)}
              className="group relative cursor-pointer"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-accent/50 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300">
                {actor.profile_path ? (
                  <img
                    src={`${TMDB_PROFILE}${actor.profile_path}`}
                    alt={actor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/15 text-5xl font-bold">
                    {actor.name?.charAt(0)}
                  </div>
                )}

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Name + known for */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="font-bold text-sm text-white truncate drop-shadow-lg group-hover:text-accent transition-colors">
                    {actor.name}
                  </p>
                  {actor.known_for?.length > 0 && (
                    <p className="text-[11px] text-white/35 mt-0.5 truncate">
                      {actor.known_for
                        .slice(0, 2)
                        .map((k: any) => k.title || k.name)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
