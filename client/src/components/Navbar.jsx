import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, BookOpen, Library, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/movies', icon: Film, label: 'Movies' },
    { to: '/tv', icon: Tv, label: 'TV Shows' },
    { to: '/books', icon: BookOpen, label: 'Books' },
    ...(user ? [{ to: '/library', icon: Library, label: 'My Library' }] : []),
  ];

  return (
    <nav className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-white/5 bg-dark-800/80 backdrop-blur-xl md:flex z-50">
      <div className="px-6 py-8">
        <span className="text-2xl font-bold tracking-tight text-accent">syllabus</span>
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
  );
}

export default Navbar;
