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
  if (val <= 2) return '#bf5af2';   // purple (neon)
  if (val <= 4) return '#ff375f';   // rose-red (neon)
  if (val <= 5.5) return '#ff8a2b'; // orange (neon)
  if (val <= 6.5) return '#ffe020'; // yellow (electric)
  if (val <= 7.5) return '#b5ff3a'; // lime (neon)
  if (val <= 8.5) return '#50ff8a'; // neon green (electric)
  // 8.5+ transition: green → emerald → neon cyan (same hue, increasing brightness+glow)
  if (val <= 8.8) return '#3dffc2'; // emerald (neon)
  if (val <= 9.2) return '#30f0ff'; // neon cyan
  if (val <= 9.5) return '#22e8ff'; // neon cyan (slightly brighter)
  if (val <= 9.7) return '#11e0ff'; // neon cyan (brighter)
  if (val < 10) return '#00ddff';   // neon cyan (near peak)
  return '#00e5ff';                  // neon cyan — peak electric
}

// Badge background — dark glass with subtle color tint
// When bright=true (light poster behind), uses more opaque bg for readability
export function getRatingBg(val?: number, bright?: boolean): string {
  if (val == null) return 'rgba(0, 0, 0, 0.6)';
  const hex = getRatingHex(val);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (bright) {
    const mr = Math.round(r * 0.05);
    const mg = Math.round(g * 0.05);
    const mb = Math.round(b * 0.05);
    return `rgba(${mr}, ${mg}, ${mb}, 0.85)`;
  }
  // Mix ~8% of the neon color into a dark base
  const mr = Math.round(r * 0.08);
  const mg = Math.round(g * 0.08);
  const mb = Math.round(b * 0.08);
  return `rgba(${mr}, ${mg}, ${mb}, 0.65)`;
}

// Neon glow around the badge — same cyan, glow intensifies with score
export function getRatingGlow(val: number): string {
  const hex = getRatingHex(val);
  if (val >= 10) return `0 0 26px ${hex}cc, 0 0 10px ${hex}dd, 0 0 2px ${hex}`;
  if (val >= 9.5) return `0 0 22px ${hex}aa, 0 0 8px ${hex}cc`;
  if (val >= 9) return `0 0 18px ${hex}88, 0 0 6px ${hex}aa`;
  return `0 0 14px ${hex}55, 0 0 4px ${hex}77`;
}

// Text glow for the animated rating number — all scores glow, intensifies higher
export function getRatingTextGlow(val: number): string {
  const hex = getRatingHex(val);
  if (val >= 10) return `0 0 20px ${hex}bb, 0 0 40px ${hex}55`;
  if (val >= 9) return `0 0 16px ${hex}99, 0 0 32px ${hex}44`;
  if (val >= 7) return `0 0 12px ${hex}77, 0 0 24px ${hex}33`;
  return `0 0 10px ${hex}55, 0 0 20px ${hex}22`;
}

// Track glow for slider fill bar — all scores glow
export function getRatingTrackGlow(val: number): string {
  const hex = getRatingHex(val);
  if (val >= 10) return `0 0 14px ${hex}99, 0 0 4px ${hex}bb`;
  if (val >= 9) return `0 0 10px ${hex}66, 0 0 3px ${hex}88`;
  return `0 0 8px ${hex}44, 0 0 2px ${hex}66`;
}

// ── User rating (red neon scale) — gets more electric at higher scores ──

export function getUserRatingRed(val: number): string {
  if (val <= 3) return '#cc4444';
  if (val <= 5) return '#e04040';
  if (val <= 7) return '#ef4444';
  if (val <= 8) return '#f43f5e';
  if (val <= 9) return '#ff2d55';
  if (val <= 9.5) return '#ff1a4a';
  return '#ff0044';
}

export function getUserRatingGlow(val: number): string {
  const hex = getUserRatingRed(val);
  if (val >= 9.5) return `0 0 20px ${hex}bb, 0 0 8px ${hex}dd`;
  if (val >= 8.5) return `0 0 16px ${hex}88, 0 0 6px ${hex}aa`;
  if (val >= 7) return `0 0 12px ${hex}55, 0 0 4px ${hex}77`;
  return `0 0 8px ${hex}33`;
}

// Sample an image region's brightness — returns true if light
export function sampleImageBrightness(
  img: HTMLImageElement,
  region: 'top-left' | 'top-right' | 'top' = 'top',
): boolean {
  try {
    const canvas = document.createElement('canvas');
    const size = 30;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    let sx = 0, sy = 0, sw = nw, sh = Math.min(nh * 0.3, nh);
    if (region === 'top-left') { sw = Math.min(nw * 0.35, nw); }
    else if (region === 'top-right') { sx = nw - Math.min(nw * 0.35, nw); sw = nw - sx; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let totalLum = 0;
    const pixels = size * size;
    for (let i = 0; i < data.length; i += 4) {
      totalLum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return totalLum / pixels > 150;
  } catch {
    return false;
  }
}

export function getUserRatingBg(val: number, bright: boolean): string {
  const hex = getUserRatingRed(val);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (bright) {
    return `rgba(${Math.round(r * 0.06)}, ${Math.round(g * 0.04)}, ${Math.round(b * 0.04)}, 0.82)`;
  }
  return `rgba(${Math.round(r * 0.1)}, ${Math.round(g * 0.05)}, ${Math.round(b * 0.05)}, 0.55)`;
}