'use client';

import { useRouter } from 'next/navigation';

const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  known_for_department?: string;
}

interface CastRowProps {
  cast: CastMember[];
}

export default function CastRow({ cast }: CastRowProps) {
  const router = useRouter();

  if (!cast || cast.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Cast</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {cast.slice(0, 10).map((actor) => (
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
            <p className="text-[10px] text-white/30 truncate">{actor.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
