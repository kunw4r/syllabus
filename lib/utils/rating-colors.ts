/**
 * Dynamic rating colors — smooth flowing gradient scale.
 * Each tier blends FROM the previous tier's color INTO its own,
 * creating a continuous color flow across the whole scale.
 *
 * Scale: purple → red → orange → yellow → lime → green → dark green → blue
 *
 * IMPORTANT: Use getRatingHex() with inline styles, NOT Tailwind classes.
 */

// Representative color for text/icons
export function getRatingHex(val: number): string {
  if (val <= 2) return '#9333ea';   // purple
  if (val <= 4) return '#ef4444';   // red
  if (val <= 5.5) return '#f97316'; // orange
  if (val <= 6.5) return '#eab308'; // yellow
  if (val <= 7.5) return '#84cc16'; // lime
  if (val <= 8.5) return '#22c55e'; // green
  if (val < 9) return '#15803d';    // dark green
  if (val < 10) return '#0ea5e9';   // sky blue
  return '#007AFF';                  // apple blue — perfect 10
}

// Gradient badge backgrounds — each blends from previous tier color
// Plus liquid glass: use with backdrop-blur + border for frosted effect
export function getRatingBg(val: number): string {
  if (val <= 2) return 'linear-gradient(135deg, #581c87cc, #9333eacc)';          // deep purple → purple
  if (val <= 4) return 'linear-gradient(135deg, #7e22cecc, #ef4444cc)';          // purple → red
  if (val <= 5.5) return 'linear-gradient(135deg, #dc2626cc, #f97316cc)';        // red → orange
  if (val <= 6.5) return 'linear-gradient(135deg, #ea580ccc, #eab308cc)';        // orange → yellow
  if (val <= 7.5) return 'linear-gradient(135deg, #ca8a04cc, #84cc16cc)';        // yellow → lime
  if (val <= 8.5) return 'linear-gradient(135deg, #65a30dcc, #22c55ecc)';        // lime → green
  if (val < 9) return 'linear-gradient(135deg, #16a34acc, #15803dcc)';           // green → dark green
  if (val < 10) return 'linear-gradient(135deg, #15803dcc, #0ea5e9cc)';          // dark green → sky blue
  return '#007AFFdd';                                                              // solid apple blue
}

// Tailwind gradient classes for progress bars / slider tracks
export function getRatingGradient(val: number): string {
  if (val <= 2) return 'from-purple-900 to-purple-500';
  if (val <= 4) return 'from-purple-600 to-red-500';
  if (val <= 5.5) return 'from-red-600 to-orange-400';
  if (val <= 6.5) return 'from-orange-500 to-yellow-400';
  if (val <= 7.5) return 'from-yellow-500 to-lime-400';
  if (val <= 8.5) return 'from-lime-500 to-green-500';
  if (val < 9) return 'from-green-500 to-green-800';
  if (val < 10) return 'from-green-800 to-sky-500';
  return 'from-blue-600 to-blue-500';
}
