/**
 * Dynamic rating colors — maps a 0-10 score to a color.
 * Scale: red → orange → yellow → green → blue
 *
 * IMPORTANT: Use getRatingHex() with inline styles, NOT Tailwind classes,
 * because Tailwind purges dynamic fill-* classes.
 */

export function getRatingHex(val: number): string {
  if (val <= 3) return '#ef4444';   // red
  if (val <= 5) return '#f97316';   // orange
  if (val <= 7) return '#eab308';   // yellow
  if (val <= 8.5) return '#22c55e'; // green
  return '#3b82f6';                  // blue
}

export function getRatingGradient(val: number): string {
  if (val <= 3) return 'from-red-500 to-red-600';
  if (val <= 5) return 'from-orange-500 to-orange-400';
  if (val <= 7) return 'from-yellow-500 to-yellow-400';
  if (val <= 8.5) return 'from-green-500 to-green-400';
  return 'from-blue-500 to-blue-400';
}
