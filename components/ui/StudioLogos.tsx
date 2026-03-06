// Rich, colorful SVG logo icons for each studio.
// Uses gradients, shadows, and detail for a premium look on dark backgrounds.

interface LogoProps {
  size?: number;
  className?: string;
}

const s: React.CSSProperties = { display: 'block' };

// ── Disney — enchanted castle ──
export function DisneyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="disney-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Base */}
      <rect x="12" y="44" width="40" height="6" rx="2" fill="url(#disney-g)" />
      <rect x="16" y="36" width="32" height="8" rx="1" fill="#60a5fa" />
      {/* Towers */}
      <rect x="18" y="24" width="5" height="12" fill="#93c5fd" />
      <rect x="30" y="24" width="5" height="12" fill="#93c5fd" />
      <rect x="41" y="24" width="5" height="12" fill="#93c5fd" />
      {/* Spires */}
      <polygon points="20.5,14 17,24 24,24" fill="#bfdbfe" />
      <polygon points="32.5,8 28,24 37,24" fill="#bfdbfe" />
      <polygon points="43.5,14 40,24 47,24" fill="#bfdbfe" />
      {/* Flags */}
      <line x1="20.5" y1="10" x2="20.5" y2="14" stroke="#fbbf24" strokeWidth="1" />
      <line x1="32.5" y1="4" x2="32.5" y2="8" stroke="#fbbf24" strokeWidth="1" />
      <line x1="43.5" y1="10" x2="43.5" y2="14" stroke="#fbbf24" strokeWidth="1" />
      <polygon points="20.5,10 24,11.5 20.5,13" fill="#fbbf24" />
      <polygon points="32.5,4 36,5.5 32.5,7" fill="#fbbf24" />
      <polygon points="43.5,10 47,11.5 43.5,13" fill="#fbbf24" />
      {/* Door */}
      <rect x="28" y="40" width="8" height="10" rx="4" fill="#1e3a5f" />
      {/* Stars */}
      <circle cx="15" cy="12" r="1" fill="#fde68a" opacity="0.8" />
      <circle cx="50" cy="10" r="0.8" fill="#fde68a" opacity="0.6" />
      <circle cx="10" cy="20" r="0.6" fill="#fde68a" opacity="0.5" />
    </svg>
  );
}

// ── Pixar — Luxo desk lamp ──
export function PixarLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <radialGradient id="pixar-glow" cx="28" cy="20" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Light glow */}
      <circle cx="28" cy="20" r="14" fill="url(#pixar-glow)" />
      {/* Lamp head */}
      <ellipse cx="28" cy="18" rx="8" ry="5" fill="#e5e7eb" />
      <ellipse cx="28" cy="18" rx="6" ry="3.5" fill="#f9fafb" />
      {/* Lamp arm */}
      <line x1="30" y1="22" x2="36" y2="40" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="40" x2="28" y2="48" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
      {/* Joint */}
      <circle cx="36" cy="40" r="2.5" fill="#9ca3af" />
      {/* Base */}
      <ellipse cx="28" cy="50" rx="12" ry="3" fill="#6b7280" />
      <ellipse cx="28" cy="49" rx="10" ry="2.5" fill="#9ca3af" />
      {/* Light beam */}
      <path d="M22 22 L16 34 L40 34 L34 22Z" fill="#fef9c3" opacity="0.15" />
      {/* PIXAR text */}
      <text x="32" y="59" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="2">PIXAR</text>
    </svg>
  );
}

// ── Marvel — classic red banner ──
export function MarvelLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="marvel-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect x="6" y="16" width="52" height="32" rx="4" fill="url(#marvel-g)" />
      <rect x="8" y="18" width="48" height="28" rx="3" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" />
      <text x="32" y="39" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="-0.5">MARVEL</text>
    </svg>
  );
}

// ── DC — blue shield ──
export function DCLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="dc-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="white" />
      <circle cx="32" cy="32" r="19" fill="url(#dc-g)" />
      <text x="32" y="39" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="system-ui" fill="white">DC</text>
    </svg>
  );
}

// ── Warner Bros — gold shield ──
export function WarnerBrosLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="wb-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M32 6C20 6 12 12 12 12v24c0 10 20 18 20 18s20-8 20-18V12S44 6 32 6z" fill="url(#wb-g)" />
      <path d="M32 10C22 10 16 15 16 15v21c0 8 16 14 16 14s16-6 16-14V15S42 10 32 10z" fill="none" stroke="#92400e" strokeWidth="1.5" opacity="0.4" />
      <text x="32" y="34" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui" fill="#451a03" opacity="0.8">WB</text>
    </svg>
  );
}

