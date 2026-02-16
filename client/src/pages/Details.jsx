import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Plus } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { getMovieDetails, getTVDetails, addToLibrary } from '../services/api';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

function Details() {
  const { mediaType, id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const fetcher = mediaType === 'movie' ? getMovieDetails : getTVDetails;
      const result = await fetcher(id);
      setData(result);
      setLoading(false);
    }
    load();
  }, [mediaType, id]);

  const handleAdd = async () => {
    const title = data.title || data.name;
    try {
      await addToLibrary({
        tmdb_id: data.id,
        media_type: mediaType,
        title,
        poster_path: data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
        overview: data.overview,
        rating: data.vote_average,
        genres: data.genres?.map(g => g.name).join(', '),
        release_date: data.release_date || data.first_air_date,
      });
      alert(`Added "${title}" to your library!`);
    } catch {
      alert('Could not add — might already be in your library.');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Not found</h3></div>;

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || '').slice(0, 4);
  const genres = data.genres?.map(g => g.name).join(', ');
  const recommendations = data.recommendations?.results?.slice(0, 10) || [];

  return (
    <div className="detail-page">
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Back
      </button>

      <div className="detail-hero">
        {data.poster_path ? (
          <img src={`${TMDB_IMG}${data.poster_path}`} alt={title} className="detail-poster" />
        ) : (
          <div className="detail-poster" style={{ background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 250, aspectRatio: '2/3', borderRadius: 'var(--radius)' }}>
            No Poster
          </div>
        )}

        <div className="detail-info">
          <h1>{title}</h1>
          <p className="meta">
            {year} {genres && `· ${genres}`}
            {data.runtime && ` · ${data.runtime} min`}
            {data.number_of_seasons && ` · ${data.number_of_seasons} season${data.number_of_seasons > 1 ? 's' : ''}`}
          </p>

          {data.vote_average > 0 && (
            <p className="meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={16} fill="var(--gold)" color="var(--gold)" />
              {data.vote_average.toFixed(1)} / 10
              <span style={{ fontSize: '0.8rem' }}>({data.vote_count?.toLocaleString()} votes)</span>
            </p>
          )}

          <p className="overview">{data.overview}</p>

          <div className="detail-actions">
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Add to Library
            </button>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 48 }}>
            <h2>You Might Also Like</h2>
          </div>
          <div className="media-grid">
            {recommendations.map(r => (
              <MediaCard key={r.id} item={r} mediaType={mediaType} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Details;
