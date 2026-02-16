import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, TrendingUp, Film, BookOpen, Tv } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import ScrollRow from '../components/ScrollRow';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { getTrendingMovies, getTrendingTV, getTrendingBooks, multiSearch, getLibrary, getMoviesByGenre } from '../services/api';

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [library, setLibrary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const promises = [getTrendingMovies(), getTrendingTV(), getTrendingBooks()];
        if (user) promises.push(getLibrary());

        const results = await Promise.all(promises);
        setTrendingMovies(results[0].slice(0, 20));
        setTrendingTV(results[1].slice(0, 20));
        setTrendingBooks(results[2].slice(0, 20));

        if (user && results[3]) {
          setLibrary(results[3]);
          // Recommend based on library genres
          const genreIds = new Set();
          results[3].forEach(item => {
            if (item.genres) {
              item.genres.split(',').forEach(g => {
                const id = Number(g.trim());
                if (id) genreIds.add(id);
              });
            }
          });
          if (genreIds.size > 0) {
            const topGenres = [...genreIds].slice(0, 3);
            const recs = await Promise.all(topGenres.map(id => getMoviesByGenre(id)));
            // Filter out items already in library
            const libraryIds = new Set(results[3].map(i => i.tmdb_id));
            setRecommendations(recs.flat().filter(m => !libraryIds.has(m.id)).slice(0, 20));
          }
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleSearch = async (query) => {
    setLoading(true);
    const results = await multiSearch(query);
    setSearchResults(results);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  const watching = library.filter(i => i.status === 'watching');
  const wantList = library.filter(i => i.status === 'want');
  const finished = library.filter(i => i.status === 'finished');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      {/* Header */}
      {user ? (
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">{greeting()}</h1>
          <p className="text-white/40 text-sm">Here&apos;s what&apos;s happening in your world.</p>

          {/* Stats */}
          <div className="flex gap-3 mt-6 flex-wrap">
            {[
              { icon: Library, label: 'In Library', value: library.length, color: 'text-accent' },
              { icon: TrendingUp, label: 'In Progress', value: watching.length, color: 'text-blue-400' },
              { icon: Film, label: 'Finished', value: finished.length, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[140px]">
                <s.icon size={20} className={s.color} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-white/30">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Discover</h1>
          <p className="text-white/40 text-sm">Find your next favourite thing to watch or read.</p>
        </div>
      )}

      <div className="mb-8">
        <SearchBar onSearch={handleSearch} />
      </div>

      {searchResults ? (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <button className="text-sm text-white/40 hover:text-white transition-colors" onClick={() => setSearchResults(null)}>Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-12">
            {searchResults.map((item, i) => (
              <MediaCard key={item.id || item.key || i} item={item} mediaType={item.media_type} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Personal sections */}
          {user && watching.length > 0 && (
            <ScrollRow title="Continue Watching">
              {watching.map(item => (
                <div key={item.id} className="flex-shrink-0 w-[150px]">
                  <LibraryCard item={item} onClick={() => item.tmdb_id && navigate(`/details/${item.media_type}/${item.tmdb_id}`)} />
                </div>
              ))}
            </ScrollRow>
          )}

          {user && wantList.length > 0 && (
            <ScrollRow title="Your Watchlist">
              {wantList.slice(0, 20).map(item => (
                <div key={item.id} className="flex-shrink-0 w-[150px]">
                  <LibraryCard item={item} onClick={() => item.tmdb_id && navigate(`/details/${item.media_type}/${item.tmdb_id}`)} />
                </div>
              ))}
            </ScrollRow>
          )}

          {user && recommendations.length > 0 && (
            <ScrollRow title="Recommended For You">
              {recommendations.map(m => <div key={m.id} className="flex-shrink-0 w-[150px]"><MediaCard item={m} mediaType="movie" /></div>)}
            </ScrollRow>
          )}

          {/* Trending */}
          <ScrollRow title="Trending Movies">
            {trendingMovies.map(m => <div key={m.id} className="flex-shrink-0 w-[150px]"><MediaCard item={m} mediaType="movie" /></div>)}
          </ScrollRow>

          <ScrollRow title="Trending TV Shows">
            {trendingTV.map(t => <div key={t.id} className="flex-shrink-0 w-[150px]"><MediaCard item={t} mediaType="tv" /></div>)}
          </ScrollRow>

          <ScrollRow title="Trending Books">
            {trendingBooks.map((b, i) => <div key={b.key || i} className="flex-shrink-0 w-[150px]"><MediaCard item={b} mediaType="book" /></div>)}
          </ScrollRow>
        </>
      )}
    </div>
  );
}

function LibraryCard({ item, onClick }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 cursor-pointer hover:-translate-y-1 transition-transform duration-300" onClick={onClick}>
      {item.poster_path ? (
        <img src={item.poster_path} alt={item.title} className="w-full aspect-[2/3] object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-2 text-center">{item.title}</div>
      )}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{item.title}</p>
        {item.user_rating && <p className="text-[10px] text-accent mt-0.5">{item.user_rating}/10</p>}
      </div>
    </div>
  );
}

export default Home;
