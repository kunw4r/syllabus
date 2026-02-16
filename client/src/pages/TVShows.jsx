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

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  const displayItems = results || (tab === 'trending' ? trending : airing);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">TV Shows</h1>
      <SearchBar onSearch={handleSearch} placeholder="Search TV shows..." />

      {results ? (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <button className="btn-secondary text-sm" onClick={() => setResults(null)}>Clear</button>
        </div>
      ) : (
        <div className="flex gap-2 mb-6">
          {['trending', 'airing'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                tab === t ? 'bg-accent border-accent text-white' : 'border-white/10 text-white/50 hover:border-accent/50 hover:text-white'
              }`}>
              {t === 'trending' ? 'Trending' : 'Airing Today'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {displayItems.map(t => <MediaCard key={t.id} item={t} mediaType="tv" />)}
      </div>
    </div>
  );
}

export default TVShows;
