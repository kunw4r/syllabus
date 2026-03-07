'use client';

import { m, useScroll, useTransform } from 'framer-motion';

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';

interface HeroBackdropProps {
  backdropPath?: string;
  trailerKey?: string;
}

export default function HeroBackdrop({ backdropPath }: HeroBackdropProps) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 1200], [0.5, 0.12]);

  if (!backdropPath) return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <m.img
        src={`${TMDB_BACKDROP}${backdropPath}`}
        alt=""
        className="w-full h-full object-cover"
        style={{ opacity }}
        loading="eager"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-dark-900/40" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-dark-900 to-transparent" />
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(14,17,23,0.6) 100%)' }} />
    </div>
  );
}
