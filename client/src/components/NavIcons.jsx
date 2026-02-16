import React from 'react';

// Apple SF Symbols–inspired icons for crisp tab bar rendering.
// Each icon provides an outlined (inactive) and filled (active) variant.
// All SVGs use viewBox="0 0 24 24" with 2px stroke for bold readability.

const s = { display: 'block' };

export function HomeIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <path d="M12.6 2.4a1 1 0 0 0-1.2 0l-8 6A1 1 0 0 0 3 9.2V20a2 2 0 0 0 2 2h4a1 1 0 0 0 1-1v-5a2 2 0 0 1 4 0v5a1 1 0 0 0 1 1h4a2 2 0 0 0 2-2V9.2a1 1 0 0 0-.4-.8l-8-6Z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M15 21v-5a3 3 0 0 0-6 0v5"/>
      <path d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5Z"/>
    </svg>
  );
}

export function CompassIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.9 5.1-2.6 6.2a1 1 0 0 1-.5.5l-6.2 2.6a.5.5 0 0 1-.6-.6l2.6-6.2a1 1 0 0 1 .5-.5l6.2-2.6a.5.5 0 0 1 .6.6ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/>
    </svg>
  );
}

export function LibraryIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <rect x="3" y="3" width="4" height="18" rx="1"/>
      <rect x="10" y="5" width="4" height="16" rx="1"/>
      <path d="m17.5 3.5 3.8 15.2a1 1 0 0 1-.7 1.2l-1 .3a1 1 0 0 1-1.2-.7L14.6 4.3a1 1 0 0 1 .7-1.2l1-.3a1 1 0 0 1 1.2.7Z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <rect x="3" y="3" width="4" height="18" rx="1"/>
      <rect x="10" y="5" width="4" height="16" rx="1"/>
      <path d="m17.5 3.5 3.8 15.2a1 1 0 0 1-.7 1.2l-1 .3a1 1 0 0 1-1.2-.7L14.6 4.3a1 1 0 0 1 .7-1.2l1-.3a1 1 0 0 1 1.2.7Z"/>
    </svg>
  );
}

export function SocialIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <circle cx="9" cy="7" r="4"/>
      <path d="M2 21a7 7 0 0 1 14 0"/>
      <circle cx="18" cy="9" r="3"/>
      <path d="M22 21a5 5 0 0 0-7.5-4.3"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="9" cy="7" r="4"/>
      <path d="M2 21a7 7 0 0 1 14 0"/>
      <circle cx="18" cy="9" r="3"/>
      <path d="M22 21a5 5 0 0 0-7.5-4.3"/>
    </svg>
  );
}

export function ProfileIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <circle cx="12" cy="8" r="5"/>
      <path d="M3 21a9 9 0 0 1 18 0"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="8" r="5"/>
      <path d="M3 21a9 9 0 0 1 18 0"/>
    </svg>
  );
}

export function TrophyIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <path d="M6 2h12v6a6 6 0 0 1-12 0V2Z"/>
      <path d="M6 4H4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/>
      <path d="M18 4h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4"/>
      <path d="M10 14.5V17h4v-2.5"/>
      <rect x="8" y="17" width="8" height="3" rx="1"/>
      <rect x="6" y="20" width="12" height="2" rx="1"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M6 2h12v6a6 6 0 0 1-12 0V2Z"/>
      <path d="M6 4H4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/>
      <path d="M18 4h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4"/>
      <line x1="12" y1="14" x2="12" y2="17"/>
      <rect x="8" y="17" width="8" height="3" rx="1"/>
      <rect x="6" y="20" width="12" height="2" rx="1"/>
    </svg>
  );
}

export function FilmIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <rect x="2" y="2" width="20" height="20" rx="3"/>
      <path d="M7 2v20M17 2v20M2 7h5M17 7h5M2 12h20M2 17h5M17 17h5" stroke="currentColor" strokeWidth="1.5" fill="none" style={{color:'var(--dark-900, #0d0d0f)'}}/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <rect x="2" y="2" width="20" height="20" rx="3"/>
      <path d="M7 2v20M17 2v20M2 7h5M17 7h5M2 12h20M2 17h5M17 17h5"/>
    </svg>
  );
}

export function TvIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <path d="M8 22h8M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" style={{color:'currentColor'}}/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <path d="M8 22h8M12 19v3"/>
    </svg>
  );
}

export function BookIcon({ size = 24, active }) {
  return active ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={s}>
      <path d="M12 5c-2-2-5-2.5-7-2.5-.7 0-1.3.1-2 .2A1.5 1.5 0 0 0 2 4.2v13.3c0 .9.8 1.6 1.7 1.5.6-.1 1.3-.1 1.8-.1 2 0 4.3.6 6.5 2.5 2.2-1.9 4.5-2.5 6.5-2.5.5 0 1.2 0 1.8.1a1.5 1.5 0 0 0 1.7-1.5V4.2a1.5 1.5 0 0 0-1-1.5c-.7-.1-1.3-.2-2-.2-2 0-5 .5-7 2.5Z"/>
      <path d="M12 5v16" stroke="currentColor" strokeWidth="1.5" fill="none" style={{color:'var(--dark-900, #0d0d0f)'}}/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M12 5c-2-2-5-2.5-7-2.5S2 3 2 3v15s1-0.5 3-0.5 5 1 7 3c2-2 5-3 7-3s3 .5 3 .5V3s-1-.5-3-.5S14 3 12 5Z"/>
      <path d="M12 5v16"/>
    </svg>
  );
}

export function LogInIcon({ size = 24, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}

export function LogOutIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export function XIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