// ── Searchlight Pictures — twin searchlights ──
export function SearchlightLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="sl-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Left beam */}
      <polygon points="24,38 8,6 20,6" fill="url(#sl-beam)" opacity="0.4" />
      {/* Right beam */}
      <polygon points="40,38 44,6 56,6" fill="url(#sl-beam)" opacity="0.4" />
      {/* Searchlight housings */}
      <rect x="20" y="38" width="8" height="6" rx="2" fill="#d4d4d8" />
      <rect x="36" y="38" width="8" height="6" rx="2" fill="#d4d4d8" />
      {/* Lenses */}
      <ellipse cx="24" cy="38" rx="3" ry="1.5" fill="#fef9c3" />
      <ellipse cx="40" cy="38" rx="3" ry="1.5" fill="#fef9c3" />
      {/* Stands */}
      <line x1="24" y1="44" x2="20" y2="54" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="44" x2="28" y2="54" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="44" x2="36" y2="54" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="44" x2="44" y2="54" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
      {/* Base line */}
      <line x1="14" y1="54" x2="50" y2="54" stroke="#71717a" strokeWidth="1.5" />
    </svg>
  );
}

// ── Amblin — boy on bike with moon (E.T. inspired) ──
export function AmblinLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <radialGradient id="amblin-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>
      {/* Moon */}
      <circle cx="40" cy="18" r="14" fill="url(#amblin-moon)" />
      <circle cx="36" cy="16" r="2" fill="#f59e0b" opacity="0.2" />
      <circle cx="43" cy="20" r="1.5" fill="#f59e0b" opacity="0.15" />
      {/* Bike silhouette */}
      <circle cx="22" cy="48" r="7" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="42" cy="48" r="7" fill="none" stroke="white" strokeWidth="2" />
      {/* Frame */}
      <line x1="22" y1="48" x2="32" y2="40" stroke="white" strokeWidth="2" />
      <line x1="32" y1="40" x2="42" y2="48" stroke="white" strokeWidth="2" />
      <line x1="32" y1="40" x2="28" y2="36" stroke="white" strokeWidth="2" />
      {/* Rider silhouette */}
      <circle cx="28" cy="32" r="4" fill="white" />
      <line x1="28" y1="36" x2="30" y2="40" stroke="white" strokeWidth="2" />
    </svg>
  );
}

// ── Working Title — WT monogram ──
export function WorkingTitleLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <rect x="10" y="10" width="44" height="44" rx="6" fill="none" stroke="white" strokeWidth="2.5" />
      <text x="32" y="30" textAnchor="middle" fontSize="13" fontWeight="300" fontFamily="Georgia, serif" fill="white" letterSpacing="1">WT</text>
      <line x1="18" y1="36" x2="46" y2="36" stroke="white" strokeWidth="0.8" opacity="0.4" />
      <text x="32" y="46" textAnchor="middle" fontSize="5" fontWeight="400" fontFamily="system-ui" fill="white" opacity="0.6" letterSpacing="3">FILMS</text>
    </svg>
  );
}

// ── Universal — spinning globe ──
export function UniversalLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="uni-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="30" r="20" fill="url(#uni-g)" />
      {/* Continents (abstract) */}
      <ellipse cx="28" cy="24" rx="6" ry="5" fill="#22c55e" opacity="0.6" />
      <ellipse cx="38" cy="28" rx="4" ry="6" fill="#22c55e" opacity="0.5" />
      <ellipse cx="24" cy="34" rx="5" ry="3" fill="#22c55e" opacity="0.5" />
      {/* Grid lines */}
      <ellipse cx="32" cy="30" rx="8" ry="20" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="12" y1="30" x2="52" y2="30" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="14" y1="22" x2="50" y2="22" stroke="white" strokeWidth="0.6" opacity="0.2" />
      <line x1="14" y1="38" x2="50" y2="38" stroke="white" strokeWidth="0.6" opacity="0.2" />
      {/* Ring */}
      <ellipse cx="32" cy="30" rx="26" ry="8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" transform="rotate(-20,32,30)" />
      <text x="32" y="58" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="system-ui" fill="white" letterSpacing="3" opacity="0.7">UNIVERSAL</text>
    </svg>
  );
}

