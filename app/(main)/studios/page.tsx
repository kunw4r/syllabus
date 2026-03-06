'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { STUDIOS } from '@/lib/constants';
import { STUDIO_LOGOS } from '@/components/ui/StudioLogos';

// ── Animation variants ──

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ── Studio Card ──

function StudioCard({ studio }: { studio: (typeof STUDIOS)[number] }) {
  const Logo = STUDIO_LOGOS[studio.slug];
  const prefersReducedMotion = useReducedMotion();

  // Brand-tinted card surface
  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(145deg, ${studio.tint}, #0b0f15)`,
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  const card = (
    <Link
      href={`/studios/${studio.slug}`}
      className="group relative flex flex-col items-center justify-between rounded-[22px] overflow-hidden h-[150px] p-[18px]"
      style={cardStyle}
    >
      {/* Top highlight film */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px]"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)' }}
      />

      {/* Hover brightening — subtle tint shift + border glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(145deg, ${studio.tint}80, transparent)`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
        }}
      />

      {/* Logo — centred in top 2/3 */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        {Logo ? (
          <div className="opacity-75 group-hover:opacity-95 transition-all duration-[240ms] ease-out group-hover:scale-[1.04]">
            <Logo size={56} />
          </div>
        ) : (
          <span className="text-2xl opacity-50">{studio.icon || studio.name[0]}</span>
        )}
      </div>

      {/* Label — bottom */}
      <p className="relative text-[0.95rem] font-semibold text-white/55 group-hover:text-white/85 text-center leading-tight tracking-[-0.02em] transition-colors duration-[240ms] mt-auto pt-1">
        {studio.name}
      </p>
    </Link>
  );

  if (prefersReducedMotion) {
    return <div>{card}</div>;
  }

  return (
    <m.div
      variants={cardVariants}
      whileHover={{
        y: -3,
        scale: 1.01,
        boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        transition: { duration: 0.24, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.98 }}
      className="rounded-[22px]"
    >
      {card}
    </m.div>
  );
}

// ── Page ──

export default function StudiosPage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="min-w-0 max-w-[1440px] mx-auto"
      style={{
        paddingLeft: 'clamp(16px, 4vw, 48px)',
        paddingRight: 'clamp(16px, 4vw, 48px)',
        paddingTop: 40,
        paddingBottom: 60,
      }}
    >
      {/* Cinematic ambient lighting */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 10% 10%, rgba(60,80,160,0.06), transparent 35%),
            radial-gradient(circle at 90% 5%, rgba(180,130,60,0.04), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(40,60,120,0.04), transparent 40%)
          `,
        }}
      />

      {/* Header */}
      <div className="mb-9">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] text-white mb-2">
          Studios
        </h1>
        <p className="text-[0.9rem] text-white/35 font-normal max-w-lg leading-relaxed">
          Browse movies and shows by studio, production company, or film industry.
        </p>
      </div>

      {/* Grid */}
      {prefersReducedMotion ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {STUDIOS.map((studio) => (
            <StudioCard key={studio.slug} studio={studio} />
          ))}
        </div>
      ) : (
        <m.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
        >
          {STUDIOS.map((studio) => (
            <StudioCard key={studio.slug} studio={studio} />
          ))}
        </m.div>
      )}
    </div>
  );
}
