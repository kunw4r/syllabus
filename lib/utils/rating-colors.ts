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
export function getRatingHex(val: number): string {
  if (val <= 2) return '#a855f7';   // purple (brighter)
  if (val <= 4) return '#f43f5e';   // rose-red (neon)
  if (val <= 5.5) return '#fb923c'; // orange (neon)
  if (val <= 6.5) return '#facc15'; // yellow (bright)
  if (val <= 7.5) return '#a3e635'; // lime (neon)
  if (val <= 8.5) return '#4ade80'; // green (neon bright)
  if (val < 9) return '#22d3ee';    // cyan (bright)
  if (val < 10) return '#38bdf8';   // sky blue (neon)
  return '#007AFF';                  // apple blue — perfect 10
}

// Gradient badge backgrounds — neon vibrant, brighter at higher scores
// Plus liquid glass: use with backdrop-blur + border for frosted effect
export function getRatingBg(val: number): string {
  if (val <= 2) return 'linear-gradient(135deg, #7c3aedee, #a855f7ee)';          // vivid purple
  if (val <= 4) return 'linear-gradient(135deg, #a855f7ee, #f43f5eee)';          // purple → rose
  if (val <= 5.5) return 'linear-gradient(135deg, #ef4444ee, #fb923cee)';        // red → orange
  if (val <= 6.5) return 'linear-gradient(135deg, #f97316ee, #facc15ee)';        // orange → yellow
  if (val <= 7.5) return 'linear-gradient(135deg, #eab308ee, #a3e635ee)';        // yellow → lime (neon)
  if (val <= 8.5) return 'linear-gradient(135deg, #84cc16f0, #4ade80f0)';        // lime → green (bright)
  if (val < 9) return 'linear-gradient(135deg, #34d399f2, #22d3eef2)';           // emerald → cyan (neon)
  if (val < 10) return 'linear-gradient(135deg, #22d3eef5, #38bdf8f5)';          // cyan → sky (neon glow)
  return '#007AFFee';                                                              // solid apple blue
}

// Tailwind gradient classes for progress bars / slider tracks
export function getRatingGradient(val: number): string {
  if (val <= 2) return 'from-purple-600 to-purple-400';
  if (val <= 4) return 'from-purple-500 to-rose-500';
  if (val <= 5.5) return 'from-red-500 to-orange-400';
  if (val <= 6.5) return 'from-orange-500 to-yellow-400';
  if (val <= 7.5) return 'from-yellow-400 to-lime-400';
  if (val <= 8.5) return 'from-lime-400 to-green-400';
  if (val < 9) return 'from-emerald-400 to-cyan-400';
  if (val < 10) return 'from-cyan-400 to-sky-400';
  return 'from-blue-500 to-blue-400';
}