// ── Paramount — mountain with stars ──
export function ParamountLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="para-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      {/* Stars ring */}
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i * (360 / 22) - 90) * Math.PI / 180;
        const r = 24;
        const cx = 32 + Math.cos(angle) * r;
        const cy = 24 + Math.sin(angle) * r;
        if (cy > 42 || cy < 2) return null;
        return <circle key={i} cx={cx} cy={cy} r="1.2" fill="#fbbf24" opacity="0.9" />;
      })}
      {/* Mountain */}
      <polygon points="32,12 10,50 54,50" fill="url(#para-g)" />
      <polygon points="32,18 16,48 48,48" fill="#475569" />
      {/* Snow cap */}
      <polygon points="32,12 26,24 38,24" fill="white" opacity="0.9" />
      <polygon points="32,16 28,22 36,22" fill="#cbd5e1" opacity="0.6" />
    </svg>
  );
}

// ── Sony Pictures — lion head (Columbia/Tristar inspired) ──
export function SonyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="sony-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      {/* Torch / rays */}
      <line x1="32" y1="8" x2="32" y2="18" stroke="#fbbf24" strokeWidth="2" />
      <line x1="26" y1="10" x2="29" y2="18" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
      <line x1="38" y1="10" x2="35" y2="18" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
      <line x1="22" y1="14" x2="27" y2="20" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
      <line x1="42" y1="14" x2="37" y2="20" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
      {/* Figure base */}
      <ellipse cx="32" cy="36" rx="14" ry="16" fill="url(#sony-g)" />
      <ellipse cx="32" cy="28" rx="8" ry="8" fill="#d4d4d8" />
      {/* SONY text */}
      <text x="32" y="54" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="2">SONY</text>
      <text x="32" y="61" textAnchor="middle" fontSize="4.5" fontWeight="600" fontFamily="system-ui" fill="white" opacity="0.5" letterSpacing="1">PICTURES</text>
    </svg>
  );
}

// ── Lionsgate — golden lion head ──
export function LionsgateLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="lg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Mane */}
      <circle cx="32" cy="28" r="20" fill="url(#lg-g)" opacity="0.3" />
      {/* Head */}
      <ellipse cx="32" cy="30" rx="12" ry="14" fill="url(#lg-g)" />
      {/* Mane tufts */}
      <circle cx="18" cy="22" r="6" fill="#f59e0b" opacity="0.5" />
      <circle cx="46" cy="22" r="6" fill="#f59e0b" opacity="0.5" />
      <circle cx="16" cy="32" r="5" fill="#f59e0b" opacity="0.4" />
      <circle cx="48" cy="32" r="5" fill="#f59e0b" opacity="0.4" />
      <circle cx="24" cy="14" r="5" fill="#f59e0b" opacity="0.5" />
      <circle cx="40" cy="14" r="5" fill="#f59e0b" opacity="0.5" />
      <circle cx="32" cy="12" r="4" fill="#f59e0b" opacity="0.6" />
      {/* Face */}
      <ellipse cx="32" cy="30" rx="10" ry="12" fill="#d97706" />
      {/* Eyes */}
      <ellipse cx="27" cy="26" rx="2" ry="1.5" fill="#451a03" />
      <ellipse cx="37" cy="26" rx="2" ry="1.5" fill="#451a03" />
      <circle cx="27.5" cy="25.5" r="0.8" fill="white" opacity="0.8" />
      <circle cx="37.5" cy="25.5" r="0.8" fill="white" opacity="0.8" />
      {/* Nose */}
      <ellipse cx="32" cy="32" rx="3" ry="2" fill="#92400e" />
      {/* Mouth */}
      <path d="M29 35 Q32 38 35 35" fill="none" stroke="#92400e" strokeWidth="1.2" />
    </svg>
  );
}

// ── A24 — minimal typography ──
export function A24Logo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <rect x="8" y="14" width="48" height="36" rx="6" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
      <text x="32" y="40" textAnchor="middle" fontSize="24" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="-1">A24</text>
    </svg>
  );
}

