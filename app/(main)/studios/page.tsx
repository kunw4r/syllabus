'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { STUDIOS } from '@/lib/constants';
import { STUDIO_LOGOS } from '@/components/ui/StudioLogos';

// ── Animation variants ──

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ── Studio Card ──

function StudioCard({ studio }: { studio: (typeof STUDIOS)[number] }) {
  const Logo = STUDIO_LOGOS[studio.slug];
  const prefersReducedMotion = useReducedMotion();

  const card = (
    <Link
      href={`/studios/${studio.slug}`}
      className="group relative flex flex-col items-center rounded-[20px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Hover glow border — driven by inline custom property */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 0 1px ${studio.glowColor}50, 0 0 20px 2px ${studio.glowColor}15`,
        }}
      />

      {/* Subtle gradient underlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${studio.glowColor}10 0%, transparent 70%)`,
        }}
      />

      {/* Logo area — top 2/3 */}
      <div className="flex items-center justify-center w-full aspect-[4/3] p-6">
        {Logo ? (
          <Logo size={64} className="opacity-80 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
        ) : (
          <span className="text-4xl opacity-60 group-hover:opacity-90 transition-opacity">{studio.icon}</span>
        )}
      </div>

      {/* Label — bottom 1/3 */}
      <div className="w-full px-3 pb-4 pt-0">
        <p className="text-[13px] font-semibold text-white/70 group-hover:text-white text-center leading-snug tracking-tight transition-colors duration-300">
          {studio.name}
        </p>
      </div>
    </Link>
  );

  if (prefersReducedMotion) {
    return <div>{card}</div>;
  }

  return (
    <m.div
      variants={cardVariants}
      whileHover={{ scale: 1.05, transition: { duration: 0.25, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
    >
      {card}
    </m.div>
  );
}

// ── Page ──

export default function StudiosPage() {
  const prefersReducedMotion = useReducedMotion();

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
      {STUDIOS.map((studio) => (
        <StudioCard key={studio.slug} studio={studio} />
      ))}
    </div>
  );

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Studios</h1>
        <p className="text-white/35 text-sm max-w-lg">
          Browse movies and shows by studio, production company, or film industry
        </p>
      </div>

      {/* Grid — staggered entrance */}
      {prefersReducedMotion ? (
        grid
      ) : (
        <m.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5"
        >
          {STUDIOS.map((studio) => (
            <StudioCard key={studio.slug} studio={studio} />
          ))}
        </m.div>
      )}
    </div>
  );
}
