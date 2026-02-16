import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Search, X, Plus, Play } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import ScrollRow from '../components/ScrollRow';
import { SkeletonRow, SkeletonHero } from '../components/SkeletonCard';
import { getTrendingTV, getTopRatedTV, getTVByGenre, getAnime, getAnimationTV, searchTV, addToLibrary, getTVDetails, getOMDbByTitle, computeUnifiedRating, setSyllabusScore, applyStoredScores } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

const TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 9648, name: 'Mystery' },
  { id: 10768, name: 'War & Politics' },
  { id: 99, name: 'Documentary' },
];

function TVShows() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hero, setHero] = useState(null);
  const [heroRating, setHeroRating] = useState(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [anime, setAnime] = useState([]);
  const [animation, setAnimation] = useState([]);
  const [genreData, setGenreData] = useState({});
  const [loadedGenres, setLoadedGenres] = useState(new Set());
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch hero details (for trailer) + unified rating
  useEffect(() => {
    if (!hero?.id) return;
    getTVDetails(hero.id).then(d => {
      setHero(prev => ({ ...prev, videos: d.videos }));
    }).catch(() => {});
    // Fetch unified rating for hero
    const title = hero.name;
    const year = (hero.first_air_date || '').slice(0, 4);
    getOMDbByTitle(title, year, 'tv').then(omdb => {
      const unified = computeUnifiedRating(omdb, null, false);
      setHeroRating(unified);
      if (unified != null && hero.id) setSyllabusScore('tv', hero.id, unified);
    }).catch(() => {});
  }, [hero?.id, hero?.name, hero?.first_air_date]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [t, tr, an, anim] = await Promise.all([
          getTrendingTV(),
          getTopRatedTV(),
          getAnime(),
          getAnimationTV(),
        ]);
        setTrending(t);
        setHero(t[Math.floor(Math.random() * Math.min(5, t.length))]);
        setTopRated(tr);
        setAnime(an);
        setAnimation(anim);

        // Apply any stored Syllabus Scores
        applyStoredScores(t, 'tv');
        applyStoredScores(tr, 'tv');
        applyStoredScores(an, 'tv');
        applyStoredScores(anim, 'tv');

        // Pre-load first 3 genres
        const initial = TV_GENRES.slice(0, 3);
        const genreResults = await Promise.all(initial.map(g => getTVByGenre(g.id)));
        const gd = {};
        initial.forEach((g, i) => { applyStoredScores(genreResults[i], 'tv'); gd[g.id] = genreResults[i]; });
        setGenreData(gd);
        setLoadedGenres(new Set(initial.map(g => g.id)));
      } catch (err) { console.error(err); }
      setInitialLoaded(true);
    }
    loadInitial();
  }, []);

  const loadGenre = useCallback(async (genreId) => {
    if (loadedGenres.has(genreId)) return;
    setLoadedGenres(prev => new Set([...prev, genreId]));
    const data = await getTVByGenre(genreId);
    applyStoredScores(data, 'tv');
    setGenreData(prev => ({ ...prev, [genreId]: data }));
  }, [loadedGenres]);

  const observerRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const genreId = Number(node.dataset.genre);
        if (genreId) loadGenre(genreId);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
  }, [loadGenre]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchTV(query);
    setResults(data);
    setSearching(false);
  };

  const clearSearch = () => { setResults(null); setQuery(''); };

  // Find hero trailer
  const heroTrailer = (() => {
    const vids = (hero?.videos?.results || []).filter(v => v.site === 'YouTube');
    return vids.find(v => v.type === 'Trailer') || vids.find(v => v.type === 'Teaser') || vids[0] || null;
  })();

  const handleHeroAdd = async () => {
    if (!user) return navigate('/login');
    try {
      await addToLibrary({
        tmdb_id: hero.id, media_type: 'tv', title: hero.name,
        poster_path: hero.poster_path ? `${TMDB_IMG}/w500${hero.poster_path}` : null,
        overview: hero.overview, external_rating: heroRating ?? hero.vote_average, release_date: hero.first_air_date,
      });
    } catch { /* ignore */ }
  };

  if (!initialLoaded) return (
    <div className="min-w-0">
      <SkeletonHero />
      <SkeletonRow title />
      <SkeletonRow title />
      <SkeletonRow title />
    </div>
  );

  return (
    <div className="min-w-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search TV shows..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-accent/40 transition-colors" />
        </div>
        <button type="submit" disabled={searching} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
          {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
          Search
        </button>
        {results && <button type="button" onClick={clearSearch} className="text-white/40 hover:text-white"><X size={18} /></button>}
      </form>

      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">Results for &ldquo;{query}&rdquo;</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.map(t => <MediaCard key={t.id} item={t} mediaType="tv" />)}
          </div>
        </>
      ) : (
        <>
          {/* Hero Banner */}
          {hero?.backdrop_path && (
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-10 -mt-2 mb-10 h-[50vh] sm:h-[60vh] min-h-[320px] overflow-hidden rounded-b-3xl">
              <img src={`${TMDB_IMG}/w1280${hero.backdrop_path}`} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-6 lg:left-10 max-w-lg pr-4">
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black mb-2 sm:mb-3 leading-tight">{hero.name}</h1>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-white/50 mb-2 sm:mb-3">
                  {(heroRating ?? hero.vote_average) && <span className="flex items-center gap-1 text-gold"><Star size={14} className="fill-gold" /> {(heroRating ?? hero.vote_average).toFixed(1)}</span>}
                  <span>{hero.first_air_date?.slice(0, 4)}</span>
                </div>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5">{hero.overview}</p>
                <div className="flex gap-2 sm:gap-3">
                  <button onClick={() => navigate(`/details/tv/${hero.id}`)} className="bg-white text-black font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm hover:bg-white/90 transition-colors">More Info</button>
                  {heroTrailer && (
                    <a href={`https://www.youtube.com/watch?v=${heroTrailer.key}`} target="_blank" rel="noopener noreferrer"
                      className="bg-white/10 backdrop-blur-md border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2">
                      <Play size={16} /> Trailer
                    </a>
                  )}
                  <button onClick={handleHeroAdd} className="bg-white/10 backdrop-blur-md border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"><Plus size={16} /> Library</button>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 */}
          <div className="mb-10 min-w-0">
            <h2 className="text-[15px] font-semibold text-white/80 mb-4 uppercase tracking-wide">Top 10 TV This Week</h2>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {trending.slice(0, 10).map((item, i) => (
                <div key={item.id} className="flex-shrink-0 flex items-end cursor-pointer group/card" onClick={() => navigate(`/details/tv/${item.id}`)}>
                  <span className="text-[5rem] sm:text-[7rem] font-black leading-none -mr-3 sm:-mr-4 select-none text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.08)' }}>{i + 1}</span>
                  <div className="relative">
                    {item.poster_path && <img src={`${TMDB_IMG}/w185${item.poster_path}`} alt={item.name} loading="lazy" className="h-32 sm:h-40 rounded-xl relative z-10 shadow-lg group-hover/card:scale-105 transition-transform duration-300 object-cover aspect-[2/3]" />}
                    {(item.unified_rating ?? item.vote_average) > 0 && (
                      <div className="absolute top-1.5 right-1.5 z-20 bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-semibold">
                        <Star size={11} className="text-gold fill-gold" />
                        {Number(item.unified_rating ?? item.vote_average).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anime */}
          {anime.length > 0 && (
            <ScrollRow title="Anime">
              {anime.map(t => <div key={t.id} className="flex-shrink-0 w-[150px]"><MediaCard item={t} mediaType="tv" /></div>)}
            </ScrollRow>
          )}

          {/* Animation (Disney/Pixar/Western) */}
          {animation.length > 0 && (
            <ScrollRow title="Animation \u00b7 Disney & More">
              {animation.map(t => <div key={t.id} className="flex-shrink-0 w-[150px]"><MediaCard item={t} mediaType="tv" /></div>)}
            </ScrollRow>
          )}

          {/* Genre Rows (lazy-loaded) */}
          {TV_GENRES.map(g => {
            const loaded = loadedGenres.has(g.id);
            const shows = genreData[g.id];
            return (
              <div key={g.id} ref={loaded ? undefined : observerRef} data-genre={g.id}>
                {!loaded ? (
                  <SkeletonRow title={g.name} />
                ) : shows?.length > 0 ? (
                  <ScrollRow title={g.name}>
                    {shows.map(t => <div key={t.id} className="flex-shrink-0 w-[150px]"><MediaCard item={t} mediaType="tv" /></div>)}
                  </ScrollRow>
                ) : null}
              </div>
            );
          })}

          {/* Top Rated */}
          <ScrollRow title="Top Rated of All Time">
            {topRated.map(t => <div key={t.id} className="flex-shrink-0 w-[150px]"><MediaCard item={t} mediaType="tv" /></div>)}
          </ScrollRow>
        </>
      )}
    </div>
  );
}

export default TVShows;
