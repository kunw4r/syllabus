'use client';

import Image from 'next/image';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { STUDIO_LOGOS } from '@/components/ui/StudioLogos';

// ── Studio tiers ──

const TIER_1 = [
  {
    slug: 'disney',
    name: 'Disney',
    image: '/studios/disney-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(30,60,140,0.5) 0%, rgba(15,25,60,0.8) 50%, rgba(8,12,30,0.95) 100%)',
    border: 'rgba(80,130,220,0.25)',
    glow: '0 0 40px rgba(40,80,180,0.15), 0 0 80px rgba(30,60,140,0.08)',
    accent: 'rgba(60,120,220,0.12)',
    streakColor: 'rgba(100,160,255,0.06)',
  },
  {
    slug: 'pixar',
    name: 'Pixar',
    image: '/studios/pixar-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,60,80,0.5) 0%, rgba(12,35,50,0.8) 50%, rgba(8,15,25,0.95) 100%)',
    border: 'rgba(60,160,180,0.22)',
    glow: '0 0 40px rgba(30,120,150,0.12), 0 0 80px rgba(20,80,120,0.06)',
    accent: 'rgba(40,150,170,0.10)',
    streakColor: 'rgba(80,200,220,0.05)',
  },
  {
    slug: 'marvel',
    name: 'MARVEL STUDIOS',
    image: '/studios/marvel-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 30% 50%, rgba(120,15,25,0.55) 0%, rgba(60,10,18,0.8) 50%, rgba(20,6,10,0.95) 100%)',
    border: 'rgba(200,50,60,0.22)',
    glow: '0 0 40px rgba(180,30,40,0.15), 0 0 80px rgba(140,20,30,0.08)',
    accent: 'rgba(200,40,50,0.10)',
    streakColor: 'rgba(255,80,80,0.04)',
  },
  {
    slug: 'dc',
    name: 'DC Studios',
    image: '/studios/dc-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 60% 40%, rgba(20,40,90,0.5) 0%, rgba(12,22,55,0.8) 50%, rgba(8,12,30,0.95) 100%)',
    border: 'rgba(60,100,200,0.20)',
    glow: '0 0 40px rgba(40,80,180,0.12), 0 0 80px rgba(30,60,140,0.06)',
    accent: 'rgba(50,100,200,0.10)',
    streakColor: 'rgba(80,140,255,0.05)',
  },
];

