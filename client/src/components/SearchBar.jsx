import React, { useState } from 'react';
import { Search } from 'lucide-react';

function SearchBar({ onSearch, placeholder = 'Search movies, TV shows, books...' }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <Search size={18} color="var(--text-secondary)" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
    </form>
  );
}

export default SearchBar;
