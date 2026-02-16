import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Trophy, Film, Tv, BookOpen, Users } from 'lucide-react';
import { SkeletonRow } from '../components/SkeletonCard';
import { getTop100Movies, getTop100TV, getTop100Books, enrichItemsWithRatings, applyStoredScores } from '../services/api';

// TMDB genre IDs
const MOVIE_GENRES = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
];

const TV_GENRES = [
  { id: null, name: 'All' },
  { id: 10759, name: 'Action' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 10768, name: 'War' },
  { id: 10766, name: 'Soap' },
  { id: 37, name: 'Western' },
];

const BOOK_GENRES = [
  { id: null, name: 'All' },
  { id: 'fiction', name: 'Fiction' },
  { id: 'science_fiction', name: 'Sci-Fi' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'horror', name: 'Horror' },
  { id: 'romance', name: 'Romance' },
  { id: 'history', name: 'History' },
  { id: 'biography', name: 'Biography' },
  { id: 'science', name: 'Science' },
  { id: 'philosophy', name: 'Philosophy' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'true_crime', name: 'True Crime' },
  { id: 'self-help', name: 'Self-Help' },
];

function Top100() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore tab & genre from URL params (preserves state on back-nav)
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'movies');
  const [genre, setGenre] = useState(() => {
    const g = searchParams.get('genre');
    if (!g) return null;
    // Book genres are strings, movie/TV genres are numbers
    const parsed = Number(g);
    return isNaN(parsed) ? g : parsed;
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (t, g) => {
    setLoading(true);
    let result = [];
    if (t === 'movies') result = await getTop100Movies(g);
    else if (t === 'shows') result = await getTop100TV(g);
    else result = await getTop100Books(g);

    // For movies/TV: apply any cached scores instantly, then enrich the rest
    if (t !== 'books') {
      const mediaType = t === 'movies' ? 'movie' : 'tv';
      // Show immediately with whatever scores we have cached
      applyStoredScores(result, mediaType);
      setItems([...result]);
      setLoading(false);
      // Then enrich remaining items (skips already-cached ones internally)
      const enriched = await enrichItemsWithRatings(result, mediaType);
      setItems(enriched);
    } else {
      setItems(result);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab, genre);
  }, [tab, genre, fetchData]);

  // Sync tab & genre to URL search params
  useEffect(() => {
    const params = { tab };
    if (genre != null) params.genre = genre;
    setSearchParams(params, { replace: true });
  }, [tab, genre, setSearchParams]);

  const handleTabChange = (t) => {
    setTab(t);
    setGenre(null);
  };

  const genres = tab === 'movies' ? MOVIE_GENRES : tab === 'shows' ? TV_GENRES : BOOK_GENRES;
  const mediaType = tab === 'movies' ? 'movie' : tab === 'shows' ? 'tv' : 'book';

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-gold" />
          <h1 className="text-3xl font-black">Top 100</h1>
        </div>
        <p className="text-white/40 text-sm">The highest rated of all time.</p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'movies', label: 'Movies', icon: Film },
          { key: 'shows', label: 'TV Shows', icon: Tv },
          { key: 'books', label: 'Books', icon: BookOpen },
        ].map(t => (
          <button key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? 'bg-accent text-white'
                : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Genre Filter Pills */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        {genres.map(g => (
          <button key={g.id ?? 'all'}
            onClick={() => setGenre(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              genre === g.id
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/[0.02] text-white/35 hover:text-white/60 hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          <SkeletonRow title />
          <SkeletonRow title />
          <SkeletonRow title />
          <SkeletonRow title />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No results for this genre</p>
          <p className="text-sm mt-1">Try a different category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const title = item.title || item.name;
            const isBook = mediaType === 'book';
            const year = isBook
              ? (item.first_publish_year || '').toString()
              : (item.release_date || item.first_air_date || '').slice(0, 4);
            const poster = isBook
              ? item.poster_path
              : item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;

            return (
              <RankedItem
                key={item.id || item.key || i}
                rank={i + 1}
                item={item}
                title={title}
                year={year}
                poster={poster}
                mediaType={mediaType}
                navigate={navigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RankedItem({ rank, item, title, year, poster, mediaType, navigate }) {
  const rankColor = rank === 1 ? 'text-gold' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/20';
  const isBook = mediaType === 'book';
  const rating = isBook ? item.rating : (item.unified_rating ?? item.vote_average);
  const ratingLabel = isBook ? '' : (item.unified_rating != null ? '' : 'TMDB');

  const handleClick = () => {
    if (isBook) {
      const workKey = item.key?.replace('/works/', '') || '';
      if (workKey) navigate(`/details/book/${workKey}`);
    } else {
      navigate(`/details/${mediaType}/${item.id}`);
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer group"
      onClick={handleClick}
    >
      {/* Rank */}
      <span className={`text-2xl sm:text-3xl font-black w-10 sm:w-14 text-center flex-shrink-0 ${rankColor}`}>
        {rank}
      </span>

      {/* Poster */}
      {poster ? (
        <img src={poster} alt={title} className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform object-cover aspect-[2/3]" />
      ) : (
        <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-dark-600 flex-shrink-0 aspect-[2/3]" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base truncate">{title}</p>
        <p className="text-xs text-white/30 mt-0.5">
          {year}
          {isBook && item.author ? ` · ${item.author}` : ''}
          {!isBook && item.genres?.length > 0 ? ` · ${item.genres.map(g => g.name).join(', ')}` : ''}
        </p>
        {isBook && (item.already_read > 0 || item.want_to_read > 0) && (
          <p className="text-[10px] text-white/20 mt-0.5 flex items-center gap-1">
            <Users size={10} />
            {((item.already_read || 0) + (item.want_to_read || 0) + (item.currently_reading || 0)).toLocaleString()} readers
          </p>
        )}
      </div>

      {/* Rating */}
      {rating > 0 && (
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-gold fill-gold" />
            <span className="text-sm font-bold">{Number(rating).toFixed(1)}</span>
            <span className="text-[10px] text-white/20 hidden sm:inline">/ 10</span>
          </div>
          {ratingLabel && <span className="text-[9px] text-white/15 mt-0.5">{ratingLabel}</span>}
        </div>
      )}
    </div>
  );
}

export default Top100;