const TIER_2 = [
  {
    slug: 'dreamworks',
    name: 'DreamWorks',
    image: '/studios/dreamworks-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,50,100,0.5) 0%, rgba(12,30,60,0.8) 50%, rgba(8,14,30,0.95) 100%)',
    border: 'rgba(70,120,200,0.20)',
    glow: '0 0 40px rgba(40,80,160,0.12), 0 0 80px rgba(30,60,130,0.06)',
    accent: 'rgba(50,100,180,0.10)',
    streakColor: 'rgba(80,140,240,0.05)',
  },
  {
    slug: 'sony',
    name: 'Sony Pictures',
    image: '/studios/sony-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,45,90,0.5) 0%, rgba(12,25,55,0.8) 50%, rgba(8,12,28,0.95) 100%)',
    border: 'rgba(60,110,200,0.20)',
    glow: '0 0 40px rgba(35,75,170,0.12), 0 0 80px rgba(25,55,130,0.06)',
    accent: 'rgba(45,90,190,0.10)',
    streakColor: 'rgba(70,130,240,0.05)',
  },
  {
    slug: 'universal',
    name: 'Universal',
    image: '/studios/universal-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,50,100,0.5) 0%, rgba(10,25,55,0.8) 50%, rgba(6,12,28,0.95) 100%)',
    border: 'rgba(60,120,210,0.20)',
    glow: '0 0 40px rgba(35,80,180,0.12), 0 0 80px rgba(25,60,140,0.06)',
    accent: 'rgba(45,100,200,0.10)',
    streakColor: 'rgba(70,140,250,0.05)',
  },
  {
    slug: 'warner-bros',
    name: 'Warner Bros.',
    image: '/studios/warner-bros-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(60,50,20,0.5) 0%, rgba(30,25,12,0.8) 50%, rgba(14,12,8,0.95) 100%)',
    border: 'rgba(180,150,60,0.20)',
    glow: '0 0 40px rgba(140,110,40,0.12), 0 0 80px rgba(100,80,30,0.06)',
    accent: 'rgba(160,130,50,0.10)',
    streakColor: 'rgba(200,170,80,0.05)',
  },
  {
    slug: 'paramount',
    name: 'Paramount',
    image: '/studios/paramount-card.png',
    imagePosition: 'center 58%',
    cropInset: '0%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,40,80,0.5) 0%, rgba(12,22,50,0.8) 50%, rgba(8,12,26,0.95) 100%)',
    border: 'rgba(60,100,180,0.20)',
    glow: '0 0 40px rgba(35,70,150,0.12), 0 0 80px rgba(25,50,120,0.06)',
    accent: 'rgba(45,85,170,0.10)',
    streakColor: 'rgba(70,120,220,0.05)',
  },
  {
    slug: 'lionsgate',
    name: 'Lionsgate',
    image: '/studios/lionsgate-card.png',
    imagePosition: 'center 55%',
    cropInset: '0%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,50,100,0.5) 0%, rgba(10,28,60,0.8) 50%, rgba(6,14,30,0.95) 100%)',
    border: 'rgba(50,110,200,0.20)',
    glow: '0 0 40px rgba(30,80,170,0.12), 0 0 80px rgba(20,55,130,0.06)',
    accent: 'rgba(40,90,180,0.10)',
    streakColor: 'rgba(60,130,230,0.05)',
  },
  {
    slug: 'netflix',
    name: 'Netflix',
    image: '/studios/netflix-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(120,20,20,0.5) 0%, rgba(60,10,10,0.8) 50%, rgba(20,6,6,0.95) 100%)',
    border: 'rgba(200,50,50,0.22)',
    glow: '0 0 40px rgba(180,30,30,0.15), 0 0 80px rgba(140,20,20,0.08)',
    accent: 'rgba(200,40,40,0.10)',
    streakColor: 'rgba(255,80,80,0.05)',
  },
  {
    slug: 'lucasfilm',
    name: 'Lucasfilm',
    image: '/studios/lucasfilm-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(70,55,20,0.5) 0%, rgba(35,28,10,0.8) 50%, rgba(14,12,6,0.95) 100%)',
    border: 'rgba(200,160,60,0.20)',
    glow: '0 0 40px rgba(160,120,40,0.12), 0 0 80px rgba(120,90,30,0.06)',
    accent: 'rgba(180,140,50,0.10)',
    streakColor: 'rgba(220,180,80,0.05)',
  },
  {
    slug: 'illumination',
    name: 'Illumination',
    image: '/studios/illumination-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(90,80,20,0.5) 0%, rgba(45,40,10,0.8) 50%, rgba(18,16,6,0.95) 100%)',
    border: 'rgba(220,200,50,0.20)',
    glow: '0 0 40px rgba(180,160,30,0.12), 0 0 80px rgba(140,120,20,0.06)',
    accent: 'rgba(200,180,40,0.10)',
    streakColor: 'rgba(240,220,60,0.05)',
  },
];

