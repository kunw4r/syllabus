import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, BookOpen, Trophy, Library, LogOut, LogIn, User, Users, Compass, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [exploreOpen, setExploreOpen] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/movies', icon: Film, label: 'Movies' },
    { to: '/tv', icon: Tv, label: 'TV Shows' },
    { to: '/books', icon: BookOpen, label: 'Books' },
    { to: '/top100', icon: Trophy, label: 'Top 100' },
    ...(user ? [
      { to: '/library', icon: Library, label: 'Library' },
      { to: '/social', icon: Users, label: 'Social' },
      { to: '/profile', icon: User, label: 'Profile' },
    ] : []),
  ];

  // Mobile: 4-5 core tabs only (like Spotify/Netflix)
  const mobileTabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '#explore', icon: Compass, label: 'Explore' },
    ...(user ? [
      { to: '/library', icon: Library, label: 'Library' },
      { to: '/social', icon: Users, label: 'Social' },
      { to: '/profile', icon: User, label: 'Profile' },
    ] : [
      { to: '/top100', icon: Trophy, label: 'Top 100' },
      { to: '/login', icon: LogIn, label: 'Sign In' },
    ]),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-white/5 bg-dark-800/80 backdrop-blur-xl lg:flex z-50">
        <div className="flex items-center justify-center px-4 py-6">
          <NavLink to="/">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Syllabus" className="w-44" />
          </NavLink>
        </div>

        <ul className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-accent'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={1.5} className={isActive ? 'fill-accent/20' : ''} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/5 px-4 py-4">
          {user ? (
            <>
              {user.email && (
                <p className="mb-3 truncate px-2 text-xs text-white/30">{user.email}</p>
              )}
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-white/5 hover:text-white"
              >
                <LogOut size={20} strokeWidth={1.5} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent/10"
            >
              <LogIn size={20} strokeWidth={1.5} />
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* ─── Mobile top bar ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div className="flex items-center px-4 py-2.5 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
          <NavLink to="/" className="shrink-0">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Syllabus" className="h-7" />
          </NavLink>
        </div>
      </header>

      {/* ─── Mobile bottom tab bar (5 tabs max) ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex flex-row lg:hidden border-t border-white/5 bg-dark-900/90 backdrop-blur-xl safe-area-bottom">
        {mobileTabs.map(({ to, icon: Icon, label }) => {
          if (to === '#explore') {
            return (
              <button
                key="explore"
                onClick={() => setExploreOpen(true)}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors text-white/30 active:text-white"
              >
                <Icon size={24} strokeWidth={1.5} />
                {label}
              </button>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                  isActive ? 'text-accent' : 'text-white/30 active:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={1.5} className={isActive ? 'fill-accent/20' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ─── Explore sheet (slides up from bottom) ─── */}
      {exploreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setExploreOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl border-t border-white/10 p-6 pb-10 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Explore</h3>
              <button onClick={() => setExploreOpen(false)} className="text-white/40 hover:text-white p-1">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/movies', icon: Film, label: 'Movies', color: 'from-rose-500/20 to-rose-600/10' },
                { to: '/tv', icon: Tv, label: 'TV Shows', color: 'from-cyan-500/20 to-cyan-600/10' },
                { to: '/books', icon: BookOpen, label: 'Books', color: 'from-amber-500/20 to-amber-600/10' },
                { to: '/top100', icon: Trophy, label: 'Top 100', color: 'from-purple-500/20 to-purple-600/10' },
              ].map(({ to, icon: Icon, label, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setExploreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl p-4 bg-gradient-to-br border border-white/5 hover:border-white/10 transition-all active:scale-95"
                  style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon size={22} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium text-white">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
