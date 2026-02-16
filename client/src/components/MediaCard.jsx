import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { addToLibrary } from '../services/api';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

function MediaCard({ item, mediaType = 'movie' }) {
  const navigate = useNavigate();

  const title = item.title || item.name;
  const poster = item.poster_path
    ? (item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMG}${item.poster_path}`)
    : null;
  const rating = item.vote_average || item.rating;
  const year = (item.release_date || item.first_air_date || item.first_publish_year || '').toString().slice(0, 4);
  const type = item.media_type || mediaType;

  const handleClick = () => {
    if (type === 'book') return; // books don't have a detail page yet
    const id = item.id || item.tmdb_id;
    navigate(`/details/${type}/${id}`);
  };

  const handleAdd = async (e) => {
    e.stopPropagation();
    try {
      await addToLibrary({
        tmdb_id: type !== 'book' ? item.id : null,
        openlibrary_key: type === 'book' ? item.key : null,
        media_type: type,
        title,
        poster_path: poster,
        overview: item.overview || '',
        rating: rating || null,
        genres: item.genre_ids ? item.genre_ids.join(',') : '',
        release_date: item.release_date || item.first_air_date || '',
      });
      alert(`Added "${title}" to your library!`);
    } catch {
      alert('Could not add — might already be in your library.');
    }
  };

  return (
    <div className="media-card" onClick={handleClick}>
      {poster ? (
        <img src={poster} alt={title} loading="lazy" />
      ) : (
        <div style={{ aspectRatio: '2/3', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12, textAlign: 'center' }}>
          {title}
        </div>
      )}

      {rating > 0 && (
        <div className="rating-badge">
          <Star size={12} className="star" fill="var(--gold)" />
          {Number(rating).toFixed(1)}
        </div>
      )}

      <button className="card-add-btn" onClick={handleAdd} title="Add to library">
        <Plus size={18} />
      </button>

      <div className="card-info">
        <div className="card-title">{title}</div>
        <div className="card-meta">{year}{type === 'book' && item.author ? ` · ${item.author}` : ''}</div>
      </div>
    </div>
  );
}

export default MediaCard;
