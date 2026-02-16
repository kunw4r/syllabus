import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Search, X, Plus } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import ScrollRow from '../components/ScrollRow';
import { getTrendingMovies, getNowPlayingMovies, getTopRatedMovies, getMoviesByGenre, searchMovies, addToLibrary } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 878, name: 'Sci-Fi' },
  { id: 27, name: 'Horror' },
  { id: 16, name: 'Animation' },
  { id: 18, name: 'Drama' },
  { id: 53, name: 'Thriller' },
  { id: 10749, name: 'Romance' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
];

function Movies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hero, setHero] = useState(null);
  const [trending, setTrending] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [genreData, setGenreData] = useState({});
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [t, np, tr, ...genreResults] = await Promise.all([
          getTrendingMovies(),
          getNowPlayingMovies(),
          getTopRatedMovies(),
          ...GENRES.map(g => getMoviesByGenre(g.id)),
        ]);
        setTrending(t);
        setHero(t[Math.floor(Math.random() * Math.min(5, t.length))]);
        setNowPlaying(np);
        setTopRated(tr);
        const gd = {};
        GENRES.forEach((g, i) => { gd[g.id] = genreResults[i]; });
        setGenreData(gd);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchMovies(query);
    setResults(data);
    setLoading(false);
  };

  const clearSearch = () => { setResults(null); setQuery(''); };

  const handleHeroAdd = async () => {
    if (!user) return navigate('/login');
    try {
      await addToLibrary({
        tmdb_id: hero.id, media_type: 'movie', title: hero.title,
        poster_path: hero.poster_path ? `${TMDB_IMG}/w500${hero.poster_path}` : null,
        overview: hero.overview, external_rating: hero.vote_average, release_date: hero.release_date,
      });
    } catch { /* ignore */ }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movies..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-accent/40 transition-colors" />
        </div>
        {results && <button type="button" onClick={clearSearch} className="text-white/40 hover:text-white"><X size={18} /></button>}
      </form>

      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">Results for &ldquo;{query}&rdquo;</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.map(m => <MediaCard key={m.id} item={m} mediaType="movie" />)}
          </div>
        </>
      ) : (
        <>
          {/* Hero Banner */}
          {hero?.backdrop_path && (
            <div className="relative -mx-6 md:-mx-10 -mt-2 mb-10 h-[60vh] min-h-[400px] overflow-hidden rounded-b-3xl">
              <img src={`${TMDB_IMG}/original${hero.backdrop_path}`} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-10 left-6 md:left-10 max-w-lg">
                <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">{hero.title}</h1>
                <div className="flex items-center gap-3 text-sm text-white/50 mb-3">
                  <span className="flex items-center gap-1 text-gold"><Star size={14} className="fill-gold" /> {hero.vote_average?.toFixed(1)}</span>
                  <span>{hero.release_date?.slice(0, 4)}</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-3 mb-5">{hero.overview}</p>
                <div className="flex gap-3">
                  <button onClick={() => navigate(`/details/movie/${hero.id}`)} className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors">More Info</button>
                  <button onClick={handleHeroAdd} className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"><Plus size={16} /> Library</button>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 */}
          <div className="mb-10">
            <h2 className="text-[15px] font-semibold text-white/80 mb-4 uppercase tracking-wide">Top 10 Movies This Week</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {trending.slice(0, 10).map((item, i) => (
                <div key={item.id} className="flex-shrink-0 flex items-end cursor-pointer group/card" onClick={() => navigate(`/details/movie/${item.id}`)}>
                  <span className="text-[7rem] font-black leading-none -mr-4 select-none text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.08)' }}>{i + 1}</span>
                  {item.poster_path && <img src={`${TMDB_IMG}/w300${item.poster_path}`} alt={item.title} className="h-40 rounded-xl relative z-10 shadow-lg group-hover/card:scale-105 transition-transform duration-300" />}
                </div>
              ))}
            </div>
          </div>

          {/* Now Playing */}
          <ScrollRow title="Now Playing in Cinemas">
            {nowPlaying.map(m => <div key={m.id} className="flex-shrink-0 w-[150px]"><MediaCard item={m} mediaType="movie" /></div>)}
          </ScrollRow>

          {/* Genre Rows */}
          {GENRES.map(g => (
            genreData[g.id]?.length > 0 && (
              <ScrollRow key={g.id} title={g.name}>
                {genreData[g.id].map(m => <div key={m.id} className="flex-shrink-0 w-[150px]"><MediaCard item={m} mediaType="movie" /></div>)}
              </ScrollRow>
            )
          ))}

          {/* Top Rated */}
          <ScrollRow title="Top Rated of All Time">
            {topRated.map(m => <div key={m.id} className="flex-shrink-0 w-[150px]"><MediaCard item={m} mediaType="movie" /></div>)}
          </ScrollRow>
        </>
      )}
    </div>
  );
}

export default Movies;
