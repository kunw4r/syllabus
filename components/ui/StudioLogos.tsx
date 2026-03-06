// Monochrome white studio logos — simplified, consistent visual weight.
// Designed for dark cinematic card surfaces. No colour, no neon, no emoji.

interface LogoProps {
  size?: number;
  className?: string;
}

// ── Disney — iconic script "D" arc + castle silhouette ──
export function DisneyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Castle silhouette */}
      <rect x="28" y="18" width="24" height="3" rx="0.5" opacity="0.9" />
      <rect x="30" y="14" width="20" height="4" rx="0.5" opacity="0.85" />
      <rect x="33" y="8" width="3" height="6" />
      <rect x="39" y="5" width="3" height="9" />
      <rect x="45" y="8" width="3" height="6" />
      <polygon points="34.5,5 32,8 37,8" opacity="0.9" />
      <polygon points="40.5,1 37.5,5 43.5,5" opacity="0.9" />
      <polygon points="46.5,5 44,8 49,8" opacity="0.9" />
      {/* Disney script */}
      <text x="40" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="0.5" opacity="0.95">DISNEY</text>
    </svg>
  );
}

// ── Pixar — Luxo lamp silhouette ──
export function PixarLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Lamp silhouette */}
      <ellipse cx="28" cy="14" rx="5" ry="3.5" opacity="0.9" />
      <line x1="30" y1="17" x2="34" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="27" x2="28" y2="31" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="34" cy="27" r="1.5" opacity="0.7" />
      <ellipse cx="28" cy="32" rx="7" ry="1.5" opacity="0.5" />
      {/* Text */}
      <text x="52" y="24" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="system-ui" letterSpacing="3">PIXAR</text>
    </svg>
  );
}

// ── Marvel — bold banner ──
export function MarvelLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <rect x="8" y="6" width="64" height="22" rx="2" opacity="0.95" />
      <text x="40" y="22" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="system-ui" fill="#0a0a0a" letterSpacing="0.5">MARVEL</text>
    </svg>
  );
}

// ── DC — circle + letters ──
export function DCLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <circle cx="40" cy="17" r="15" fill="none" stroke="white" strokeWidth="2.5" />
      <text x="40" y="23" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui" letterSpacing="-0.5">DC</text>
    </svg>
  );
}

// ── Warner Bros — WB shield ──
export function WarnerBrosLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M40 2C30 2 24 6 24 6v16c0 6 16 10 16 10s16-4 16-10V6S50 2 40 2z" fill="none" stroke="white" strokeWidth="2" />
      <text x="40" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="system-ui">WB</text>
    </svg>
  );
}

// ── Searchlight Pictures — twin beams ──
export function SearchlightLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Beams */}
      <polygon points="30,22 18,2 24,2" opacity="0.2" />
      <polygon points="50,22 56,2 62,2" opacity="0.2" />
      {/* Housings */}
      <rect x="27" y="22" width="6" height="4" rx="1" opacity="0.85" />
      <rect x="47" y="22" width="6" height="4" rx="1" opacity="0.85" />
      {/* Stands */}
      <line x1="30" y1="26" x2="27" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="26" x2="33" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="26" x2="47" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="26" x2="53" y2="32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Amblin — crescent moon + fishing silhouette ──
export function AmblinLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M52 4a14 14 0 100 26 11 11 0 010-26z" opacity="0.9" />
      {/* Figure */}
      <circle cx="44" cy="12" r="2.5" opacity="0.7" />
      <path d="M43 14.5 L41.5 22 L46.5 22 L45 14.5Z" opacity="0.7" />
      {/* Rod */}
      <path d="M46 13 Q52 6 55 10" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
      <line x1="55" y1="10" x2="55" y2="24" stroke="white" strokeWidth="0.5" opacity="0.35" />
    </svg>
  );
}

