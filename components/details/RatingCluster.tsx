'use client';

import { Star, ExternalLink } from 'lucide-react';
import { m } from 'framer-motion';

interface RatingClusterProps {
  avgScore: number | null;
  tmdbScore: number | null;
  mediaType: string;
  dataId: number;
  extRatings: any;
  ratingsLoaded: boolean;
  imdbId?: string;
  isAnime?: boolean;
  malData?: any;
  title: string;
  getSyllabusScore: (mt: string, id: number) => number | null;
}

const ratingVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

export default function RatingCluster({
  avgScore,
  tmdbScore,
  mediaType,
  dataId,
  extRatings,
  ratingsLoaded,
  imdbId,
  isAnime,
  malData,
  title,
  getSyllabusScore,
}: RatingClusterProps) {
  const syllabusScore = avgScore || getSyllabusScore(mediaType, dataId);
  const displayScore = syllabusScore || (tmdbScore ? tmdbScore.toFixed(1) : null);
  const label = syllabusScore ? 'Syllabus Score' : 'TMDB';

  return (
    <div className="flex flex-wrap items-stretch gap-3 mb-6">
      {/* Syllabus / TMDB Score */}
      {displayScore && (
        <m.div
          custom={0}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[90px] flex flex-col justify-center"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Star size={16} className="text-gold fill-gold" />
            <span className="text-xl font-black">{displayScore}</span>
            <span className="text-white/30 text-xs">/ 10</span>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
        </m.div>
      )}

      {/* IMDb */}
      {extRatings?.imdb && (
        <m.a
          custom={1}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          href={`https://www.imdb.com/title/${imdbId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#f5c518]/[0.08] border border-[#f5c518]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#f5c518]/[0.15] transition-colors cursor-pointer flex flex-col justify-center"
        >
          {/* IMDb logo inline */}
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-[10px] font-black bg-[#f5c518] text-black px-1.5 py-0.5 rounded">IMDb</span>
          </div>
          <p className="text-xl font-black text-[#f5c518]">{extRatings.imdb.score}</p>
          {extRatings.imdb.votes && (
            <p className="text-[9px] text-white/20">{extRatings.imdb.votes} votes</p>
          )}
        </m.a>
      )}

      {/* Rotten Tomatoes */}
      {extRatings?.rt && (
        <m.a
          custom={2}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-white/[0.08] transition-colors cursor-pointer flex flex-col justify-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-[10px] font-bold text-red-400">RT</span>
          </div>
          <p className="text-xl font-black">
            <span className={parseInt(extRatings.rt.score) >= 60 ? 'text-red-400' : 'text-green-400'}>
              {extRatings.rt.score}
            </span>
          </p>
        </m.a>
      )}

      {/* Metacritic */}
      {extRatings?.metacritic && (
        <m.div
          custom={3}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[90px] flex flex-col justify-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-[10px] font-bold text-yellow-500">M</span>
          </div>
          <p className="text-xl font-black text-yellow-500">{extRatings.metacritic.score}</p>
        </m.div>
      )}

      {/* MAL (anime only) */}
      {isAnime && malData?.score && (
        <m.a
          custom={3}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          href={malData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#2e51a2]/10 border border-[#2e51a2]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#2e51a2]/20 transition-colors flex flex-col justify-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-[10px] font-bold text-[#2e51a2]">MAL</span>
          </div>
          <p className="text-xl font-black text-[#2e51a2]">{malData.score}</p>
          {malData.scored_by && (
            <p className="text-[9px] text-white/20">{malData.scored_by.toLocaleString()} votes</p>
          )}
        </m.a>
      )}

      {/* Crunchyroll (anime only) */}
      {isAnime && (
        <m.a
          custom={4}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#f47521]/10 border border-[#f47521]/20 rounded-xl px-4 py-3 text-center min-w-[90px] hover:bg-[#f47521]/20 transition-colors flex flex-col justify-center"
        >
          <p className="text-xl font-black text-[#f47521]">CR</p>
          <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">Crunchyroll <ExternalLink size={10} /></p>
        </m.a>
      )}

      {/* Loading shimmer */}
      {!ratingsLoaded && (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 text-center min-w-[90px] animate-pulse flex flex-col justify-center">
          <div className="h-5 w-12 bg-dark-600 rounded mx-auto mb-1" />
          <div className="h-2 w-8 bg-dark-600 rounded mx-auto" />
        </div>
      )}
    </div>
  );
}
