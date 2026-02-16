import React, { useEffect, useState } from 'react';
import { getLibrary, removeFromLibrary, updateLibraryItem } from '../services/api';
import { Trash2, Star, MessageSquare, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function MyLibrary() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const toast = useToast();

  const loadLibrary = async () => {
    const filters = {};
    if (typeFilter !== 'all') filters.media_type = typeFilter;
    if (filter !== 'all') filters.status = filter;
    const data = await getLibrary(filters);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { loadLibrary(); }, [filter, typeFilter]);

  const handleRemove = async (id) => {
    const item = items.find(i => i.id === id);
    await removeFromLibrary(id);
    toast(`Removed "${item?.title || 'item'}" from library`, 'success');
    loadLibrary();
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateLibraryItem(id, { status: newStatus });
    loadLibrary();
  };

  const openReview = (item) => {
    setReviewItem(item);
    setReviewText(item.review || '');
    setUserRating(item.user_rating || 0);
  };

  const saveReview = async () => {
    await updateLibraryItem(reviewItem.id, { user_rating: userRating || null, review: reviewText });
    setReviewItem(null);
    loadLibrary();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-dark-500 border-t-accent rounded-full animate-spin" /></div>;

  const typeLabels = { all: 'All', movie: 'Movies', tv: 'TV Shows', book: 'Books' };
  const statusLabels = { all: 'All', want: 'Want', watching: 'In Progress', finished: 'Finished' };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Library</h1>

      {/* Type filter */}
      <div className="flex gap-2 mb-3">
        {Object.entries(typeLabels).map(([key, label]) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
              typeFilter === key ? 'bg-accent border-accent text-white' : 'border-white/10 text-white/50 hover:border-accent/50 hover:text-white'
            }`}>{label}</button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-8">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
              filter === key ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/40 hover:border-white/15 hover:text-white/60'
            }`}>{label}</button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <h3 className="text-lg font-medium text-white/60 mb-2">Nothing here yet</h3>
          <p className="text-sm">Browse movies, TV shows, or books and add them to your library</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {items.map(item => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden bg-dark-700/50 border border-white/5 transition-all duration-300 hover:border-white/10">
              {item.poster_path ? (
                <img src={item.poster_path} alt={item.title} loading="lazy" className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] bg-dark-600 flex items-center justify-center text-white/30 text-xs p-4 text-center">
                  {item.title}
                </div>
              )}

              {/* External rating */}
              {item.external_rating > 0 && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-semibold">
                  <Star size={11} className="text-gold fill-gold" />
                  {Number(item.external_rating).toFixed(1)}
                </div>
              )}

              {/* User rating */}
              {item.user_rating && (
                <div className="absolute top-3 left-3 bg-accent/80 backdrop-blur-md rounded-lg px-2 py-1 text-xs font-bold">
                  {item.user_rating}/10
                </div>
              )}

              {/* Action buttons on hover */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button onClick={() => openReview(item)} title="Review"
                  className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center hover:bg-accent transition-colors">
                  <MessageSquare size={16} />
                </button>
                <button onClick={() => handleRemove(item.id)} title="Remove"
                  className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-3">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    className="bg-dark-600 text-white/70 border border-white/10 rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-accent/50"
                  >
                    <option value="want">Want</option>
                    <option value="watching">In Progress</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>
                {item.review && (
                  <p className="text-xs text-white/30 mt-2 line-clamp-2 italic">"{item.review}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewItem(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Review</h3>
              <button onClick={() => setReviewItem(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-white/60 mb-4">{reviewItem.title}</p>

            {/* Star rating */}
            <div className="mb-4">
              <label className="text-xs text-white/40 block mb-2">Your Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setUserRating(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                      n <= userRating ? 'bg-accent text-white' : 'bg-dark-600 text-white/30 hover:bg-dark-500'
                    }`}>{n}</button>
                ))}
              </div>
            </div>

            {/* Review text */}
            <div className="mb-6">
              <label className="text-xs text-white/40 block mb-2">Your Thoughts</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think? No spoilers..."
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <button onClick={saveReview} className="btn-primary w-full">Save Review</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyLibrary;
