import React, { useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import SearchBar from '../components/SearchBar';
import { getTrendingMovies, getTrendingTV, getTrendingBooks, multiSearch } from '../services/api';

function Home() {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [movies, tv, books] = await Promise.all([
          getTrendingMovies(),
          getTrendingTV(),
          getTrendingBooks(),
        ]);
        setTrendingMovies(movies.slice(0, 10));
        setTrendingTV(tv.slice(0, 10));
        setTrendingBooks(books.slice(0, 10));
      } catch (err) {
        console.error('Failed to load trending:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = async (query) => {
    setLoading(true);
    const results = await multiSearch(query);
    setSearchResults(results);
    setLoading(false);
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div>
      <SearchBar onSearch={handleSearch} />

      {searchResults ? (
        <>
          <div className="section-header">
            <h2>Search Results</h2>
            <button className="btn btn-secondary" onClick={() => setSearchResults(null)}>Clear</button>
          </div>
          <div className="media-grid">
            {searchResults.map((item, i) => (
              <MediaCard key={item.id || item.key || i} item={item} mediaType={item.media_type} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-header"><h2>Trending Movies</h2></div>
          <div className="media-grid">
            {trendingMovies.map(m => <MediaCard key={m.id} item={m} mediaType="movie" />)}
          </div>

          <div className="section-header"><h2>Trending TV Shows</h2></div>
          <div className="media-grid">
            {trendingTV.map(t => <MediaCard key={t.id} item={t} mediaType="tv" />)}
          </div>

          <div className="section-header"><h2>Trending Books</h2></div>
          <div className="media-grid">
            {trendingBooks.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
