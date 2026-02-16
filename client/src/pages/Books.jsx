import React, { useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import SearchBar from '../components/SearchBar';
import { getTrendingBooks, searchBooks } from '../services/api';

function Books() {
  const [trending, setTrending] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const books = await getTrendingBooks();
      setTrending(books);
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = async (query) => {
    setLoading(true);
    const data = await searchBooks(query);
    setResults(data);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  const displayItems = results || trending;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Books</h1>
      <SearchBar onSearch={handleSearch} placeholder="Search books..." />

      {results ? (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <button className="btn-secondary text-sm" onClick={() => setResults(null)}>Clear</button>
        </div>
      ) : (
        <h2 className="text-xl font-semibold mb-5">Trending Books</h2>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {displayItems.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
      </div>

      {displayItems.length === 0 && (
        <div className="text-center py-20 text-white/40">
          <h3 className="text-lg font-medium text-white/60 mb-2">No books found</h3>
          <p className="text-sm">Try searching for a title or author</p>
        </div>
      )}
    </div>
  );
}

export default Books;
