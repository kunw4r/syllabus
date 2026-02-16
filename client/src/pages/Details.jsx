import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Plus, Check, ExternalLink, BookOpen, Users, BookCopy, ShoppingCart, BookMarked, Eye, CheckCircle2, Play, Award, Clapperboard, PenLine, DollarSign, Globe, Film, Info } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { getMovieDetails, getTVDetails, getOMDbRatings, getMALRating, getBookDetails, addToLibrary } from '../services/api';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w780';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/original';
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

// Map provider names → their direct search/browse URLs
const PROVIDER_URLS = {
  'Netflix': (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  'Amazon Prime Video': (title) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  'Amazon Video': (title) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  'Disney Plus': (title) => `https://www.disneyplus.com/search/${encodeURIComponent(title)}`,
  'Apple TV': (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  'Apple TV Plus': (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  'Stan': (title) => `https://www.stan.com.au/search?q=${encodeURIComponent(title)}`,
  'Binge': (title) => `https://binge.com.au/search?q=${encodeURIComponent(title)}`,
  'Paramount Plus': (title) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`,
  'Paramount+ Amazon Channel': (title) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  'Foxtel Now': (title) => `https://www.foxtel.com.au/now/search.html?q=${encodeURIComponent(title)}`,
  'Hulu': (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
  'HBO Max': (title) => `https://play.max.com/search?q=${encodeURIComponent(title)}`,
  'Max': (title) => `https://play.max.com/search?q=${encodeURIComponent(title)}`,
  'Peacock': (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  'Crunchyroll': (title) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
  'Google Play Movies': (title) => `https://play.google.com/store/search?q=${encodeURIComponent(title)}&c=movies`,
  'YouTube': (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
  'Microsoft Store': (title) => `https://www.microsoft.com/en-au/search/shop/movies-tv?q=${encodeURIComponent(title)}`,
};

function getProviderUrl(providerName, title, fallbackLink) {
  for (const [key, urlFn] of Object.entries(PROVIDER_URLS)) {
    if (providerName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(providerName.toLowerCase())) {
      return urlFn(title);
    }
  }
  return fallbackLink || '#';
}

/* ─────────────────────────────────────────────────── */
/*  Book Detail View                                    */
/* ─────────────────────────────────────────────────── */
function BookDetails({ workKey, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
      const result = await getBookDetails(key);
      setData(result);
      setLoading(false);
    }
    load();
  }, [workKey]);

  const handleAdd = async () => {
    try {
      await addToLibrary({
        openlibrary_key: data.key,
        media_type: 'book',
        title: data.title,
        poster_path: data.poster_path,
        overview: data.description?.slice(0, 500) || '',
        external_rating: data.rating,
      });
      setAdded(true);
    } catch { alert('Could not add — might already be in your library.'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-white/40"><h3 className="text-lg">Book not found</h3></div>;

  const totalReaders = (data.want_to_read || 0) + (data.currently_reading || 0) + (data.already_read || 0);
  const searchQ = encodeURIComponent(`${data.title} book`);

  return (
    <div>
      {/* Gradient backdrop for books */}
      <div className="absolute top-0 left-0 w-full h-80 -z-10 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-accent/15 via-dark-800 to-dark-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900" />
      </div>

      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        {data.poster_path ? (
          <img src={data.poster_path} alt={data.title} className="w-48 sm:w-56 md:w-64 rounded-2xl shadow-2xl shadow-black/50 flex-shrink-0 bg-dark-700 aspect-[2/3] object-cover" />
        ) : (
          <div className="w-48 sm:w-56 md:w-64 aspect-[2/3] rounded-2xl bg-dark-700 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
            <BookOpen size={48} className="text-white/10" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>

          {/* Author(s) */}
          {data.authors?.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {data.authors.map((author, i) => (
                <a
                  key={author.key || i}
                  href={`https://www.google.com/search?q=${encodeURIComponent(author.name + ' author')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  {author.photo ? (
                    <img src={author.photo} alt={author.name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-white/30 text-xs font-bold border border-white/10">
                      {author.name?.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-white/60 hover:text-accent transition-colors">
                    {author.name}
                  </span>
                  <ExternalLink size={10} className="text-white/20" />
                </a>
              ))}
            </div>
          )}

          <p className="text-white/40 text-sm mb-5">
            {data.first_publish_date && `First published ${data.first_publish_date}`}
            {data.edition_count > 0 && ` · ${data.edition_count} editions`}
          </p>

          {/* Rating + Stats */}
          <div className="flex flex-wrap items-start gap-3 mb-6">
            {data.rating && (
              <a href={`https://openlibrary.org${data.key}`} target="_blank" rel="noopener noreferrer"
                className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-accent/20 transition-colors">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star size={16} className="text-gold fill-gold" />
                  <span className="text-xl font-black">{data.rating}</span>
                  <span className="text-white/30 text-xs">/ 10</span>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Open Library</p>
                {data.ratings_count > 0 && <p className="text-[9px] text-white/20">{data.ratings_count.toLocaleString()} ratings</p>}
              </a>
            )}

            {totalReaders > 0 && (
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users size={14} className="text-accent" />
                  <span className="text-lg font-bold">{totalReaders.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-white/30">Readers</p>
              </div>
            )}

            {data.edition_count > 0 && (
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BookCopy size={14} className="text-white/50" />
                  <span className="text-lg font-bold">{data.edition_count}</span>
                </div>
                <p className="text-[10px] text-white/30">Editions</p>
              </div>
            )}
          </div>

          {/* Reader breakdown */}
          {totalReaders > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-white/40 mb-4">
              {data.want_to_read > 0 && <span className="flex items-center gap-1.5"><BookMarked size={12} className="text-accent/70" /> {data.want_to_read.toLocaleString()} want to read</span>}
              {data.currently_reading > 0 && <span className="flex items-center gap-1.5"><Eye size={12} className="text-blue-400/70" /> {data.currently_reading.toLocaleString()} reading now</span>}
              {data.already_read > 0 && <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-400/70" /> {data.already_read.toLocaleString()} have read</span>}
            </div>
          )}
          {totalReaders > 0 && (
            <p className="text-[10px] text-white/20 mb-6">Reader data via Open Library</p>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-white/60 leading-relaxed mb-6 max-w-2xl whitespace-pre-line">{data.description}</p>
          )}

          {/* Subjects */}
          {data.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {data.subjects.map(s => (
                <span key={s} className="text-xs bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-white/50">{s}</span>
              ))}
            </div>
          )}

          {/* Buy / Read Links */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Where to Get</h3>
            <div className="flex flex-wrap gap-2">
              <a href={`https://openlibrary.org${data.key}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
                <BookOpen size={16} className="text-white/60" />
                <span className="text-xs font-medium">Read Free</span>
                <ExternalLink size={10} className="text-white/30" />
              </a>
              <a href={`https://www.amazon.com/s?k=${searchQ}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#ff9900]/10 border border-[#ff9900]/20 rounded-lg px-4 py-2.5 hover:bg-[#ff9900]/20 transition-colors">
                <ShoppingCart size={16} className="text-[#ff9900]" />
                <span className="text-xs font-medium text-[#ff9900]">Amazon</span>
                <ExternalLink size={10} className="text-[#ff9900]/40" />
              </a>
              <a href={`https://www.bookdepository.com/search?searchTerm=${searchQ}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
                <ShoppingCart size={16} className="text-white/60" />
                <span className="text-xs font-medium">Book Depository</span>
                <ExternalLink size={10} className="text-white/30" />
              </a>
              <a href={`https://www.goodreads.com/search?q=${searchQ}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 hover:bg-white/[0.08] transition-colors">
                <Star size={16} className="text-white/60" />
                <span className="text-xs font-medium">Goodreads</span>
                <ExternalLink size={10} className="text-white/30" />
              </a>
            </div>
          </div>

          <button onClick={handleAdd} disabled={added}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              added ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'btn-primary'
            }`}>
            {added ? <><Check size={18} /> Added to Library</> : <><Plus size={18} /> Add to Library</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Movie / TV Detail View                              */
/* ─────────────────────────────────────────────────── */
function Details() {
  const { mediaType, id } = useParams();
  const navigate = useNavigate();

  // Book detail route
  if (mediaType === 'book') {
    return <BookDetails workKey={id} navigate={navigate} />;
  }

  return <MovieTVDetails mediaType={mediaType} id={id} navigate={navigate} />;
}

function MovieTVDetails({ mediaType, id, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [extRatings, setExtRatings] = useState(null);
  const [malData, setMalData] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setExtRatings(null);
      setMalData(null);
      const fetcher = mediaType === 'movie' ? getMovieDetails : getTVDetails;
      const result = await fetcher(id);
      setData(result);
      setLoading(false);

      const imdbId = result.external_ids?.imdb_id || result.imdb_id;
      if (imdbId) {
        getOMDbRatings(imdbId).then(r => setExtRatings(r));
      }

      // Fetch MAL rating for anime
      const anime = result.original_language === 'ja' &&
        result.genres?.some(g => g.id === 16);
      if (anime) {
        const t = result.name || result.title;
        getMALRating(t).then(r => setMalData(r));
      }
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
  const imdbId = extRatings?.imdb_id || data.external_ids?.imdb_id;

  // Find best trailer (prefer Official Trailer, then any Trailer, then Teaser)
  const trailer = (() => {
    const vids = (data.videos?.results || []).filter(v => v.site === 'YouTube');
    return vids.find(v => v.type === 'Trailer' && v.name.toLowerCase().includes('official'))
      || vids.find(v => v.type === 'Trailer')
      || vids.find(v => v.type === 'Teaser')
      || vids[0]
      || null;
  })();

  // Streaming providers (AU first, fallback to US)
  const wpData = data['watch/providers']?.results;
  const providers = wpData?.AU || wpData?.US || null;
  const streamingProviders = providers?.flatrate || [];
  const rentProviders = providers?.rent || [];
  const buyProviders = providers?.buy || [];

  // Detect anime for Crunchyroll link + MAL
  const isAnime = data.original_language === 'ja' && data.genres?.some(g => g.id === 16);

  // Average: anime = IMDb + MAL, non-anime = IMDb + RT
  const computeAverage = () => {
    const scores = [];
    if (extRatings?.imdb?.score) {
      const v = parseFloat(extRatings.imdb.score);
      if (!isNaN(v)) scores.push(v);
    }
    if (isAnime) {
      if (malData?.score) scores.push(malData.score);
    } else {
      if (extRatings?.rt?.score) {
        const v = parseInt(extRatings.rt.score);
        if (!isNaN(v)) scores.push(v / 10);
      }
    }
    if (scores.length < 2) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };
  const avgScore = computeAverage();

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
        {/* Poster column — sticky on desktop */}
        <div className="flex-shrink-0 md:sticky md:top-8 md:self-start w-48 sm:w-56 md:w-64 lg:w-72 xl:w-80">
          {data.poster_path ? (
            <img src={`${TMDB_IMG}${data.poster_path}`} alt={title}
              className="w-full rounded-2xl shadow-2xl shadow-black/50 aspect-[2/3] object-cover" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-2xl bg-dark-700 flex items-center justify-center text-white/30 text-sm">
              No Poster
            </div>
          )}

          {/* ── Quick Facts card ── */}
          <div className="hidden md:block mt-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            {data.tagline && (
              <p className="text-xs italic text-white/40 leading-relaxed">"{data.tagline}"</p>
            )}
            {extRatings?.director && (
              <div className="flex items-start gap-2.5">
                <Clapperboard size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Director</p>
                  <p className="text-xs text-white/70">{extRatings.director}</p>
                </div>
              </div>
            )}
            {extRatings?.writer && (
              <div className="flex items-start gap-2.5">
                <PenLine size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Writer</p>
                  <p className="text-xs text-white/70">{extRatings.writer}</p>
                </div>
              </div>
            )}
            {extRatings?.rated && (
              <div className="flex items-start gap-2.5">
                <Film size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Rated</p>
                  <p className="text-xs text-white/70">{extRatings.rated}</p>
                </div>
              </div>
            )}
            {extRatings?.awards && (
              <div className="flex items-start gap-2.5">
                <Award size={13} className="text-accent/60 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Awards</p>
                  <p className="text-xs text-white/70 leading-relaxed">{extRatings.awards}</p>
                </div>
              </div>
            )}
            {(extRatings?.boxOffice || data.budget > 0 || data.revenue > 0) && (
              <div className="flex items-start gap-2.5">
                <DollarSign size={13} className="text-green-400/60 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Box Office</p>
                  {data.budget > 0 && <p className="text-xs text-white/50">Budget: ${(data.budget / 1e6).toFixed(0)}M</p>}
                  {extRatings?.boxOffice && <p className="text-xs text-white/70">Gross: {extRatings.boxOffice}</p>}
                  {data.revenue > 0 && <p className="text-xs text-white/70">Revenue: ${(data.revenue / 1e6).toFixed(0)}M</p>}
                </div>
              </div>
            )}
            {extRatings?.country && (
              <div className="flex items-start gap-2.5">
                <Globe size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Country</p>
                  <p className="text-xs text-white/70">{extRatings.country}</p>
                </div>
              </div>
            )}
            {data.production_companies?.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Info size={13} className="text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Studio</p>
                  <p className="text-xs text-white/70">{data.production_companies.slice(0, 2).map(c => c.name).join(', ')}</p>
                </div>
              </div>
            )}
            {/* Shimmer while loading */}
            {!extRatings && data.external_ids?.imdb_id && (
              <div className="space-y-3 animate-pulse">
                {[1,2,3].map(i => (<div key={i} className="flex gap-2.5"><div className="w-3 h-3 bg-dark-600 rounded" /><div className="flex-1"><div className="h-2 w-10 bg-dark-600 rounded mb-1" /><div className="h-3 w-20 bg-dark-600 rounded" /></div></div>))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>

          <p className="text-white/40 text-sm mb-4">
            {year} {genres && `· ${genres}`}
            {data.runtime && ` · ${data.runtime} min`}
            {data.number_of_seasons && ` · ${data.number_of_seasons} season${data.number_of_seasons > 1 ? 's' : ''}`}
          </p>

          {/* ── Ratings ── */}
          <div className="flex flex-wrap items-start gap-3 mb-6">
            {/* Average Score */}
            {avgScore && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star size={16} className="text-gold fill-gold" />
                  <span className="text-xl font-black">{avgScore}</span>
                  <span className="text-white/30 text-xs">/ 10</span>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Average</p>
              </div>
            )}

            {/* IMDb — links to IMDb page */}
            {extRatings?.imdb && (
              <a href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noopener noreferrer"
                className="bg-[#f5c518]/[0.08] border border-[#f5c518]/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-[#f5c518]/[0.15] transition-colors cursor-pointer">
                <p className="text-lg font-bold text-[#f5c518]">{extRatings.imdb.score}</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">IMDb <ExternalLink size={8} /></p>
                {extRatings.imdb.votes && (
                  <p className="text-[9px] text-white/20">{extRatings.imdb.votes} votes</p>
                )}
              </a>
            )}

            {/* Rotten Tomatoes — links to RT search */}
            {extRatings?.rt && (
              <a href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer"
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-white/[0.08] transition-colors cursor-pointer">
                <p className="text-lg font-bold">
                  <span className={parseInt(extRatings.rt.score) >= 60 ? 'text-red-400' : 'text-green-400'}>
                    🍅 {extRatings.rt.score}
                  </span>
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">Rotten Tomatoes <ExternalLink size={8} /></p>
              </a>
            )}

            {/* MAL (anime only) */}
            {isAnime && malData?.score && (
              <a href={malData.url} target="_blank" rel="noopener noreferrer"
                className="bg-[#2e51a2]/10 border border-[#2e51a2]/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-[#2e51a2]/20 transition-colors">
                <p className="text-lg font-bold text-[#2e51a2]">{malData.score}</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">MAL <ExternalLink size={8} /></p>
                {malData.scored_by && (
                  <p className="text-[9px] text-white/20">{malData.scored_by.toLocaleString()} votes</p>
                )}
              </a>
            )}

            {/* Crunchyroll (anime only) */}
            {isAnime && (
              <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer"
                className="bg-[#f47521]/10 border border-[#f47521]/20 rounded-xl px-4 py-3 text-center min-w-[80px] hover:bg-[#f47521]/20 transition-colors">
                <p className="text-lg font-bold text-[#f47521]">CR</p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center justify-center gap-1">Crunchyroll <ExternalLink size={8} /></p>
              </a>
            )}

            {/* Loading shimmer */}
            {!extRatings && data.external_ids?.imdb_id && (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 text-center min-w-[80px] animate-pulse">
                <div className="h-5 w-12 bg-dark-600 rounded mx-auto mb-1" />
                <div className="h-2 w-8 bg-dark-600 rounded mx-auto" />
              </div>
            )}
          </div>

          <p className="text-white/60 leading-relaxed mb-6 max-w-2xl">{data.overview}</p>

          {/* ── Trailer ── */}
          {trailer && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Play size={14} /> Trailer
              </h3>
              <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-dark-700">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                  title={trailer.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <p className="text-[10px] text-white/20 mt-2">{trailer.name}</p>
            </div>
          )}

          {/* ── Cast ── */}
          {data.credits?.cast?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Cast</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {data.credits.cast.slice(0, 10).map(actor => (
                  <a
                    key={actor.id}
                    href={`https://www.google.com/search?q=${encodeURIComponent(actor.name + ' actor')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-[90px] group/actor text-center"
                  >
                    {actor.profile_path ? (
                      <img
                        src={`${TMDB_PROFILE}${actor.profile_path}`}
                        alt={actor.name}
                        className="w-[90px] h-[90px] rounded-full object-cover border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-colors"
                      />
                    ) : (
                      <div className="w-[90px] h-[90px] rounded-full bg-dark-600 flex items-center justify-center text-white/20 text-lg font-bold border-2 border-white/[0.06] group-hover/actor:border-accent/40 transition-colors">
                        {actor.name?.charAt(0)}
                      </div>
                    )}
                    <p className="text-xs font-medium mt-2 truncate group-hover/actor:text-accent transition-colors">{actor.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{actor.character}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Where to Watch ── */}
          {(streamingProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0) && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Where to Watch</h3>
              <div className="space-y-3">
                {streamingProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Stream</p>
                    <div className="flex flex-wrap gap-2">
                      {streamingProviders.map(p => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-6 h-6 rounded object-cover" />}
                          <span className="text-xs font-medium">{p.provider_name}</span>
                          <ExternalLink size={9} className="text-white/20" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {rentProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Rent</p>
                    <div className="flex flex-wrap gap-2">
                      {rentProviders.slice(0, 6).map(p => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-5 h-5 rounded object-cover" />}
                          <span className="text-xs text-white/60">{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {buyProviders.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 mb-1.5 uppercase">Buy</p>
                    <div className="flex flex-wrap gap-2">
                      {buyProviders.slice(0, 6).map(p => (
                        <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers?.link)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
                          {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-5 h-5 rounded object-cover" />}
                          <span className="text-xs text-white/60">{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

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
