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
  // 8.5+ smooth transition: green → cyan → sky → apple blue
  if (val <= 8.8) return '#34d399'; // emerald-green (gradient begins)
  if (val <= 9.2) return '#22d3ee'; // cyan (own color emerges)
  if (val <= 9.6) return '#38bdf8'; // sky blue (neon)
  if (val < 10) return '#2563eb';   // electric blue
  return '#00e5ff';                  // tron cyan — electric neon
}

// Gradient badge backgrounds — neon vibrant, brighter at higher scores
// 8.5+ introduces visible linear gradients that evolve into solid neon
export function getRatingBg(val: number): string {
  if (val <= 2) return 'linear-gradient(135deg, #7c3aedee, #a855f7ee)';          // vivid purple
  if (val <= 4) return 'linear-gradient(135deg, #a855f7ee, #f43f5eee)';          // purple → rose
  if (val <= 5.5) return 'linear-gradient(135deg, #ef4444ee, #fb923cee)';        // red → orange
  if (val <= 6.5) return 'linear-gradient(135deg, #f97316ee, #facc15ee)';        // orange → yellow
  if (val <= 7.5) return 'linear-gradient(135deg, #eab308ee, #a3e635ee)';        // yellow → lime
  if (val <= 8.5) return 'linear-gradient(135deg, #a3e635f0, #4ade80f0)';        // neon lime → neon green (bright!)
  // 8.5+ gradients introduce new colors, becoming more their own as score rises
  if (val <= 8.8) return 'linear-gradient(135deg, #4ade80f2, #34d399f2)';        // neon green → emerald (hint of shift)
  if (val <= 9.0) return 'linear-gradient(135deg, #34d399f4, #22d3eef4)';        // emerald → cyan (gradient visible)
  if (val <= 9.3) return 'linear-gradient(135deg, #22d3eef5, #38bdf8f5)';        // cyan → sky (neon glow)
  if (val <= 9.6) return 'linear-gradient(135deg, #38bdf8f6, #2563ebf6)';        // sky → electric blue
  if (val < 10) return 'linear-gradient(135deg, #2563ebf8, #1d4ed8f8)';          // electric blue → deep blue
  return 'linear-gradient(135deg, #00e5ff, #00aaff, #0066ff)';                    // tron blue — electric neon glow
}

// Optional glow shadow for high scores — use with style={{ boxShadow }}
export function getRatingGlow(val: number): string | undefined {
  if (val >= 10) return '0 0 16px #00e5ffaa, 0 0 6px #00e5ffcc, inset 0 0 8px #00e5ff33';
  if (val >= 9.3) return '0 0 10px #38bdf866, 0 0 4px #38bdf888';
  if (val >= 8.5) return '0 0 6px #4ade8033';
  return undefined;
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
