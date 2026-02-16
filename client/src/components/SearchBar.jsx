import React, { useState } from 'react';
import { Search } from 'lucide-react';

function SearchBar({ onSearch, placeholder = 'Search movies, TV shows, books...' }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl px-4 py-3 flex items-center gap-3 max-w-lg mb-8">
      <Search size={18} className="text-white/30 shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-white/30"
      />
    </form>
  );
}

export default SearchBar;
