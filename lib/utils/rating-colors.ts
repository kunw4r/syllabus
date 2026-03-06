/**
 * Dynamic rating colors — smooth flowing gradient scale.
 * Each tier blends FROM the previous tier's color INTO its own,
 * creating a continuous color flow across the whole scale.
 *
 * Scale: purple → red → orange → yellow → lime → green → dark green → blue
 *
 * IMPORTANT: Use getRatingHex() with inline styles, NOT Tailwind classes.
 */

// Representative color for text/icons — brighter/neon at higher scores
// 8.5+ gets granular gradient transitions for a dynamic top-tier feel
export function getRatingHex(val: number): string {
  if (val <= 2) return '#a855f7';   // purple
  if (val <= 4) return '#f43f5e';   // rose-red
  if (val <= 5.5) return '#fb923c'; // orange
  if (val <= 6.5) return '#facc15'; // yellow
  if (val <= 7.5) return '#a3e635'; // lime
  if (val <= 8.5) return '#4ade80'; // neon green
  // 8.5+ smooth transition: green → cyan → sky → tron
  if (val <= 8.8) return '#34d399'; // emerald-green (gradient begins)
  if (val <= 9.2) return '#22d3ee'; // cyan (own color emerges)
  if (val <= 9.5) return '#38bdf8'; // sky blue (neon)
  if (val <= 9.7) return '#22b8ff'; // bright blue (flowing toward tron)
  if (val < 10) return '#00ccff';   // near-tron cyan (almost there)
  return '#00e5ff';                  // tron cyan — electric neon
}

// Badge background — dark frosted glass for all scores
// The star icon and number text carry the neon color instead
export function getRatingBg(): string {
  return 'rgba(0, 0, 0, 0.45)';
}

// Neon glow around the badge — colored halo on the dark glass
export function getRatingGlow(val: number): string {
  const hex = getRatingHex(val);
  if (val >= 10) return `0 0 16px ${hex}aa, 0 0 5px ${hex}cc`;
  if (val >= 9) return `0 0 12px ${hex}66, 0 0 4px ${hex}88`;
  return `0 0 8px ${hex}33`;
}

// Text glow for the animated rating number — makes high scores look electric
export function getRatingTextGlow(val: number): string | undefined {
  if (val >= 10) return '0 0 20px #00e5ffbb, 0 0 40px #00e5ff55';
  if (val >= 9.3) return '0 0 14px #38bdf888, 0 0 30px #38bdf844';
  if (val >= 8.5) return `0 0 10px ${getRatingHex(val)}66`;
  return undefined;
}

// Track glow for slider fill bar
export function getRatingTrackGlow(val: number): string | undefined {
  if (val >= 10) return '0 0 12px #00e5ff88, 0 0 3px #00e5ffaa';
  if (val >= 9.3) return `0 0 8px ${getRatingHex(val)}55`;
  if (val >= 8.5) return `0 0 5px ${getRatingHex(val)}33`;
  return undefined;
}

// Tailwind gradient classes for progress bars / slider tracks
export function getRatingGradient(val: number): string {
  if (val <= 2) return 'from-purple-600 to-purple-400';
  if (val <= 4) return 'from-purple-500 to-rose-500';
  if (val <= 5.5) return 'from-red-500 to-orange-400';
  if (val <= 6.5) return 'from-orange-500 to-yellow-400';
  if (val <= 7.5) return 'from-yellow-400 to-lime-400';
  if (val <= 8.5) return 'from-lime-400 to-green-400';
  if (val <= 9.0) return 'from-green-400 to-cyan-400';
  if (val <= 9.5) return 'from-cyan-400 to-sky-400';
  if (val < 10) return 'from-sky-400 to-blue-400';
  return 'from-blue-500 to-blue-400';
}