// ── Focus Features — prism with rainbow ──
export function FocusFeaturesLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      {/* Input beam */}
      <line x1="4" y1="30" x2="22" y2="30" stroke="white" strokeWidth="2" opacity="0.6" />
      {/* Prism */}
      <polygon points="24,14 42,32 24,50" fill="#d4d4d8" opacity="0.8" />
      <polygon points="26,18 40,32 26,46" fill="#a1a1aa" opacity="0.3" />
      {/* Rainbow beams */}
      <line x1="42" y1="26" x2="60" y2="14" stroke="#ef4444" strokeWidth="2" />
      <line x1="42" y1="28" x2="60" y2="20" stroke="#f97316" strokeWidth="2" />
      <line x1="42" y1="30" x2="60" y2="26" stroke="#eab308" strokeWidth="2" />
      <line x1="42" y1="32" x2="60" y2="32" stroke="#22c55e" strokeWidth="2" />
      <line x1="42" y1="34" x2="60" y2="38" stroke="#3b82f6" strokeWidth="2" />
      <line x1="42" y1="36" x2="60" y2="44" stroke="#8b5cf6" strokeWidth="2" />
      <line x1="42" y1="38" x2="60" y2="50" stroke="#a855f7" strokeWidth="2" />
    </svg>
  );
}

// ── Miramax — film reel ──
export function MiramaxLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="mm-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" fill="url(#mm-g)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#27272a" strokeWidth="2" />
      <circle cx="32" cy="32" r="5" fill="#27272a" />
      <circle cx="32" cy="32" r="3" fill="#71717a" />
      {/* Sprocket holes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45) * Math.PI / 180;
        const cx = 32 + Math.cos(angle) * 13;
        const cy = 32 + Math.sin(angle) * 13;
        return <circle key={i} cx={cx} cy={cy} r="3" fill="#27272a" />;
      })}
    </svg>
  );
}

// ── Skydance — paper plane / jet ──
export function SkydanceLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="sky-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      {/* Paper plane */}
      <polygon points="8,36 56,18 36,38" fill="url(#sky-g)" />
      <polygon points="36,38 56,18 42,50" fill="#bae6fd" opacity="0.7" />
      <polygon points="36,38 32,48 42,50" fill="#7dd3fc" opacity="0.5" />
      {/* Trail */}
      <line x1="8" y1="36" x2="4" y2="42" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="14" y1="38" x2="10" y2="46" stroke="white" strokeWidth="1" opacity="0.2" />
      <line x1="20" y1="38" x2="16" y2="48" stroke="white" strokeWidth="1" opacity="0.15" />
    </svg>
  );
}

// ── DreamWorks — crescent moon fishing ──
export function DreamWorksLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="dw-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Crescent moon */}
      <path d="M42 8a22 22 0 100 44 18 18 0 010-44z" fill="url(#dw-g)" />
      {/* Figure sitting */}
      <circle cx="30" cy="20" r="4" fill="#1e293b" />
      <path d="M28 24 L26 34 L34 34 L32 24Z" fill="#1e293b" />
      {/* Fishing rod */}
      <path d="M34 22 Q44 10 48 16" fill="none" stroke="#1e293b" strokeWidth="1.5" />
      {/* Line */}
      <line x1="48" y1="16" x2="48" y2="40" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
      {/* Clouds */}
      <ellipse cx="12" cy="44" rx="8" ry="3" fill="white" opacity="0.15" />
      <ellipse cx="50" cy="48" rx="10" ry="3" fill="white" opacity="0.1" />
    </svg>
  );
}

// ── Illumination — glowing lightbulb ──
export function IlluminationLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <radialGradient id="ill-glow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ill-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Glow */}
      <circle cx="32" cy="26" r="24" fill="url(#ill-glow)" />
      {/* Bulb */}
      <path d="M32 6a16 16 0 00-10 28.5V40a4 4 0 004 4h12a4 4 0 004-4v-5.5A16 16 0 0032 6z" fill="url(#ill-g)" />
      {/* Filament */}
      <path d="M28 20 Q30 26 32 20 Q34 26 36 20" fill="none" stroke="#d97706" strokeWidth="1.5" />
      {/* Base */}
      <rect x="26" y="44" width="12" height="3" rx="1.5" fill="#9ca3af" />
      <rect x="27" y="47" width="10" height="3" rx="1.5" fill="#6b7280" />
      <rect x="28" y="50" width="8" height="2" rx="1" fill="#52525b" />
      {/* Rays */}
      <line x1="32" y1="0" x2="32" y2="4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="50" y1="10" x2="48" y2="13" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="14" y1="10" x2="16" y2="13" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="56" y1="24" x2="52" y2="25" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="8" y1="24" x2="12" y2="25" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// ── Studio Ghibli — Totoro in forest ──
