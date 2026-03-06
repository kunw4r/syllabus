'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  HomeIcon, CompassIcon, LibraryIcon, SocialIcon, ProfileIcon,
  TrophyIcon, FilmIcon, TvIcon, BookIcon, ActorsIcon, AwardsIcon,
  StudiosIcon, LogInIcon, LogOutIcon, XIcon,
} from '@/components/layout/NavIcons';
import { Search, ChevronDown, Menu, X } from 'lucide-react';

interface NavItem {
  to: string;
  Icon: React.ComponentType<{ size?: number; active?: boolean }>;
  label: string;
}

interface ExploreItem extends NavItem {
  color: string;
}

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname.startsWith(to);
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  // Track scroll for background opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const primaryNav: NavItem[] = [
    { to: '/', Icon: HomeIcon, label: 'Home' },
    { to: '/movies', Icon: FilmIcon, label: 'Movies' },
    { to: '/tv', Icon: TvIcon, label: 'TV Shows' },
    { to: '/books', Icon: BookIcon, label: 'Books' },
    { to: '/top100', Icon: TrophyIcon, label: 'Top 100' },
    { to: '/actors', Icon: ActorsIcon, label: 'Actors' },
    { to: '/studios', Icon: StudiosIcon, label: 'Studios' },
    { to: '/awards', Icon: AwardsIcon, label: 'Awards' },
  ];

  const userNav: NavItem[] = user ? [
    { to: '/library', Icon: LibraryIcon, label: 'Library' },
    { to: '/social', Icon: SocialIcon, label: 'Social' },
    { to: '/profile', Icon: ProfileIcon, label: 'Profile' },
  ] : [];

  const mobileTabs: NavItem[] = [
    { to: '/', Icon: HomeIcon, label: 'Home' },
    { to: '#explore', Icon: CompassIcon, label: 'Explore' },
    ...(user ? [
      { to: '/library', Icon: LibraryIcon, label: 'Library' },
      { to: '/social', Icon: SocialIcon, label: 'Social' },
      { to: '/profile', Icon: ProfileIcon, label: 'Profile' },
    ] : [
      { to: '/top100', Icon: TrophyIcon, label: 'Top 100' },
      { to: '/login', Icon: LogInIcon, label: 'Sign In' },
    ]),
  ];

  const exploreItems: ExploreItem[] = [
    { to: '/movies', Icon: FilmIcon, label: 'Movies', color: 'from-rose-500/20 to-rose-600/10' },
    { to: '/tv', Icon: TvIcon, label: 'TV Shows', color: 'from-cyan-500/20 to-cyan-600/10' },
    { to: '/books', Icon: BookIcon, label: 'Books', color: 'from-amber-500/20 to-amber-600/10' },
    { to: '/top100', Icon: TrophyIcon, label: 'Top 100', color: 'from-purple-500/20 to-purple-600/10' },
    { to: '/actors', Icon: ActorsIcon, label: 'Actors', color: 'from-pink-500/20 to-pink-600/10' },
    { to: '/studios', Icon: StudiosIcon, label: 'Studios', color: 'from-emerald-500/20 to-emerald-600/10' },
    { to: '/awards', Icon: AwardsIcon, label: 'Awards', color: 'from-yellow-500/20 to-yellow-600/10' },
  ];

  return (
    <>
      {/* ── Desktop Top Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 hidden lg:block transition-all duration-500 ${
          scrolled
            ? 'bg-dark-900/95 backdrop-blur-xl shadow-lg shadow-black/20'
            : 'bg-gradient-to-b from-dark-900/80 to-transparent'
        }`}
      >
        <div className="flex items-center h-16 px-6 xl:px-10">
          {/* Logo */}
          <Link href="/" className="shrink-0 mr-8">
            <Image src="/logo.png" alt="Syllabus" width={140} height={32} className="h-8 w-auto" priority />
          </Link>

          {/* Primary nav links */}
          <div className="flex items-center gap-1">
            {primaryNav.map(({ to, label }) => {
              const active = isActive(pathname, to);
              return (
                <Link
                  key={to}
                  href={to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {userNav.map(({ to, label }) => {
              const active = isActive(pathname, to);
              return (
                <Link
                  key={to}
                  href={to}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {user ? (
              <button
                onClick={signOut}
                className="text-sm text-white/40 hover:text-white transition-colors ml-2"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div
          className={`flex items-center px-4 py-2.5 transition-all duration-300 ${
            scrolled
              ? 'bg-dark-900/95 backdrop-blur-xl'
              : 'bg-gradient-to-b from-dark-900/80 to-transparent'
          }`}
        >
          <Link href="/" className="shrink-0">
            <Image src="/logo.png" alt="Syllabus" width={112} height={28} className="h-7 w-auto" priority />
          </Link>
        </div>
      </header>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex flex-row lg:hidden border-t border-white/5 bg-dark-900/90 backdrop-blur-xl safe-area-bottom">
        {mobileTabs.map(({ to, Icon, label }) => {
          if (to === '#explore') {
            return (
              <button
                key="explore"
                onClick={() => setExploreOpen(true)}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors text-white/40 active:text-white"
              >
                <CompassIcon size={26} active={false} />
                {label}
              </button>
            );
          }

          const active = isActive(pathname, to);
          return (
            <Link
              key={to}
              href={to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                active ? 'text-accent' : 'text-white/40 active:text-white'
              }`}
            >
              <Icon size={26} active={active} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile Explore Sheet ── */}
      {exploreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setExploreOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl border-t border-white/10 p-6 pb-10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Explore</h3>
              <button onClick={() => setExploreOpen(false)} className="text-white/40 hover:text-white p-1">
                <XIcon size={22} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {exploreItems.map(({ to, Icon, label, color }) => (
                <Link
                  key={to}
                  href={to}
                  onClick={() => setExploreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl p-4 bg-gradient-to-br border border-white/5 hover:border-white/10 transition-all active:scale-95"
                  style={{ backgroundImage: 'linear-gradient(to bottom right, var(--tw-gradient-stops))' }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon size={22} active />
                  </div>
                  <span className="text-sm font-medium text-white">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
