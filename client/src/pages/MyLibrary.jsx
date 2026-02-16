import React, { useEffect, useState } from 'react';
import { getLibrary, removeFromLibrary, updateLibraryItem } from '../services/api';
import { Trash2, Star } from 'lucide-react';

const STATUSES = ['want', 'watching', 'finished'];

function MyLibrary() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

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
    if (window.confirm('Remove from library?')) {
      await removeFromLibrary(id);
      loadLibrary();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateLibraryItem(id, { status: newStatus });
    loadLibrary();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="section-header"><h2>My Library</h2></div>

      <div className="tabs" style={{ marginBottom: 8 }}>
        {['all', 'movie', 'tv', 'book'].map(t => (
          <button key={t} className={`tab ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'All' : t === 'tv' ? 'TV Shows' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="tabs">
        {['all', ...STATUSES].map(s => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s === 'want' ? 'Want to Watch/Read' : s === 'watching' ? 'In Progress' : 'Finished'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Browse movies, TV shows, or books and add them to your library</p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map(item => (
            <div key={item.id} className="media-card" style={{ cursor: 'default' }}>
              {item.poster_path ? (
                <img src={item.poster_path} alt={item.title} loading="lazy" />
              ) : (
                <div style={{ aspectRatio: '2/3', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12, textAlign: 'center' }}>
                  {item.title}
                </div>
              )}

              {item.rating && (
                <div className="rating-badge">
                  <Star size={12} className="star" fill="var(--gold)" />
                  {Number(item.rating).toFixed(1)}
                </div>
              )}

              <div className="card-info">
                <div className="card-title">{item.title}</div>
                <div className="card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    <option value="want">Want</option>
                    <option value="watching">In Progress</option>
                    <option value="finished">Finished</option>
                  </select>
                  <button onClick={() => handleRemove(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 4 }}
                    title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyLibrary;
