import React, { useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import SearchBar from '../components/SearchBar';
import { getTrendingTV, getAiringTV, searchTV } from '../services/api';

function TVShows() {
  const [trending, setTrending] = useState([]);
  const [airing, setAiring] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('trending');

  useEffect(() => {
    async function load() {
      const [t, a] = await Promise.all([getTrendingTV(), getAiringTV()]);
      setTrending(t);
      setAiring(a);
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = async (query) => {
    setLoading(true);
    const data = await searchTV(query);
    setResults(data);
    setLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const displayItems = results || (tab === 'trending' ? trending : airing);

  return (
    <div>
      <SearchBar onSearch={handleSearch} placeholder="Search TV shows..." />

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
          <button className={`tab ${tab === 'airing' ? 'active' : ''}`} onClick={() => setTab('airing')}>
            Airing Today
          </button>
        </div>
      )}

      <div className="media-grid">
        {displayItems.map(t => <MediaCard key={t.id} item={t} mediaType="tv" />)}
      </div>
    </div>
  );
}

export default TVShows;