// ── Working Title — WT monogram ──
export function WorkingTitleLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <rect x="18" y="4" width="44" height="26" rx="3" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <text x="40" y="21" textAnchor="middle" fontSize="12" fontWeight="300" fontFamily="Georgia, serif" letterSpacing="2" opacity="0.95">WT</text>
    </svg>
  );
}

// ── Universal — globe ──
export function UniversalLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="none" stroke="white" className={className}>
      <circle cx="40" cy="17" r="13" strokeWidth="1.5" />
      <ellipse cx="40" cy="17" rx="5.5" ry="13" strokeWidth="1.2" />
      <line x1="27" y1="17" x2="53" y2="17" strokeWidth="1" />
      <line x1="28" y1="11" x2="52" y2="11" strokeWidth="0.7" opacity="0.5" />
      <line x1="28" y1="23" x2="52" y2="23" strokeWidth="0.7" opacity="0.5" />
      <ellipse cx="40" cy="17" rx="18" ry="5" strokeWidth="1" opacity="0.4" transform="rotate(-20,40,17)" />
    </svg>
  );
}

// ── Paramount — mountain peak + stars ──
export function ParamountLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Stars arc */}
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i * (360 / 22) - 90) * Math.PI / 180;
        const cx = 40 + Math.cos(angle) * 15;
        const cy = 14 + Math.sin(angle) * 15;
        if (cy > 28 || cy < 0) return null;
        return <circle key={i} cx={cx} cy={cy} r="0.8" opacity="0.6" />;
      })}
      {/* Mountain */}
      <polygon points="40,6 24,32 56,32" opacity="0.9" />
      <polygon points="40,10 28,30 52,30" fill="#0a0a0a" opacity="0.4" />
      <polygon points="40,6 36,14 44,14" opacity="0.95" />
    </svg>
  );
}

// ── Sony Pictures — text wordmark ──
export function SonyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="18" textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="system-ui" letterSpacing="3">SONY</text>
      <text x="40" y="28" textAnchor="middle" fontSize="5.5" fontWeight="500" fontFamily="system-ui" opacity="0.55" letterSpacing="2">PICTURES</text>
    </svg>
  );
}

// ── Lionsgate — gateway arch ──
export function LionsgateLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Columns */}
      <rect x="24" y="8" width="3.5" height="20" opacity="0.9" />
      <rect x="52.5" y="8" width="3.5" height="20" opacity="0.9" />
      {/* Arch */}
      <path d="M24 8 Q40 -2 56 8" fill="none" stroke="white" strokeWidth="2.5" />
      {/* Base */}
      <rect x="22" y="28" width="36" height="2" rx="0.5" opacity="0.7" />
      {/* Keystone */}
      <rect x="38" y="2" width="4" height="4" rx="1" opacity="0.6" />
    </svg>
  );
}

// ── A24 — clean typography ──
export function A24Logo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="24" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="system-ui" letterSpacing="-1" opacity="0.95">A24</text>
    </svg>
  );
}

// ── Focus Features — prism refraction ──
export function FocusFeaturesLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <line x1="10" y1="17" x2="28" y2="17" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <polygon points="30,6 50,17 30,28" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
      {/* Refracted beams */}
      <line x1="50" y1="13" x2="70" y2="6" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="50" y1="15" x2="70" y2="12" stroke="white" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="17" x2="70" y2="17" stroke="white" strokeWidth="1" opacity="0.45" />
      <line x1="50" y1="19" x2="70" y2="22" stroke="white" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="21" x2="70" y2="28" stroke="white" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

// ── Miramax — film reel ──
export function MiramaxLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <circle cx="40" cy="17" r="14" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="40" cy="17" r="3" opacity="0.7" />
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60) * Math.PI / 180;
        const cx = 40 + Math.cos(angle) * 9;
        const cy = 17 + Math.sin(angle) * 9;
        return <circle key={i} cx={cx} cy={cy} r="2.2" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />;
      })}
    </svg>
  );
}

