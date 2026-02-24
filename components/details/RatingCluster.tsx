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
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
  }),
};

// Liquid glass pill — Apple-style frosted appearance
function GlassPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-xl border shrink-0"
      style={{
        background: `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`,
        borderColor: `${color}40`,
        color: color,
        boxShadow: `0 1px 8px ${color}15, inset 0 1px 0 ${color}20`,
      }}
    >
      {label}
    </span>
  );
}

// Uniform rating card — glass pill on the left, score on the right
function RatingCard({
  index,
  label,
  color,
  score,
  subtitle,
  href,
}: {
  index: number;
  label: string;
  color: string;
  score: string | number;
  subtitle?: string;
  href?: string;
}) {
  const Tag = href ? m.a : m.div;
  const linkProps = href
    ? { href, target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <Tag
      custom={index}
      variants={ratingVariants}
      initial="hidden"
      animate="visible"
      {...linkProps}
      className={`
        flex items-center gap-3 rounded-2xl px-4 py-3.5
        bg-white/[0.04] backdrop-blur-md
        border border-white/[0.08]
        ${href ? 'cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.14]' : ''}
        transition-all duration-200
      `}
    >
      <GlassPill label={label} color={color} />
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black leading-none" style={{ color }}>
          {score}
        </span>
        {subtitle && (
          <span className="text-[10px] text-white/25">{subtitle}</span>
        )}
      </div>
    </Tag>
  );
}

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
  const label = syllabusScore ? 'Syllabus' : 'TMDB';

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-6">
      {/* Syllabus / TMDB Score */}
      {displayScore && (
        <m.div
          custom={0}
          variants={ratingVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/[0.04] backdrop-blur-md border border-white/[0.08]"
        >
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-xl border shrink-0"
            style={{
              background: 'linear-gradient(135deg, #e9456030 0%, #e9456018 100%)',
              borderColor: '#e9456040',
              color: '#e94560',
              boxShadow: '0 1px 8px #e9456015, inset 0 1px 0 #e9456020',
            }}
          >
            <Star size={11} className="fill-current" />
            {label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black leading-none text-white">{displayScore}</span>
            <span className="text-[10px] text-white/25">/ 10</span>
          </div>
        </m.div>
      )}

      {/* IMDb */}
      {extRatings?.imdb && (
        <RatingCard
          index={1}
          label="IMDb"
          color="#f5c518"
          score={extRatings.imdb.score}
          subtitle={extRatings.imdb.votes ? `${extRatings.imdb.votes}` : undefined}
          href={`https://www.imdb.com/title/${imdbId}/`}
        />
      )}

      {/* Rotten Tomatoes */}
      {extRatings?.rt && (
        <RatingCard
          index={2}
          label="Rotten Tomatoes"
          color="#FA320A"
          score={extRatings.rt.score}
          href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`}
        />
      )}

      {/* MAL (anime only) */}
      {isAnime && malData?.score && (
        <RatingCard
          index={3}
          label="MAL"
          color="#2e51a2"
          score={malData.score}
          subtitle={malData.scored_by ? `${malData.scored_by.toLocaleString()}` : undefined}
          href={malData.url}
        />
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
          className="flex items-center gap-2 rounded-2xl px-4 py-3.5 bg-white/[0.04] backdrop-blur-md border border-white/[0.08] cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200"
        >
          <GlassPill label="Crunchyroll" color="#f47521" />
          <span className="text-[11px] text-white/30 flex items-center gap-1">
            Watch <ExternalLink size={10} />
          </span>
        </m.a>
      )}

      {/* Loading shimmer */}
      {!ratingsLoaded && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] animate-pulse">
          <div className="h-6 w-14 rounded-full bg-white/5" />
          <div className="h-6 w-10 rounded bg-white/5" />
        </div>
      )}
    </div>
  );
}
