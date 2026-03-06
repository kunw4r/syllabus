/**
 * Dynamic rating colors — smooth gradient scale inspired by rating heatmaps.
 * Scale: purple (garbage) → red → orange → yellow → lime → green → dark green → blue
 *
 * IMPORTANT: Use getRatingHex() with inline styles, NOT Tailwind classes.
 */

// Returns a single representative color for text/icons
export function getRatingHex(val: number): string {
  if (val <= 2) return '#9333ea';   // purple — garbage
  if (val <= 4) return '#ef4444';   // red — bad
  if (val <= 5.5) return '#f97316'; // orange — meh
  if (val <= 6.5) return '#eab308'; // yellow — decent
  if (val <= 7.5) return '#84cc16'; // lime — good
  if (val <= 8.5) return '#22c55e'; // green — great
  if (val <= 9.2) return '#15803d'; // dark green — awesome
  return '#3b82f6';                  // blue — absolute cinema
}

// Returns a CSS linear-gradient string for badge backgrounds
export function getRatingBg(val: number): string {
  if (val <= 2) return 'linear-gradient(135deg, #7e22ce, #9333ea)';
  if (val <= 4) return 'linear-gradient(135deg, #dc2626, #ef4444)';
  if (val <= 5.5) return 'linear-gradient(135deg, #ea580c, #f97316)';
  if (val <= 6.5) return 'linear-gradient(135deg, #ca8a04, #eab308)';
  if (val <= 7.5) return 'linear-gradient(135deg, #65a30d, #84cc16)';
  if (val <= 8.5) return 'linear-gradient(135deg, #16a34a, #22c55e)';
  if (val <= 9.2) return 'linear-gradient(135deg, #15803d, #166534)';
  return 'linear-gradient(135deg, #2563eb, #3b82f6)';
}

// Tailwind gradient classes for progress bars / slider tracks
export function getRatingGradient(val: number): string {
  if (val <= 2) return 'from-purple-700 to-purple-500';
  if (val <= 4) return 'from-red-600 to-red-500';
  if (val <= 5.5) return 'from-orange-600 to-orange-400';
  if (val <= 6.5) return 'from-yellow-600 to-yellow-400';
  if (val <= 7.5) return 'from-lime-600 to-lime-400';
  if (val <= 8.5) return 'from-green-600 to-green-500';
  if (val <= 9.2) return 'from-green-800 to-green-700';
  return 'from-blue-600 to-blue-500';
}