// ── Skydance — abstract wing / sky arc ──
export function SkydanceLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M14 24 Q40 -4 66 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      <path d="M20 24 Q40 2 60 24" fill="none" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <text x="40" y="32" textAnchor="middle" fontSize="5.5" fontWeight="700" fontFamily="system-ui" letterSpacing="4" opacity="0.7">SKYDANCE</text>
    </svg>
  );
}

// ── DreamWorks — crescent moon ──
export function DreamWorksLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M52 2a16 16 0 100 30 12.5 12.5 0 010-30z" opacity="0.85" />
      {/* Figure silhouette */}
      <circle cx="42" cy="12" r="2.5" fill="#0a0a0a" opacity="0.5" />
      <path d="M41 14.5 L39 22 L45 22 L43 14.5Z" fill="#0a0a0a" opacity="0.5" />
      {/* Rod */}
      <path d="M44 13 Q50 8 53 11" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}

// ── Illumination — lightbulb ──
export function IlluminationLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M40 2a10 10 0 00-6.5 17.6V23a2.5 2.5 0 002.5 2.5h8a2.5 2.5 0 002.5-2.5v-3.4A10 10 0 0040 2z" fill="none" stroke="white" strokeWidth="1.5" />
      <rect x="36" y="26" width="8" height="1.5" rx="0.75" opacity="0.6" />
      <rect x="37" y="28.5" width="6" height="1.5" rx="0.75" opacity="0.45" />
      <path d="M38 10 Q39.5 14 40 10 Q40.5 14 42 10" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// ── Studio Ghibli — Totoro silhouette ──
export function GhibliLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Body */}
      <ellipse cx="40" cy="22" rx="12" ry="12" opacity="0.9" />
      {/* Ears */}
      <ellipse cx="32" cy="10" rx="3" ry="6" opacity="0.8" transform="rotate(-8,32,10)" />
      <ellipse cx="48" cy="10" rx="3" ry="6" opacity="0.8" transform="rotate(8,48,10)" />
      {/* Eyes */}
      <circle cx="36" cy="18" r="2.5" fill="#0a0a0a" opacity="0.6" />
      <circle cx="44" cy="18" r="2.5" fill="#0a0a0a" opacity="0.6" />
      <circle cx="36.5" cy="17.5" r="1" fill="white" opacity="0.5" />
      <circle cx="44.5" cy="17.5" r="1" fill="white" opacity="0.5" />
      {/* Nose */}
      <ellipse cx="40" cy="21" rx="1.5" ry="1" fill="#0a0a0a" opacity="0.4" />
      {/* Belly marks */}
      <path d="M35 25h10M36 27.5h8" stroke="#0a0a0a" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

// ── Lucasfilm — text wordmark ──
export function LucasfilmLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="system-ui" letterSpacing="4" opacity="0.9">LUCASFILM</text>
      <line x1="12" y1="22" x2="68" y2="22" stroke="white" strokeWidth="0.5" opacity="0.3" />
      <text x="40" y="29" textAnchor="middle" fontSize="5" fontWeight="400" fontFamily="system-ui" letterSpacing="5" opacity="0.4">LTD</text>
    </svg>
  );
}

// ── 20th Century Studios — monumental text ──
export function TwentiethCenturyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="16" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui" opacity="0.95">20th</text>
      <text x="40" y="25" textAnchor="middle" fontSize="5.5" fontWeight="700" fontFamily="system-ui" letterSpacing="2.5" opacity="0.6">CENTURY</text>
      <text x="40" y="32" textAnchor="middle" fontSize="5" fontWeight="600" fontFamily="system-ui" letterSpacing="2" opacity="0.5">STUDIOS</text>
    </svg>
  );
}

