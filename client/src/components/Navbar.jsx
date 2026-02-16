import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, BookOpen, Trophy, Library, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/movies', icon: Film, label: 'Movies' },
    { to: '/tv', icon: Tv, label: 'TV Shows' },
    { to: '/books', icon: BookOpen, label: 'Books' },
    { to: '/top100', icon: Trophy, label: 'Top 100' },
    ...(user ? [{ to: '/library', icon: Library, label: 'Library' }] : []),
  ];

  const mobileItems = [
    ...navItems,
    ...(user
      ? [{ to: '#signout', icon: LogOut, label: 'Sign Out' }]
      : [{ to: '/login', icon: LogIn, label: 'Sign In' }]),
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
                <Icon size={18} strokeWidth={1.8} />
                {label}
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
                <LogOut size={18} strokeWidth={1.8} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent/10"
            >
              <LogIn size={18} strokeWidth={1.8} />
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Mobile top-right logo */}
      <div className="fixed top-3 right-3 z-50 lg:hidden">
        <NavLink to="/" className="block bg-dark-900/60 backdrop-blur-md rounded-xl px-3 py-1.5">
          <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Syllabus" className="h-8 sm:h-9" />
        </NavLink>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-white/5 bg-dark-900/90 backdrop-blur-xl">
        {mobileItems.map(({ to, icon: Icon, label }) => {
          if (to === '#signout') {
            return (
              <button
                key="signout"
                onClick={signOut}
                className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] text-white/30 active:text-white transition-colors"
              >
                <Icon size={20} strokeWidth={1.6} />
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
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                  isActive ? 'text-accent' : 'text-white/30 active:text-white'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.6} />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

export default Navbar;
