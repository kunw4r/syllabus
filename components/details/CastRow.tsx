'use client';

import { useRouter } from 'next/navigation';

const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  known_for_department?: string;
  roles?: { character: string; episode_count: number }[];
  total_episode_count?: number;
}

interface CastRowProps {
  cast: CastMember[];
}

export default function CastRow({ cast }: CastRowProps) {
  const router = useRouter();

  if (!cast || cast.length === 0) return null;

  const sorted = [...cast].sort((a, b) => (b.total_episode_count || 0) - (a.total_episode_count || 0));

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Cast</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {sorted.slice(0, 30).map((actor) => {
          const character = actor.character || actor.roles?.map(r => r.character).filter(Boolean).join(', ') || '';
          const episodeCount = actor.total_episode_count;

          return (
            <div
              key={actor.id}
              onClick={() => router.push(`/actors/${actor.id}`)}
              className="flex-shrink-0 group/actor cursor-pointer"
            >
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 w-[200px]">
                {actor.profile_path ? (
                  <img
                    src={`${TMDB_PROFILE}${actor.profile_path}`}
                    alt={actor.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-white/[0.08] group-hover/actor:ring-accent/40 transition-all shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white/25 text-sm font-bold ring-2 ring-white/[0.08] group-hover/actor:ring-accent/40 transition-all shrink-0">
                    {actor.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/90 truncate group-hover/actor:text-accent transition-colors">{actor.name}</p>
                  {character && (
                    <p className="text-[11px] text-white/35 truncate leading-tight mt-0.5">{character}</p>
                  )}
                  {episodeCount != null && episodeCount > 0 && (
                    <p className="text-[10px] text-white/20 mt-0.5">{episodeCount} ep{episodeCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
