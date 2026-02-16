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

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const displayItems = results || trending;

  return (
    <div>
      <SearchBar onSearch={handleSearch} placeholder="Search books..." />

      {results ? (
        <div className="section-header">
          <h2>Search Results</h2>
          <button className="btn btn-secondary" onClick={() => setResults(null)}>Clear</button>
        </div>
      ) : (
        <div className="section-header"><h2>Trending Books</h2></div>
      )}

      <div className="media-grid">
        {displayItems.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
      </div>

      {displayItems.length === 0 && (
        <div className="empty-state">
          <h3>No books found</h3>
          <p>Try searching for a title or author</p>
        </div>
      )}
    </div>
  );
}

export default Books;