const TIER_3 = [
  {
    slug: 'a24',
    name: 'A24',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(40,40,40,0.5) 0%, rgba(20,20,20,0.8) 50%, rgba(10,10,10,0.95) 100%)',
    border: 'rgba(160,160,160,0.18)',
    glow: '0 0 40px rgba(100,100,100,0.08), 0 0 80px rgba(80,80,80,0.04)',
    accent: 'rgba(140,140,140,0.08)',
    streakColor: 'rgba(180,180,180,0.04)',
  },
  {
    slug: 'blumhouse',
    name: 'Blumhouse',
    image: '/studios/blumhouse-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(100,15,15,0.5) 0%, rgba(50,8,8,0.8) 50%, rgba(18,5,5,0.95) 100%)',
    border: 'rgba(180,40,40,0.22)',
    glow: '0 0 40px rgba(150,25,25,0.15), 0 0 80px rgba(120,15,15,0.08)',
    accent: 'rgba(170,30,30,0.10)',
    streakColor: 'rgba(220,60,60,0.05)',
  },
  {
    slug: 'mgm',
    name: 'Metro-Goldwyn-Mayer',
    image: '/studios/mgm-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(80,60,20,0.5) 0%, rgba(40,30,10,0.8) 50%, rgba(16,12,6,0.95) 100%)',
    border: 'rgba(200,160,60,0.22)',
    glow: '0 0 40px rgba(160,120,40,0.12), 0 0 80px rgba(120,90,30,0.06)',
    accent: 'rgba(180,140,50,0.10)',
    streakColor: 'rgba(220,180,80,0.05)',
  },
  {
    slug: '20th-century',
    name: '20th Century Studios',
    image: '/studios/20th-century-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(80,60,20,0.5) 0%, rgba(40,28,10,0.8) 50%, rgba(16,12,6,0.95) 100%)',
    border: 'rgba(200,150,50,0.22)',
    glow: '0 0 40px rgba(160,110,30,0.12), 0 0 80px rgba(120,80,20,0.06)',
    accent: 'rgba(180,130,40,0.10)',
    streakColor: 'rgba(220,170,60,0.05)',
  },
  {
    slug: 'columbia',
    name: 'Columbia Pictures',
    image: '/studios/columbia-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(60,50,30,0.5) 0%, rgba(30,25,15,0.8) 50%, rgba(14,12,8,0.95) 100%)',
    border: 'rgba(180,150,80,0.20)',
    glow: '0 0 40px rgba(140,110,50,0.12), 0 0 80px rgba(100,80,30,0.06)',
    accent: 'rgba(160,130,60,0.10)',
    streakColor: 'rgba(200,170,90,0.05)',
  },
  {
    slug: 'legendary',
    name: 'Legendary',
    image: '/studios/legendary-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(80,50,15,0.5) 0%, rgba(40,25,8,0.8) 50%, rgba(16,10,4,0.95) 100%)',
    border: 'rgba(200,140,50,0.22)',
    glow: '0 0 40px rgba(160,100,30,0.12), 0 0 80px rgba(120,70,20,0.06)',
    accent: 'rgba(180,120,40,0.10)',
    streakColor: 'rgba(220,150,50,0.05)',
  },
  {
    slug: 'skydance',
    name: 'Skydance',
    image: '/studios/skydance-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(60,50,30,0.5) 0%, rgba(30,25,15,0.8) 50%, rgba(14,12,8,0.95) 100%)',
    border: 'rgba(180,140,60,0.20)',
    glow: '0 0 40px rgba(140,100,40,0.12), 0 0 80px rgba(100,70,20,0.06)',
    accent: 'rgba(160,120,50,0.10)',
    streakColor: 'rgba(200,160,70,0.05)',
  },
  {
    slug: 'ghibli',
    name: 'Studio Ghibli',
    image: '/studios/ghibli-card.png',
    cropBottom: '25%',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(20,40,80,0.5) 0%, rgba(10,22,50,0.8) 50%, rgba(6,12,28,0.95) 100%)',
    border: 'rgba(60,100,180,0.20)',
    glow: '0 0 40px rgba(30,70,150,0.12), 0 0 80px rgba(20,50,120,0.06)',
    accent: 'rgba(40,85,170,0.10)',
    streakColor: 'rgba(60,120,220,0.05)',
  },
  {
    slug: 'apple-studios',
    name: 'Apple Studios',
    image: '/studios/apple-studios-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(50,50,50,0.5) 0%, rgba(25,25,25,0.8) 50%, rgba(10,10,10,0.95) 100%)',
    border: 'rgba(170,170,170,0.18)',
    glow: '0 0 40px rgba(120,120,120,0.08), 0 0 80px rgba(90,90,90,0.04)',
    accent: 'rgba(150,150,150,0.08)',
    streakColor: 'rgba(200,200,200,0.04)',
  },
  {
    slug: 'toho',
    name: 'Toho',
    image: '/studios/toho-card.png',
    imagePosition: 'center center',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(100,20,20,0.5) 0%, rgba(50,10,10,0.8) 50%, rgba(20,6,6,0.95) 100%)',
    border: 'rgba(200,60,60,0.20)',
    glow: '0 0 40px rgba(160,40,40,0.12), 0 0 80px rgba(120,20,20,0.06)',
    accent: 'rgba(180,50,50,0.10)',
    streakColor: 'rgba(220,80,80,0.05)',
  },
];

