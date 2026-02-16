import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Film, Tv, BookOpen, Library } from 'lucide-react';

function Navbar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">syllabus</div>
      <ul className="sidebar-nav">
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
            <Home size={20} /> Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/movies" className={({ isActive }) => isActive ? 'active' : ''}>
            <Film size={20} /> Movies
          </NavLink>
        </li>
        <li>
          <NavLink to="/tv" className={({ isActive }) => isActive ? 'active' : ''}>
            <Tv size={20} /> TV Shows
          </NavLink>
        </li>
        <li>
          <NavLink to="/books" className={({ isActive }) => isActive ? 'active' : ''}>
            <BookOpen size={20} /> Books
          </NavLink>
        </li>
        <li>
          <NavLink to="/library" className={({ isActive }) => isActive ? 'active' : ''}>
            <Library size={20} /> My Library
          </NavLink>
        </li>
      </ul>
    </aside>
  );
}

export default Navbar;