export function GhibliLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="ghib-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
      </defs>
      {/* Background trees */}
      <ellipse cx="14" cy="34" rx="10" ry="18" fill="#166534" opacity="0.5" />
      <ellipse cx="50" cy="34" rx="10" ry="18" fill="#166534" opacity="0.5" />
      <ellipse cx="32" cy="30" rx="14" ry="22" fill="#15803d" opacity="0.4" />
      {/* Totoro body */}
      <ellipse cx="32" cy="42" rx="14" ry="16" fill="#6b7280" />
      <ellipse cx="32" cy="44" rx="10" ry="10" fill="#9ca3af" opacity="0.3" />
      {/* Ears */}
      <ellipse cx="22" cy="24" rx="4" ry="8" fill="#6b7280" transform="rotate(-10,22,24)" />
      <ellipse cx="42" cy="24" rx="4" ry="8" fill="#6b7280" transform="rotate(10,42,24)" />
      {/* Eyes */}
      <circle cx="26" cy="36" r="4" fill="white" />
      <circle cx="38" cy="36" r="4" fill="white" />
      <circle cx="27" cy="36" r="2.5" fill="#1e293b" />
      <circle cx="39" cy="36" r="2.5" fill="#1e293b" />
      <circle cx="27.5" cy="35" r="1" fill="white" />
      <circle cx="39.5" cy="35" r="1" fill="white" />
      {/* Nose */}
      <ellipse cx="32" cy="40" rx="2.5" ry="1.5" fill="#374151" />
      {/* Belly marks */}
      <path d="M26 46h12M27 49h10M28 52h8" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Whiskers */}
      <line x1="18" y1="39" x2="24" y2="40" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="18" y1="42" x2="24" y2="42" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="40" y1="40" x2="46" y2="39" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="40" y1="42" x2="46" y2="42" stroke="#9ca3af" strokeWidth="0.8" />
    </svg>
  );
}

// ── Lucasfilm — X-wing / stars ──
export function LucasfilmLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      {/* Stars background */}
      <circle cx="8" cy="8" r="1" fill="white" opacity="0.4" />
      <circle cx="52" cy="12" r="1.2" fill="white" opacity="0.5" />
      <circle cx="16" cy="52" r="0.8" fill="white" opacity="0.3" />
      <circle cx="56" cy="46" r="1" fill="white" opacity="0.4" />
      <circle cx="40" cy="6" r="0.8" fill="white" opacity="0.3" />
      {/* X-wing body */}
      <polygon points="32,10 28,32 36,32" fill="#d4d4d8" />
      <rect x="29" y="32" width="6" height="16" rx="1" fill="#a1a1aa" />
      {/* Wings */}
      <polygon points="28,18 8,12 10,16 28,26" fill="#e5e7eb" opacity="0.8" />
      <polygon points="36,18 56,12 54,16 36,26" fill="#e5e7eb" opacity="0.8" />
      <polygon points="28,36 8,50 10,46 28,40" fill="#e5e7eb" opacity="0.8" />
      <polygon points="36,36 56,50 54,46 36,40" fill="#e5e7eb" opacity="0.8" />
      {/* Engines */}
      <circle cx="8" cy="12" r="2" fill="#ef4444" opacity="0.7" />
      <circle cx="56" cy="12" r="2" fill="#ef4444" opacity="0.7" />
      <circle cx="8" cy="50" r="2" fill="#ef4444" opacity="0.7" />
      <circle cx="56" cy="50" r="2" fill="#ef4444" opacity="0.7" />
      {/* Cockpit */}
      <circle cx="32" cy="18" r="3" fill="#38bdf8" opacity="0.6" />
    </svg>
  );
}

// ── 20th Century Studios — searchlight monument ──
export function TwentiethCenturyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="tc-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Searchlight beams */}
      <polygon points="26,26 6,4 18,4" fill="#fef9c3" opacity="0.15" />
      <polygon points="38,26 46,4 58,4" fill="#fef9c3" opacity="0.15" />
      {/* Monument */}
      <rect x="22" y="20" width="20" height="36" rx="2" fill="url(#tc-g)" />
      <rect x="18" y="50" width="28" height="6" rx="1" fill="#d97706" />
      {/* 20th text */}
      <text x="32" y="36" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="system-ui" fill="white">20</text>
      <text x="32" y="48" textAnchor="middle" fontSize="5" fontWeight="700" fontFamily="system-ui" fill="white" opacity="0.8" letterSpacing="1">CENTURY</text>
    </svg>
  );
}

