// SVG logo-style icons for each studio — clean, minimal, recognizable.
// Each renders at the given size with white fill for dark backgrounds.

interface LogoProps {
  size?: number;
  className?: string;
}

const s: React.CSSProperties = { display: 'block' };

// Disney — castle silhouette
export function DisneyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M24 4l-2 8h-4l-2-6-3 6h-3l-2 10h-2v14h4v-10h2l2 10h4v-10h2v10h4v-10h2l2 10h4V22h-2L24 12l-2 6h-4l-2-8h4l2-4 2 4h4l-2 8h-4z" opacity="0"/>
      <rect x="8" y="32" width="32" height="4" rx="1"/>
      <rect x="10" y="26" width="28" height="6" rx="1"/>
      <rect x="13" y="20" width="4" height="6"/>
      <rect x="22" y="20" width="4" height="6"/>
      <rect x="31" y="20" width="4" height="6"/>
      <rect x="14" y="14" width="2" height="6"/>
      <rect x="23" y="10" width="2" height="10"/>
      <rect x="32" y="14" width="2" height="6"/>
      <polygon points="15,14 15,11 15,14"/>
      <circle cx="15" cy="12" r="1.5"/>
      <circle cx="24" cy="8" r="2"/>
      <circle cx="33" cy="12" r="1.5"/>
      <rect x="18" y="28" width="5" height="4" rx="2.5" ry="2.5" fill="rgba(0,0,0,0.3)"/>
      <rect x="25" y="28" width="5" height="4" rx="2.5" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    </svg>
  );
}

// Pixar — desk lamp silhouette
export function PixarLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <ellipse cx="24" cy="38" rx="10" ry="2" opacity="0.3"/>
      <rect x="22" y="36" width="4" height="2" rx="1"/>
      <path d="M23 36L18 22h2l3 12h2l3-12h2L25 36z"/>
      <circle cx="19" cy="18" r="5" fill="none" stroke="white" strokeWidth="2.5"/>
      <path d="M16 22l-2 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="19" cy="18" r="1.5"/>
      <text x="24" y="44" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="system-ui" letterSpacing="1">PIXAR</text>
    </svg>
  );
}

// Marvel — bold M shield
export function MarvelLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={s}>
      <rect x="6" y="12" width="36" height="24" rx="3" fill="#E62429"/>
      <text x="24" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui" fill="white" letterSpacing="-0.5">MARVEL</text>
    </svg>
  );
}

// DC — shield
export function DCLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={s}>
      <circle cx="24" cy="24" r="16" fill="white"/>
      <circle cx="24" cy="24" r="13" fill="#0476F2"/>
      <text x="24" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui" fill="white">DC</text>
    </svg>
  );
}

// Warner Bros — shield shape
export function WarnerBrosLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M24 6C16 6 10 10 10 10v18c0 6 14 14 14 14s14-8 14-14V10S32 6 24 6z" fill="none" stroke="white" strokeWidth="2.5"/>
      <text x="24" y="25" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="system-ui" fill="white">WB</text>
    </svg>
  );
}

// Universal — globe
export function UniversalLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={s}>
      <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="2"/>
      <ellipse cx="24" cy="24" rx="6" ry="14" stroke="white" strokeWidth="1.5"/>
      <line x1="10" y1="24" x2="38" y2="24" stroke="white" strokeWidth="1.5"/>
      <path d="M12 17h24M12 31h24" stroke="white" strokeWidth="1" opacity="0.6"/>
      <text x="24" y="46" textAnchor="middle" fontSize="5" fontWeight="700" fontFamily="system-ui" fill="white" letterSpacing="2" opacity="0.7">UNIVERSAL</text>
    </svg>
  );
}

// Paramount — mountain peak with stars
export function ParamountLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <polygon points="24,10 8,38 40,38"/>
      <polygon points="24,16 14,36 34,36" fill="rgba(0,0,0,0.4)"/>
      <polygon points="24,22 18,34 30,34" fill="rgba(0,0,0,0.3)"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const r = 20;
        const cx = 24 + Math.cos(angle) * r;
        const cy = 18 + Math.sin(angle) * r;
        if (cy > 30 || cy < 2) return null;
        return <circle key={i} cx={cx} cy={cy} r="1" opacity="0.8"/>;
      })}
    </svg>
  );
}