// ── Annapurna — mountain peak ──
export function AnnapurnaLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <polygon points="40,2 14,32 66,32" fill="none" stroke="white" strokeWidth="1.5" opacity="0.85" />
      <polygon points="40,2 32,14 48,14" opacity="0.7" />
      <line x1="40" y1="14" x2="24" y2="32" stroke="white" strokeWidth="0.5" opacity="0.2" />
      <line x1="40" y1="14" x2="56" y2="32" stroke="white" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

// ── New Line Cinema — text mark ──
export function NewLineLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="system-ui" letterSpacing="2" opacity="0.9">NEW LINE</text>
      <line x1="16" y1="18" x2="64" y2="18" stroke="white" strokeWidth="0.5" opacity="0.3" />
      <text x="40" y="27" textAnchor="middle" fontSize="6" fontWeight="600" fontFamily="system-ui" letterSpacing="3" opacity="0.55">CINEMA</text>
    </svg>
  );
}

// ── Blumhouse — bold text + keyhole ──
export function BlumhouseLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="16" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="system-ui" letterSpacing="2.5" opacity="0.9">BLUM</text>
      <text x="40" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="system-ui" letterSpacing="2.5" opacity="0.9">HOUSE</text>
      {/* Keyhole accent */}
      <circle cx="40" cy="4" r="2" opacity="0.35" />
      <rect x="39" y="5.5" width="2" height="3" rx="0.5" opacity="0.25" />
    </svg>
  );
}

// ── Legendary — shield outline ──
export function LegendaryLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M40 2 L58 10 L58 20 Q58 30 40 34 Q22 30 22 20 L22 10Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      <text x="40" y="22" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Georgia, serif" opacity="0.9" letterSpacing="0.5">L</text>
    </svg>
  );
}

// ── MGM — lion wreath silhouette ──
export function MGMLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <circle cx="40" cy="17" r="14" fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
      <circle cx="40" cy="17" r="11" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <text x="40" y="22" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="system-ui" letterSpacing="1" opacity="0.9">MGM</text>
    </svg>
  );
}

// ── Neon — clean text mark ──
export function NeonLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="23" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="system-ui" letterSpacing="2" opacity="0.95">NEON</text>
    </svg>
  );
}

// ── Participant — compass ──
export function ParticipantLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <circle cx="40" cy="17" r="13" fill="none" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <polygon points="40,4 37.5,14 40,12 42.5,14" opacity="0.9" />
      <polygon points="40,30 37.5,20 40,22 42.5,20" opacity="0.5" />
      <polygon points="27,17 37,14.5 35,17 37,19.5" opacity="0.5" />
      <polygon points="53,17 43,14.5 45,17 43,19.5" opacity="0.5" />
      <circle cx="40" cy="17" r="2" opacity="0.7" />
    </svg>
  );
}

// ── StudioCanal — text mark ──
export function StudioCanalLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <text x="40" y="14" textAnchor="middle" fontSize="7" fontWeight="600" fontFamily="system-ui" letterSpacing="3" opacity="0.7">STUDIO</text>
      <text x="40" y="26" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="system-ui" letterSpacing="2" opacity="0.9">CANAL</text>
    </svg>
  );
}

// ── Bollywood — Taj Mahal silhouette ──
export function BollywoodLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Central dome */}
      <path d="M40 6 Q34 6 34 14 L34 20 L46 20 L46 14 Q46 6 40 6Z" opacity="0.85" />
      <circle cx="40" cy="5" r="1.2" opacity="0.6" />
      {/* Minarets */}
      <rect x="22" y="12" width="3" height="16" rx="0.5" opacity="0.6" />
      <rect x="55" y="12" width="3" height="16" rx="0.5" opacity="0.6" />
      <circle cx="23.5" cy="11" r="2" opacity="0.5" />
      <circle cx="56.5" cy="11" r="2" opacity="0.5" />
      {/* Base */}
      <rect x="18" y="28" width="44" height="2.5" rx="0.5" opacity="0.7" />
      <rect x="30" y="20" width="20" height="8" rx="0.5" opacity="0.65" />
      {/* Arch door */}
      <path d="M37 28 Q40 22 43 28" fill="#0a0a0a" opacity="0.3" />
    </svg>
  );
}

