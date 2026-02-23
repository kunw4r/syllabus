'use client';

import { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';

interface HeroBackdropProps {
  backdropPath?: string;
  trailerKey?: string;
}

export default function HeroBackdrop({ backdropPath, trailerKey }: HeroBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [0.3, 0]);

  if (!backdropPath && !trailerKey) return null;

  return (
    <div ref={ref} className="absolute top-0 left-0 w-full h-[50vh] min-h-[400px] -z-10 overflow-hidden">
      <m.div style={{ y }} className="absolute inset-0 w-full h-[120%]">
        {trailerKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&modestbranding=1&rel=0`}
            title="Background trailer"
            allow="autoplay; encrypted-media"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
            onError={(e) => {
              // Hide iframe on error, backdrop will show
              (e.target as HTMLIFrameElement).style.display = 'none';
            }}
          />
        ) : null}
        {backdropPath && (
          <m.img
            src={`${TMDB_BACKDROP}${backdropPath}`}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: trailerKey ? undefined : opacity }}
            loading="eager"
          />
        )}
        {!trailerKey && backdropPath && (
          <m.div className="absolute inset-0" style={{ opacity }} />
        )}
      </m.div>

      {/* Multi-layer gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-900/60 to-dark-900" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900/70 via-transparent to-transparent" />
    </div>
  );
}