// ── Annapurna — mountain peak ──
export function AnnapurnaLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="anna-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="60%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
      </defs>
      {/* Sun behind */}
      <circle cx="32" cy="22" r="10" fill="#fbbf24" opacity="0.3" />
      {/* Mountain */}
      <polygon points="32,8 4,56 60,56" fill="url(#anna-g)" />
      {/* Snow cap */}
      <polygon points="32,8 24,22 40,22" fill="white" opacity="0.9" />
      <polygon points="32,14 26,22 38,22" fill="#fda4af" opacity="0.4" />
      {/* Ridge lines */}
      <line x1="32" y1="22" x2="14" y2="56" stroke="white" strokeWidth="0.5" opacity="0.15" />
      <line x1="32" y1="22" x2="50" y2="56" stroke="white" strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}

// ── New Line Cinema — film strip ring ──
export function NewLineLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="nl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {/* Film strip circle */}
      <circle cx="32" cy="32" r="22" fill="none" stroke="url(#nl-g)" strokeWidth="8" />
      {/* Perforations outer */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 22.5) * Math.PI / 180;
        const cx = 32 + Math.cos(angle) * 22;
        const cy = 32 + Math.sin(angle) * 22;
        return <circle key={`o${i}`} cx={cx} cy={cy} r="2" fill="#1e1b4b" />;
      })}
      {/* Center */}
      <circle cx="32" cy="32" r="10" fill="#7c3aed" />
      <text x="32" y="36" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="system-ui" fill="white">NL</text>
    </svg>
  );
}

// ── Blumhouse — haunted house ──
export function BlumhouseLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="blum-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>
      {/* Moon */}
      <circle cx="50" cy="12" r="8" fill="#fbbf24" opacity="0.3" />
      {/* House */}
      <rect x="16" y="30" width="32" height="24" fill="url(#blum-g)" />
      <polygon points="12,30 32,12 52,30" fill="#1f2937" />
      {/* Windows — glowing */}
      <rect x="20" y="36" width="8" height="8" rx="1" fill="#fbbf24" opacity="0.6" />
      <rect x="36" y="36" width="8" height="8" rx="1" fill="#ef4444" opacity="0.5" />
      {/* Door */}
      <rect x="28" y="42" width="8" height="12" rx="1" fill="#111827" />
      <circle cx="34" cy="48" r="1" fill="#fbbf24" opacity="0.6" />
      {/* Cross beams on windows */}
      <line x1="24" y1="36" x2="24" y2="44" stroke="#111827" strokeWidth="1" />
      <line x1="20" y1="40" x2="28" y2="40" stroke="#111827" strokeWidth="1" />
      <line x1="40" y1="36" x2="40" y2="44" stroke="#111827" strokeWidth="1" />
      <line x1="36" y1="40" x2="44" y2="40" stroke="#111827" strokeWidth="1" />
      {/* Bats */}
      <path d="M38 8 Q40 6 42 8 Q40 7 38 8z" fill="white" opacity="0.4" />
      <path d="M20 14 Q22 12 24 14 Q22 13 20 14z" fill="white" opacity="0.3" />
    </svg>
  );
}

// ── Legendary — ornate shield ──
export function LegendaryLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="leg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path d="M32 4 L54 16 L54 36 Q54 52 32 60 Q10 52 10 36 L10 16Z" fill="url(#leg-g)" />
      <path d="M32 8 L50 18 L50 35 Q50 49 32 56 Q14 49 14 35 L14 18Z" fill="none" stroke="#451a03" strokeWidth="1.5" opacity="0.3" />
      {/* Inner design */}
      <path d="M32 16 L44 24 L44 36 Q44 46 32 50 Q20 46 20 36 L20 24Z" fill="#b45309" opacity="0.4" />
      {/* L monogram */}
      <text x="32" y="40" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="Georgia, serif" fill="white" opacity="0.9">L</text>
    </svg>
  );
}

// ── MGM — lion in wreath ──
export function MGMLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="mgm-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Wreath */}
      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#mgm-g)" strokeWidth="4" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.3" />
      {/* Inner circle */}
      <circle cx="32" cy="32" r="18" fill="#b45309" opacity="0.2" />
      {/* Lion face simplified */}
      <ellipse cx="32" cy="34" rx="10" ry="11" fill="#d97706" />
      <circle cx="28" cy="30" r="2" fill="#451a03" />
      <circle cx="36" cy="30" r="2" fill="#451a03" />
      <ellipse cx="32" cy="36" rx="2.5" ry="1.5" fill="#92400e" />
      <path d="M29 39 Q32 42 35 39" fill="none" stroke="#92400e" strokeWidth="1" />
      {/* Mane tufts */}
      <circle cx="22" cy="28" r="4" fill="#f59e0b" opacity="0.5" />
      <circle cx="42" cy="28" r="4" fill="#f59e0b" opacity="0.5" />
      <circle cx="26" cy="22" r="3" fill="#f59e0b" opacity="0.4" />
      <circle cx="38" cy="22" r="3" fill="#f59e0b" opacity="0.4" />
      {/* Banner */}
      <rect x="18" y="52" width="28" height="8" rx="2" fill="url(#mgm-g)" />
      <text x="32" y="59" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="system-ui" fill="#451a03">MGM</text>
    </svg>
  );
}