type StudioEntry = (typeof TIER_1)[number] | (typeof TIER_2)[number] | (typeof TIER_3)[number];

// ── Tier aspect ratios ──

const TIER_ASPECT = {
  1: '2.4 / 1',
  2: '2.4 / 1',
  3: '2.4 / 1',
} as const;

// ── Animation variants ──

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ── Background particles ──

function CinematicBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 8% 8%, rgba(50,70,160,0.07) 0%, transparent 40%),
            radial-gradient(ellipse at 92% 6%, rgba(180,140,60,0.04) 0%, transparent 35%),
            radial-gradient(ellipse at 85% 85%, rgba(40,60,140,0.05) 0%, transparent 35%),
            radial-gradient(ellipse at 50% 100%, rgba(30,50,100,0.04) 0%, transparent 40%)
          `,
        }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 40 }).map((_, i) => {
          const x = ((i * 73 + 17) % 100);
          const y = ((i * 47 + 31) % 100);
          const r = 0.3 + (i % 5) * 0.15;
          const opacity = 0.15 + (i % 4) * 0.1;
          return (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="white" opacity={opacity} />
          );
        })}
      </svg>
    </div>
  );
}

// ── Section Label ──

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <m.div variants={headerVariants}>
      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/20 font-medium mb-3 ml-0.5">
        {children}
      </p>
    </m.div>
  );
}

// ── Divider ──

function SectionDivider() {
  return (
    <div
      className="my-8"
      style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent)',
      }}
    />
  );
}

// ── Studio Card ──

function StudioCard({
  studio,
  tier,
}: {
  studio: StudioEntry;
  tier: 1 | 2 | 3;
}) {
  const Logo = STUDIO_LOGOS[studio.slug];
  const prefersReducedMotion = useReducedMotion();
  const hasImage = 'image' in studio && (studio as any).image;
  const imageUrl = hasImage ? (studio as any).image as string : null;
  const logoSize = tier === 1 ? 80 : tier === 2 ? 64 : 52;

  const card = (
    <Link
      href={`/studios/${studio.slug}`}
      className="group relative flex flex-col items-center justify-center rounded-2xl overflow-hidden"
      style={{
        aspectRatio: TIER_ASPECT[tier],
        background: hasImage ? '#080c18' : studio.gradient,
        border: `1px solid ${hasImage ? 'rgba(255,255,255,0.06)' : studio.border}`,
        boxShadow: studio.glow,
      }}
    >
      {/* Image background */}
      {hasImage && (() => {
        const ci = ('cropInset' in studio && studio.cropInset) || '15%';
        const cb = ('cropBottom' in studio && studio.cropBottom) || ci;
        return (
          <div
            className="absolute group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            style={{ top: `-${ci}`, right: `-${ci}`, bottom: `-${cb}`, left: `-${ci}` }}
          >
            <Image
              src={imageUrl!}
              alt={studio.name}
              fill
              className="object-cover"
              style={{ objectPosition: ('imagePosition' in studio ? (studio as any).imagePosition : null) || 'center center' }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
              priority={tier === 1}
            />
          </div>
        );
      })()}

      {/* Non-image cards: light streaks */}
      {!hasImage && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                linear-gradient(135deg, transparent 20%, ${studio.streakColor} 40%, transparent 60%),
                linear-gradient(225deg, transparent 30%, ${studio.streakColor} 50%, transparent 70%)
              `,
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${studio.border}, transparent)` }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${studio.accent}, transparent 70%)`,
            }}
          />
        </>
      )}

      {/* Hover overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: hasImage
            ? 'rgba(255,255,255,0.03)'
            : `radial-gradient(ellipse at 50% 40%, ${studio.accent}, transparent 70%)`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      />

      {/* Hover light sweep */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)',
        }}
      />

      {/* Logo (non-image cards) */}
      {!hasImage && (
        <>
          <div className="relative flex items-center justify-center flex-1 w-full">
            {Logo ? (
              <div className="opacity-80 group-hover:opacity-100 transition-all duration-[280ms] ease-out group-hover:scale-[1.03]">
                <Logo size={logoSize} />
              </div>
            ) : (
              <span className="text-3xl font-bold opacity-50">{studio.name[0]}</span>
            )}
          </div>
          <p className="relative text-[0.8rem] font-medium text-white/50 group-hover:text-white/75 text-center tracking-wide transition-colors duration-[280ms] pb-3">
            {studio.name}
          </p>
        </>
      )}
    </Link>
  );

  if (prefersReducedMotion) {
    return <div>{card}</div>;
  }

  return (
    <m.div
      variants={cardVariants}
      whileHover={{
        y: -4,
        scale: 1.012,
        transition: { duration: 0.28, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.99 }}
      className="rounded-2xl"
      style={{ willChange: 'transform' }}
    >
      {card}
    </m.div>
  );
}