// Sony — bold text
export function SonyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <text x="24" y="22" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="system-ui" letterSpacing="1">SONY</text>
      <text x="24" y="32" textAnchor="middle" fontSize="5" fontWeight="500" fontFamily="system-ui" opacity="0.6" letterSpacing="0.5">PICTURES</text>
    </svg>
  );
}

// Lionsgate — gateway columns
export function LionsgateLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <rect x="12" y="14" width="4" height="22"/>
      <rect x="32" y="14" width="4" height="22"/>
      <rect x="10" y="12" width="8" height="3" rx="1"/>
      <rect x="30" y="12" width="8" height="3" rx="1"/>
      <rect x="10" y="35" width="28" height="3" rx="1"/>
      <path d="M20 14h8v3a4 4 0 01-8 0v-3z" opacity="0.6"/>
      <text x="24" y="32" textAnchor="middle" fontSize="5" fontWeight="800" fontFamily="system-ui" letterSpacing="1">LG</text>
    </svg>
  );
}

// A24 — clean typography
export function A24Logo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <text x="24" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="system-ui" letterSpacing="-1">A24</text>
    </svg>
  );
}

// DreamWorks — moon with figure
export function DreamWorksLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M32 10a16 16 0 100 28 13 13 0 010-28z"/>
      <circle cx="20" cy="18" r="1" fill="rgba(0,0,0,0.4)"/>
      <path d="M25 32c0-3 2-5 2-5s-1-1-2-1a2 2 0 00-2 2v4z" fill="rgba(0,0,0,0.3)"/>
      <line x1="24" y1="26" x2="26" y2="20" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

// Illumination — lightbulb
export function IlluminationLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M24 6a12 12 0 00-7 21.7V32a3 3 0 003 3h8a3 3 0 003-3v-4.3A12 12 0 0024 6z"/>
      <rect x="20" y="36" width="8" height="2" rx="1" opacity="0.6"/>
      <rect x="21" y="39" width="6" height="2" rx="1" opacity="0.4"/>
      <path d="M24 12v8M20 16h8" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Studio Ghibli — Totoro-ish silhouette
export function GhibliLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M24 42c-10 0-14-6-14-14 0-6 2-12 6-16l2-6 2 4c1.3-1.3 2.7-2 4-2s2.7.7 4 2l2-4 2 6c4 4 6 10 6 16 0 8-4 14-14 14z"/>
      <circle cx="19" cy="24" r="3" fill="rgba(0,0,0,0.3)"/>
      <circle cx="29" cy="24" r="3" fill="rgba(0,0,0,0.3)"/>
      <circle cx="19" cy="23.5" r="1.5" fill="rgba(0,0,0,0.5)"/>
      <circle cx="29" cy="23.5" r="1.5" fill="rgba(0,0,0,0.5)"/>
      <ellipse cx="24" cy="30" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)"/>
      <path d="M14 28h6M28 28h6" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
      <path d="M14 30h5M29 30h5" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
    </svg>
  );
}

// Lucasfilm — stars / space
export function LucasfilmLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <text x="24" y="22" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="system-ui" letterSpacing="2">LUCASFILM</text>
      <text x="24" y="30" textAnchor="middle" fontSize="5" fontWeight="400" fontFamily="system-ui" letterSpacing="3" opacity="0.5">LTD</text>
      <line x1="8" y1="34" x2="40" y2="34" stroke="white" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  );
}

// 20th Century
export function TwentiethCenturyLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <text x="24" y="18" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="system-ui">20th</text>
      <text x="24" y="28" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="system-ui" letterSpacing="1" opacity="0.7">CENTURY</text>
      <text x="24" y="36" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="system-ui" letterSpacing="1" opacity="0.7">STUDIOS</text>
    </svg>
  );
}