// ── Neon — glowing neon sign ──
export function NeonLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <filter id="neon-blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {/* Glow */}
      <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="system-ui" fill="#4ade80" filter="url(#neon-blur)" opacity="0.6">NEON</text>
      {/* Main text */}
      <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="system-ui" fill="#4ade80">NEON</text>
      <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="system-ui" fill="white" opacity="0.5">NEON</text>
    </svg>
  );
}

// ── Participant — compass rose ──
export function ParticipantLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="part-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      {/* Compass circle */}
      <circle cx="32" cy="32" r="22" fill="none" stroke="url(#part-g)" strokeWidth="2.5" />
      {/* Cardinal points */}
      <polygon points="32,10 28,28 32,24 36,28" fill="white" />
      <polygon points="32,54 28,36 32,40 36,36" fill="#5eead4" />
      <polygon points="10,32 28,28 24,32 28,36" fill="#5eead4" opacity="0.8" />
      <polygon points="54,32 36,28 40,32 36,36" fill="#5eead4" opacity="0.8" />
      {/* Center */}
      <circle cx="32" cy="32" r="3" fill="white" />
    </svg>
  );
}

// ── StudioCanal — film frame ──
export function StudioCanalLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="sc-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="48" height="40" rx="4" fill="url(#sc-g)" />
      <rect x="12" y="16" width="40" height="32" rx="2" fill="#1e3a5f" />
      {/* Film sprocket holes */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`l${i}`} x="9" y={16 + i * 6} width="3" height="3" rx="0.5" fill="#1e3a5f" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`r${i}`} x="52" y={16 + i * 6} width="3" height="3" rx="0.5" fill="#1e3a5f" />
      ))}
      {/* SC text */}
      <text x="32" y="38" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="1">SC</text>
    </svg>
  );
}

// ── Bollywood — tabla drum ──
export function BollywoodLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="bw-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="bw-g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Decorative dots top */}
      <circle cx="32" cy="6" r="1.5" fill="#fbbf24" opacity="0.6" />
      <circle cx="24" cy="8" r="1" fill="#fbbf24" opacity="0.4" />
      <circle cx="40" cy="8" r="1" fill="#fbbf24" opacity="0.4" />
      {/* Left drum (tabla) */}
      <ellipse cx="22" cy="24" rx="14" ry="4" fill="url(#bw-g2)" />
      <rect x="8" y="24" width="28" height="24" rx="2" fill="url(#bw-g)" />
      <ellipse cx="22" cy="48" rx="14" ry="4" fill="#9a3412" />
      <ellipse cx="22" cy="24" rx="10" ry="3" fill="#451a03" opacity="0.3" />
      {/* Drum straps */}
      <line x1="10" y1="26" x2="10" y2="46" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
      <line x1="16" y1="26" x2="16" y2="46" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
      <line x1="28" y1="26" x2="28" y2="46" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
      <line x1="34" y1="26" x2="34" y2="46" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
      {/* Right drum (dagga) */}
      <ellipse cx="46" cy="28" rx="10" ry="3.5" fill="url(#bw-g2)" />
      <rect x="36" y="28" width="20" height="20" rx="2" fill="url(#bw-g)" />
      <ellipse cx="46" cy="48" rx="10" ry="3.5" fill="#9a3412" />
      <ellipse cx="46" cy="28" rx="7" ry="2.5" fill="#451a03" opacity="0.3" />
      {/* Marigold garland */}
      <path d="M8 18 Q20 14 32 18 Q44 14 56 18" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

