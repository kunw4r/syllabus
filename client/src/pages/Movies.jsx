import React, { useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import SearchBar from '../components/SearchBar';
import { getTrendingMovies, getUpcomingMovies, searchMovies } from '../services/api';

function Movies() {
  const [trending, setTrending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('trending');

  useEffect(() => {
    async function load() {
      const [t, u] = await Promise.all([getTrendingMovies(), getUpcomingMovies()]);
      setTrending(t);
      setUpcoming(u);
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = async (query) => {
    setLoading(true);
    const data = await searchMovies(query);
    setResults(data);
    setLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const displayItems = results || (tab === 'trending' ? trending : upcoming);

  return (
    <div>
      <SearchBar onSearch={handleSearch} placeholder="Search movies..." />

      {results && (
        <div className="section-header">
          <h2>Search Results</h2>
          <button className="btn btn-secondary" onClick={() => setResults(null)}>Clear</button>
        </div>
      )}

      {!results && (
        <div className="tabs">
          <button className={`tab ${tab === 'trending' ? 'active' : ''}`} onClick={() => setTab('trending')}>
            Trending
          </button>
          <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
            Upcoming
          </button>
        </div>
      )}

      <div className="media-grid">
        {displayItems.map(m => <MediaCard key={m.id} item={m} mediaType="movie" />)}
      </div>
    </div>
  );
}

export default Movies;