// ── Korean Cinema — Taegeuk ──
export function KoreanLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <circle cx="40" cy="17" r="13" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      <path d="M40 4a13 13 0 010 26" opacity="0.85" />
      <path d="M40 30a13 13 0 010-26" opacity="0.4" />
      <circle cx="40" cy="10.5" r="6.5" opacity="0.85" />
      <circle cx="40" cy="23.5" r="6.5" opacity="0.4" />
      <circle cx="40" cy="10.5" r="3.25" opacity="0.4" />
      <circle cx="40" cy="23.5" r="3.25" opacity="0.85" />
    </svg>
  );
}

// ── Anime Films — stylised eye ──
export function AnimeLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      <path d="M12 17 Q40 2 68 17 Q40 32 12 17Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      <circle cx="40" cy="17" r="7" opacity="0.8" />
      <circle cx="40" cy="17" r="4.5" fill="#0a0a0a" opacity="0.5" />
      <circle cx="40" cy="17" r="2" opacity="0.9" />
      <circle cx="38" cy="14.5" r="1.5" opacity="0.5" />
    </svg>
  );
}

// ── Toei Animation — rising sun + wave ──
export function ToeiLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 34" fill="white" className={className}>
      {/* Sun */}
      <circle cx="40" cy="12" r="8" opacity="0.8" />
      {/* Rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 - 90) * Math.PI / 180;
        const x1 = 40 + Math.cos(angle) * 10;
        const y1 = 12 + Math.sin(angle) * 10;
        const x2 = 40 + Math.cos(angle) * 13;
        const y2 = 12 + Math.sin(angle) * 13;
        if (y2 > 24) return null;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />;
      })}
      {/* Wave */}
      <path d="M8 26 Q20 20 32 26 Q44 32 56 26 Q62 23 72 26" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <path d="M8 30 Q20 24 32 30 Q44 36 56 30 Q62 27 72 30" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

// ── Apple Studios — apple silhouette ──
export function AppleStudiosLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className}>
      <path d="M33.3 25.2c-.1-3.8 3.1-5.7 3.2-5.8-1.8-2.6-4.5-2.9-5.4-3-2.3-.2-4.5 1.4-5.7 1.4-1.2 0-3-1.3-5-1.3-2.6 0-4.9 1.5-6.2 3.8-2.7 4.6-.7 11.4 1.9 15.2 1.3 1.9 2.8 3.9 4.8 3.8 1.9-.1 2.7-1.2 5-1.2 2.3 0 3 1.2 5 1.2 2.1 0 3.4-1.9 4.7-3.8 1.5-2.2 2.1-4.3 2.1-4.4 0-.1-4.1-1.6-4.4-5.9z" opacity="0.85" />
      <path d="M29.2 13.8c1.1-1.3 1.8-3.1 1.6-4.8-1.5.1-3.4 1-4.5 2.3-1 1.1-1.8 2.9-1.6 4.7 1.7.1 3.5-1 4.5-2.2z" opacity="0.85" />
      <text x="24" y="46" textAnchor="middle" fontSize="5.5" fontWeight="600" fill="white" opacity="0.5" fontFamily="system-ui">STUDIOS</text>
    </svg>
  );
}

// ── Toho — stylized T ──
export function TohoLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 80 36" fill="white" className={className}>
      <text x="40" y="24" textAnchor="middle" fontSize="22" fontWeight="800" letterSpacing="6" fill="white" opacity="0.85" fontFamily="system-ui">TOHO</text>
      <rect x="12" y="28" width="56" height="1.5" rx="0.75" opacity="0.3" />
    </svg>
  );
}

// ── Export map ──
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
  'apple-studios': AppleStudiosLogo,
  toho: TohoLogo,
};