// ── Korean Cinema — traditional fan ──
export function KoreanLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="kr-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {/* Taegeuk (yin-yang) */}
      <circle cx="32" cy="28" r="18" fill="white" />
      <path d="M32 10a18 18 0 010 36" fill="#ef4444" />
      <path d="M32 46a18 18 0 010-36" fill="#1d4ed8" />
      <circle cx="32" cy="19" r="9" fill="#ef4444" />
      <circle cx="32" cy="37" r="9" fill="#1d4ed8" />
      <circle cx="32" cy="19" r="4.5" fill="#1d4ed8" />
      <circle cx="32" cy="37" r="4.5" fill="#ef4444" />
      {/* Trigrams */}
      <rect x="10" y="8" width="8" height="2" rx="1" fill="white" opacity="0.6" />
      <rect x="10" y="12" width="3" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="15" y="12" width="3" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="46" y="8" width="8" height="2" rx="1" fill="white" opacity="0.6" />
      <rect x="46" y="12" width="8" height="2" rx="1" fill="white" opacity="0.6" />
      {/* Label */}
      <text x="32" y="58" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="system-ui" fill="white" letterSpacing="1" opacity="0.7">KOREA</text>
    </svg>
  );
}

// ── Anime — katana blade ──
export function AnimeLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="anime-blade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      {/* Blade */}
      <path d="M48 4 L52 6 L18 50 L14 48Z" fill="url(#anime-blade)" />
      {/* Blade edge shine */}
      <path d="M50 5 L20 47" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
      {/* Guard (tsuba) */}
      <ellipse cx="16" cy="49" rx="6" ry="3" fill="#fbbf24" transform="rotate(-40,16,49)" />
      <ellipse cx="16" cy="49" rx="4.5" ry="2" fill="#d97706" transform="rotate(-40,16,49)" />
      {/* Handle (tsuka) */}
      <rect x="6" y="52" width="14" height="5" rx="2" fill="#92400e" transform="rotate(-40,13,54)" />
      {/* Wrap pattern */}
      <line x1="8" y1="56" x2="10" y2="53" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
      <line x1="11" y1="57" x2="13" y2="54" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
      {/* Cherry blossom accent */}
      <circle cx="44" cy="18" r="3" fill="#f472b6" opacity="0.5" />
      <circle cx="48" cy="14" r="2" fill="#f472b6" opacity="0.4" />
      <circle cx="40" cy="12" r="2.5" fill="#f472b6" opacity="0.3" />
      <circle cx="44" cy="18" r="1" fill="#fdf2f8" opacity="0.6" />
    </svg>
  );
}

// ── Toei Animation — ocean wave ──
export function ToeiLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={s}>
      <defs>
        <linearGradient id="toei-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Sun */}
      <circle cx="32" cy="20" r="12" fill="#ef4444" opacity="0.8" />
      {/* Sun rays */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x1 = 32 + Math.cos(angle) * 14;
        const y1 = 20 + Math.sin(angle) * 14;
        const x2 = 32 + Math.cos(angle) * 18;
        const y2 = 20 + Math.sin(angle) * 18;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.4" />;
      })}
      {/* Wave */}
      <path d="M0 42 Q8 34 16 42 Q24 50 32 42 Q40 34 48 42 Q56 50 64 42 L64 64 L0 64Z" fill="#2563eb" opacity="0.6" />
      <path d="M0 48 Q8 40 16 48 Q24 56 32 48 Q40 40 48 48 Q56 56 64 48 L64 64 L0 64Z" fill="#1d4ed8" opacity="0.4" />
      {/* TOEI text */}
      <text x="32" y="60" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="2">TOEI</text>
    </svg>
  );
}

// ── Map slug -> component ──
export const STUDIO_LOGOS: Record<string, React.ComponentType<LogoProps>> = {
  disney: DisneyLogo,
  pixar: PixarLogo,
  marvel: MarvelLogo,
  dc: DCLogo,
  'warner-bros': WarnerBrosLogo,
  searchlight: SearchlightLogo,
  amblin: AmblinLogo,
  'working-title': WorkingTitleLogo,
  universal: UniversalLogo,
  paramount: ParamountLogo,
  sony: SonyLogo,
  lionsgate: LionsgateLogo,
  a24: A24Logo,
  'focus-features': FocusFeaturesLogo,
  miramax: MiramaxLogo,
  skydance: SkydanceLogo,
  dreamworks: DreamWorksLogo,
  illumination: IlluminationLogo,
  ghibli: GhibliLogo,
  lucasfilm: LucasfilmLogo,
  '20th-century': TwentiethCenturyLogo,
  annapurna: AnnapurnaLogo,
  'new-line': NewLineLogo,
  blumhouse: BlumhouseLogo,
  legendary: LegendaryLogo,
  mgm: MGMLogo,
  neon: NeonLogo,
  participant: ParticipantLogo,
  studiocanal: StudioCanalLogo,
  bollywood: BollywoodLogo,
  korean: KoreanLogo,
  anime: AnimeLogo,
  toei: ToeiLogo,
};