// New Line Cinema — film strip
export function NewLineLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <rect x="6" y="16" width="36" height="16" rx="2" fill="none" stroke="white" strokeWidth="2"/>
      <text x="24" y="27" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="system-ui" letterSpacing="0.5">NLC</text>
      <rect x="10" y="14" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="16" y="14" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="22" y="14" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="28" y="14" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="34" y="14" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="10" y="31" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="16" y="31" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="22" y="31" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="28" y="31" width="3" height="3" rx="0.5" opacity="0.5"/>
      <rect x="34" y="31" width="3" height="3" rx="0.5" opacity="0.5"/>
    </svg>
  );
}

// Blumhouse — horror/dark aesthetic
export function BlumhouseLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M16 38V18a8 8 0 0116 0v20" fill="none" stroke="white" strokeWidth="2"/>
      <rect x="16" y="36" width="16" height="3" rx="1"/>
      <circle cx="21" cy="22" r="2"/>
      <circle cx="27" cy="22" r="2"/>
      <path d="M20 28h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 14l4 4M34 14l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <text x="24" y="46" textAnchor="middle" fontSize="5" fontWeight="800" fontFamily="system-ui" letterSpacing="0.5" opacity="0.6">BH</text>
    </svg>
  );
}

// Bollywood — ornate film reel / Taj Mahal inspired
export function BollywoodLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M24 6c-3 0-5 4-5 8h10c0-4-2-8-5-8z"/>
      <circle cx="24" cy="8" r="1.5" fill="rgba(0,0,0,0.3)"/>
      <rect x="14" y="14" width="20" height="3" rx="1"/>
      <rect x="16" y="17" width="3" height="14"/>
      <rect x="29" y="17" width="3" height="14"/>
      <rect x="22" y="17" width="4" height="14"/>
      <path d="M16 17a4 4 0 013-3.5M29 17a4 4 0 003-3.5" stroke="white" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <rect x="12" y="31" width="24" height="3" rx="1"/>
      <rect x="10" y="34" width="28" height="2" rx="1" opacity="0.6"/>
      <path d="M8 38h32" stroke="white" strokeWidth="1" opacity="0.3"/>
    </svg>
  );
}

// Korean Cinema — hanbok/traditional motif
export function KoreanLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <circle cx="24" cy="22" r="12" fill="none" stroke="white" strokeWidth="2"/>
      <path d="M24 10a12 12 0 010 24" fill="white"/>
      <path d="M24 16a6 6 0 010 12" fill="rgba(0,0,0,0.3)"/>
      <path d="M24 16a6 6 0 000 12" fill="white"/>
      <circle cx="24" cy="19" r="2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="24" cy="25" r="2"/>
      <text x="24" y="42" textAnchor="middle" fontSize="5" fontWeight="700" fontFamily="system-ui" letterSpacing="1" opacity="0.6">KOREA</text>
    </svg>
  );
}

// Anime — stylized eye
export function AnimeLogo({ size = 48, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="white" className={className} style={s}>
      <path d="M6 24c0 0 8-12 18-12s18 12 18 12-8 12-18 12S6 24 6 24z" fill="none" stroke="white" strokeWidth="2"/>
      <circle cx="24" cy="24" r="7" fill="white"/>
      <circle cx="24" cy="24" r="5" fill="rgba(0,0,0,0.5)"/>
      <circle cx="24" cy="24" r="2.5"/>
      <circle cx="22" cy="21" r="1.5" opacity="0.8"/>
      <circle cx="26" cy="22" r="0.8" opacity="0.6"/>
      <path d="M10 16l4 3M38 16l-4 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

// Map slug → component
export const STUDIO_LOGOS: Record<string, React.ComponentType<LogoProps>> = {
  disney: DisneyLogo,
  pixar: PixarLogo,
  marvel: MarvelLogo,
  dc: DCLogo,
  'warner-bros': WarnerBrosLogo,
  universal: UniversalLogo,
  paramount: ParamountLogo,
  sony: SonyLogo,
  lionsgate: LionsgateLogo,
  a24: A24Logo,
  dreamworks: DreamWorksLogo,
  illumination: IlluminationLogo,
  ghibli: GhibliLogo,
  lucasfilm: LucasfilmLogo,
  '20th-century': TwentiethCenturyLogo,
  'new-line': NewLineLogo,
  blumhouse: BlumhouseLogo,
  bollywood: BollywoodLogo,
  korean: KoreanLogo,
  anime: AnimeLogo,
};
