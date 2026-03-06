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
  if (val < 10) return '#60a5fa';   // blue (almost there)
  return '#007AFF';                  // apple blue — perfect 10
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
  if (val <= 9.6) return 'linear-gradient(135deg, #38bdf8f6, #60a5faf6)';        // sky → blue (intensifying)
  if (val < 10) return 'linear-gradient(135deg, #60a5faf8, #3b82f6f8)';          // blue → rich blue (almost there)
  return '#007AFFf0';                                                              // solid apple blue — perfect 10
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
