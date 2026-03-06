/**
 * Dynamic rating colors — maps a 0-10 score to a color.
 * Used for star icons, text, and slider elements.
 *
 * IMPORTANT: Use getRatingHex() with inline styles, NOT Tailwind classes,
 * because Tailwind purges dynamic fill-* classes.
 */

export function getRatingHex(val: number): string {
  if (val <= 3) return '#ef4444';   // red
  if (val <= 5) return '#f59e0b';   // amber
  if (val <= 7) return '#eab308';   // yellow
  if (val <= 9) return '#4ade80';   // green
  return '#34d399';                  // emerald
}

export function getRatingGradient(val: number): string {
  if (val <= 3) return 'from-red-500 to-red-600';
  if (val <= 5) return 'from-orange-500 to-amber-500';
  if (val <= 7) return 'from-yellow-500 to-lime-500';
  if (val <= 9) return 'from-green-400 to-emerald-500';
  return 'from-emerald-400 to-cyan-400';
}
