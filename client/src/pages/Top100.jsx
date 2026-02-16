import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Trophy, Film, Tv } from 'lucide-react';
import { SkeletonRow } from '../components/SkeletonCard';
import { getTop100Movies, getTop100TV } from '../services/api';

function Top100() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, t] = await Promise.all([getTop100Movies(), getTop100TV()]);
      setMovies(m);
      setShows(t);
      setLoading(false);
    }
    load();
  }, []);

  const items = tab === 'movies' ? movies : shows;
  const mediaType = tab === 'movies' ? 'movie' : 'tv';

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-gold" />
          <h1 className="text-3xl font-black">Top 100</h1>
        </div>
        <p className="text-white/40 text-sm">The highest rated of all time, ranked by TMDB community ratings.</p>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab('movies')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === 'movies'
              ? 'bg-accent text-white'
              : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
          }`}
        >
          <Film size={16} /> Movies
        </button>
        <button
          onClick={() => setTab('shows')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === 'shows'
              ? 'bg-accent text-white'
              : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
          }`}
        >
          <Tv size={16} /> TV Shows
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <SkeletonRow title />
          <SkeletonRow title />
          <SkeletonRow title />
          <SkeletonRow title />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || '').slice(0, 4);
            const poster = item.poster_path
              ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
              : null;

            return (
              <RankedItem
                key={item.id}
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

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer group"
      onClick={() => navigate(`/details/${mediaType}/${item.id}`)}
    >
      {/* Rank */}
      <span className={`text-2xl sm:text-3xl font-black w-10 sm:w-14 text-center flex-shrink-0 ${rankColor}`}>
        {rank}
      </span>

      {/* Poster */}
      {poster ? (
        <img src={poster} alt={title} className="h-16 sm:h-20 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform" />
      ) : (
        <div className="h-16 sm:h-20 w-11 sm:w-14 rounded-lg bg-dark-600 flex-shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base truncate">{title}</p>
        <p className="text-xs text-white/30 mt-0.5">{year}{item.genres?.length > 0 ? ` · ${item.genres.map(g => g.name).join(', ')}` : ''}</p>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Star size={14} className="text-gold fill-gold" />
        <span className="text-sm font-bold">{item.vote_average?.toFixed(1)}</span>
        <span className="text-[10px] text-white/20 hidden sm:inline">/ 10</span>
      </div>
    </div>
  );
}

export default Top100;
