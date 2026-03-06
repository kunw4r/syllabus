'use client';

import { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

interface HeroBackdropProps {
  backdropPath?: string;
  trailerKey?: string;
}

export default function HeroBackdrop({ backdropPath, trailerKey }: HeroBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 180]);
  const opacity = useTransform(scrollY, [0, 500], [0.45, 0]);

  if (!backdropPath && !trailerKey) return null;

  return (
    <div ref={ref} className="absolute top-0 left-0 w-full h-[70vh] min-h-[500px] max-h-[800px] -z-10 overflow-hidden">
      <m.div style={{ y }} className="absolute inset-0 w-full h-[130%]">
        {trailerKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&modestbranding=1&rel=0`}
            title="Background trailer"
            allow="autoplay; encrypted-media"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
            onError={(e) => {
              (e.target as HTMLIFrameElement).style.display = 'none';
            }}
          />
        ) : null}
        {backdropPath && (
          <m.img
            src={`${TMDB_BACKDROP}${backdropPath}`}
            alt=""
            className="w-full h-full object-cover object-[center_20%]"
            style={{ opacity: trailerKey ? undefined : opacity }}
            loading="eager"
          />
        )}
        {!trailerKey && backdropPath && (
          <m.div className="absolute inset-0" style={{ opacity }} />
        )}
      </m.div>

      {/* Premium multi-layer gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-900" />
      <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900/60 via-transparent to-transparent" />
      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(14,17,23,0.4) 100%)' }} />
    </div>
  );
}
