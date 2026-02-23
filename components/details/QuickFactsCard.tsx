'use client';

import { Film, Award, DollarSign, Globe, Info } from 'lucide-react';

const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

interface QuickFactsCardProps {
  data: any;
  extRatings: any;
  ratingsLoaded: boolean;
}

export default function QuickFactsCard({ data, extRatings, ratingsLoaded }: QuickFactsCardProps) {
  const crew = data.credits?.crew || [];
  const directors = crew.filter((c: any) => c.job === 'Director').slice(0, 3);
  const writers = crew.filter((c: any) => c.department === 'Writing').slice(0, 4);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
      {data.tagline && (
        <p className="text-xs italic text-white/40 leading-relaxed font-serif">&ldquo;{data.tagline}&rdquo;</p>
      )}
      {directors.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Director</p>
          <div className="space-y-2">
            {directors.map((d: any) => (
              <a key={d.id} href={`https://www.google.com/search?q=${encodeURIComponent(d.name + ' filmmaker')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -m-1 transition-colors">
                {d.profile_path ? (
                  <img src={`${TMDB_PROFILE}${d.profile_path}`} alt={d.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                    {d.name?.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-white/70 group-hover/crew:text-accent transition-colors">{d.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {writers.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Writer</p>
          <div className="space-y-2">
            {writers.map((w: any) => (
              <a key={w.id + w.job} href={`https://www.google.com/search?q=${encodeURIComponent(w.name + ' writer')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 group/crew hover:bg-white/[0.04] rounded-lg p-1 -m-1 transition-colors">
                {w.profile_path ? (
                  <img src={`${TMDB_PROFILE}${w.profile_path}`} alt={w.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-xs font-bold border border-white/[0.08] group-hover/crew:border-accent/40 transition-colors">
                    {w.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-xs text-white/70 group-hover/crew:text-accent transition-colors block">{w.name}</span>
                  <span className="text-[10px] text-white/25">{w.job}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {extRatings?.rated && (
        <div className="flex items-start gap-2.5">
          <Film size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Rated</p>
            <p className="text-xs text-white/70">{extRatings.rated}</p>
          </div>
        </div>
      )}
      {extRatings?.awards && (
        <div className="flex items-start gap-2.5">
          <Award size={14} className="text-accent/60 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Awards</p>
            <p className="text-xs text-white/70 leading-relaxed">{extRatings.awards}</p>
          </div>
        </div>
      )}
      {(extRatings?.boxOffice || data.budget > 0 || data.revenue > 0) && (
        <div className="flex items-start gap-2.5">
          <DollarSign size={14} className="text-green-400/60 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Box Office</p>
            {data.budget > 0 && <p className="text-xs text-white/50">Budget: ${(data.budget / 1e6).toFixed(0)}M</p>}
            {extRatings?.boxOffice && <p className="text-xs text-white/70">Gross: {extRatings.boxOffice}</p>}
            {data.revenue > 0 && <p className="text-xs text-white/70">Revenue: ${(data.revenue / 1e6).toFixed(0)}M</p>}
          </div>
        </div>
      )}
      {extRatings?.country && (
        <div className="flex items-start gap-2.5">
          <Globe size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Country</p>
            <p className="text-xs text-white/70">{extRatings.country}</p>
          </div>
        </div>
      )}
      {data.production_companies?.length > 0 && (
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Studio</p>
            <p className="text-xs text-white/70">{data.production_companies.slice(0, 2).map((c: any) => c.name).join(', ')}</p>
          </div>
        </div>
      )}
      {!ratingsLoaded && data.external_ids?.imdb_id && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-3 h-3 bg-dark-600 rounded" />
              <div className="flex-1">
                <div className="h-2 w-10 bg-dark-600 rounded mb-1" />
                <div className="h-3 w-20 bg-dark-600 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