// ── Page ──

export default function StudiosPage() {
  const prefersReducedMotion = useReducedMotion();

  const content = (
    <>
      {/* Header */}
      {prefersReducedMotion ? (
        <div className="mb-8">
          <h1 className="text-[2.4rem] sm:text-[2.8rem] font-extrabold tracking-[-0.03em] text-white leading-none mb-3">
            Studios
          </h1>
          <p className="text-[0.92rem] text-white/30 font-normal max-w-xl leading-relaxed">
            Browse movies and shows by studio, production company, or film industry.
          </p>
        </div>
      ) : (
        <m.div variants={headerVariants} className="mb-8">
          <h1 className="text-[2.4rem] sm:text-[2.8rem] font-extrabold tracking-[-0.03em] text-white leading-none mb-3">
            Studios
          </h1>
          <p className="text-[0.92rem] text-white/30 font-normal max-w-xl leading-relaxed">
            Browse movies and shows by studio, production company, or film industry.
          </p>
        </m.div>
      )}

      {/* Divider */}
      <div
        className="mb-10"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)',
        }}
      />

      {/* Tier 1: Iconic Studios */}
      <SectionLabel>Iconic Studios</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {TIER_1.map((s) => (
          <StudioCard key={s.slug} studio={s} tier={1} />
        ))}
      </div>

      <SectionDivider />

      {/* Tier 2: Major Studios */}
      <SectionLabel>Major Studios</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {TIER_2.map((s) => (
          <StudioCard key={s.slug} studio={s} tier={2} />
        ))}
      </div>

      <SectionDivider />

      {/* Tier 3: Studios & Independents */}
      <SectionLabel>Studios &amp; Independents</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {TIER_3.map((s) => (
          <StudioCard key={s.slug} studio={s} tier={3} />
        ))}
      </div>
    </>
  );

  return (
    <div
      className="min-w-0 max-w-[1280px] mx-auto"
      style={{
        paddingLeft: 'clamp(20px, 5vw, 64px)',
        paddingRight: 'clamp(20px, 5vw, 64px)',
        paddingTop: 48,
        paddingBottom: 80,
      }}
    >
      <CinematicBackground />

      {prefersReducedMotion ? (
        content
      ) : (
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {content}
        </m.div>
      )}
    </div>
  );
}
