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
          getTrendingMovies(), getTrendingTV(), getTrendingBooks(),
        ]);
        setTrendingMovies(movies.slice(0, 10));
        setTrendingTV(tv.slice(0, 10));
        setTrendingBooks(books.slice(0, 10));
      } catch (err) { console.error(err); }
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
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Discover</h1>
      <p className="text-white/40 text-sm mb-8">Find your next favourite thing to watch or read.</p>

      <SearchBar onSearch={handleSearch} />

      {searchResults ? (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <button className="btn-secondary text-sm" onClick={() => setSearchResults(null)}>Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-12">
            {searchResults.map((item, i) => (
              <MediaCard key={item.id || item.key || i} item={item} mediaType={item.media_type} />
            ))}
          </div>
        </>
      ) : (
        <>
          <Section title="Trending Movies">
            {trendingMovies.map(m => <MediaCard key={m.id} item={m} mediaType="movie" />)}
          </Section>
          <Section title="Trending TV Shows">
            {trendingTV.map(t => <MediaCard key={t.id} item={t} mediaType="tv" />)}
          </Section>
          <Section title="Trending Books">
            {trendingBooks.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-semibold mb-5">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {children}
      </div>
    </div>
  );
}

export default Home;
