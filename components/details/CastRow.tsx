'use client';

import { useRouter } from 'next/navigation';

const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  known_for_department?: string;
  // aggregate_credits fields (TV)
  roles?: { character: string; episode_count: number }[];
  total_episode_count?: number;
}

interface CastRowProps {
  cast: CastMember[];
}

export default function CastRow({ cast }: CastRowProps) {
  const router = useRouter();

  if (!cast || cast.length === 0) return null;

  // Sort by total_episode_count descending (TV aggregate_credits), fall back to original order
  const sorted = [...cast].sort((a, b) => (b.total_episode_count || 0) - (a.total_episode_count || 0));

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Cast</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {sorted.slice(0, 30).map((actor) => {
          // For aggregate_credits, character comes from roles array
          const character = actor.character || actor.roles?.map(r => r.character).filter(Boolean).join(', ') || '';
          const episodeCount = actor.total_episode_count;

          return (
            <div
              key={actor.id}
              onClick={() => router.push(`/actors/${actor.id}`)}
              className="flex-shrink-0 w-[90px] group/actor text-center cursor-pointer"
            >
              <div className="relative">
                {actor.profile_path ? (
                  <img
                    src={`${TMDB_PROFILE}${actor.profile_path}`}
                    alt={actor.name}
                    className="w-[90px] h-[90px] rounded-full object-cover border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-all duration-300 group-hover/actor:scale-105"
                  />
                ) : (
                  <div className="w-[90px] h-[90px] rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-lg font-bold border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-all duration-300">
                    {actor.name?.charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium mt-2 truncate group-hover/actor:text-accent transition-colors">{actor.name}</p>
              <p className="text-[10px] text-white/30 truncate">{character}</p>
              {episodeCount != null && episodeCount > 0 && (
                <p className="text-[9px] text-white/20">{episodeCount} ep{episodeCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
