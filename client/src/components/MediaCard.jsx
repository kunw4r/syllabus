import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { addToLibrary } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w780';

function MediaCard({ item, mediaType = 'movie' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const title = item.title || item.name;
  const poster = item.poster_path
    ? (item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMG}${item.poster_path}`)
    : null;
  const rating = item.vote_average || item.rating;
  const year = (item.release_date || item.first_air_date || item.first_publish_year || '').toString().slice(0, 4);
  const type = item.media_type || mediaType;

  const handleClick = () => {
    if (type === 'book') {
      const workKey = item.key?.replace('/works/', '') || '';
      if (workKey) navigate(`/details/book/${workKey}`);
      return;
    }
    const id = item.id || item.tmdb_id;
    navigate(`/details/${type}/${id}`);
  };

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (!user) return toast('Please log in first', 'error');
    try {
      await addToLibrary({
        tmdb_id: type !== 'book' ? item.id : null,
        openlibrary_key: type === 'book' ? item.key : null,
        media_type: type,
        title,
        poster_path: poster,
        overview: item.overview || '',
        external_rating: rating || null,
        genres: item.genre_ids ? item.genre_ids.join(',') : '',
        release_date: item.release_date || item.first_air_date || '',
      });
      toast(`Added "${title}" to your library!`, 'success');
    } catch {
      toast('Could not add — might already be in your library.', 'error');
    }
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(233,69,96,0.12)] hover:border-white/10"
      onClick={handleClick}
    >
      {poster ? (
        <img src={poster} alt={title} loading="lazy" className="w-full aspect-[2/3] object-cover" />
      ) : (
        <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-4 text-center">
          {title}
        </div>
      )}

      {rating > 0 && (
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-semibold">
          <Star size={11} className="text-gold fill-gold" />
          {Number(rating).toFixed(1)}
        </div>
      )}

      <button
        onClick={handleAdd}
        title="Add to library"
        className="absolute bottom-16 right-3 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 hover:bg-accent-hover"
      >
        <Plus size={18} />
      </button>

      <div className="p-3">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-white/40 mt-1">
          {year}{type === 'book' && item.author ? ` · ${item.author}` : ''}
        </p>
      </div>
    </div>
  );
}

export default MediaCard;
