import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Plus, Check } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { getMovieDetails, getTVDetails, addToLibrary } from '../services/api';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';

function Details() {
  const { mediaType, id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

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
        external_rating: data.vote_average,
        genres: data.genres?.map(g => g.name).join(', '),
        release_date: data.release_date || data.first_air_date,
      });
      setAdded(true);
    } catch {
      alert('Could not add — might already be in your library.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-white/40"><h3 className="text-lg">Not found</h3></div>;

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || '').slice(0, 4);
  const genres = data.genres?.map(g => g.name).join(', ');
  const recommendations = data.recommendations?.results?.slice(0, 10) || [];

  return (
    <div>
      {/* Backdrop */}
      {data.backdrop_path && (
        <div className="absolute top-0 left-0 w-full h-80 -z-10 overflow-hidden">
          <img src={`${TMDB_BACKDROP}${data.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
        </div>
      )}

      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Poster */}
        {data.poster_path ? (
          <img src={`${TMDB_IMG}${data.poster_path}`} alt={title}
            className="w-64 rounded-2xl shadow-2xl shadow-black/50 flex-shrink-0" />
        ) : (
          <div className="w-64 aspect-[2/3] rounded-2xl bg-dark-700 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
            No Poster
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>

          <p className="text-white/40 text-sm mb-4">
            {year} {genres && `· ${genres}`}
            {data.runtime && ` · ${data.runtime} min`}
            {data.number_of_seasons && ` · ${data.number_of_seasons} season${data.number_of_seasons > 1 ? 's' : ''}`}
          </p>

          {data.vote_average > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5">
                <Star size={18} className="text-gold fill-gold" />
                <span className="text-lg font-semibold">{data.vote_average.toFixed(1)}</span>
                <span className="text-white/30 text-sm">/ 10</span>
              </div>
              <div className="text-xs text-white/30">
                <p className="font-medium text-white/50">TMDB Rating</p>
                {data.vote_count && (
                  <p>{data.vote_count.toLocaleString()} votes</p>
                )}
              </div>
            </div>
          )}

          <p className="text-white/60 leading-relaxed mb-8 max-w-2xl">{data.overview}</p>

          <button onClick={handleAdd} disabled={added}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              added ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'btn-primary'
            }`}>
            {added ? <><Check size={18} /> Added to Library</> : <><Plus size={18} /> Add to Library</>}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {recommendations.map(r => (
              <MediaCard key={r.id} item={r} mediaType={mediaType} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Details;
