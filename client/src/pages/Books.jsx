import React, { useEffect, useState, useCallback } from 'react';
import { Search, X, Book, Star } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import ScrollRow from '../components/ScrollRow';
import { SkeletonRow, SkeletonHero } from '../components/SkeletonCard';
import { getTrendingBooks, getBooksBySubject, searchBooks } from '../services/api';

const SUBJECTS = [
  { key: 'fiction', name: 'Fiction' },
  { key: 'science_fiction', name: 'Science Fiction' },
  { key: 'fantasy', name: 'Fantasy' },
  { key: 'mystery_and_detective_stories', name: 'Mystery & Thriller' },
  { key: 'romance', name: 'Romance' },
  { key: 'horror', name: 'Horror' },
  { key: 'biography', name: 'Biography' },
  { key: 'history', name: 'History' },
  { key: 'science', name: 'Science' },
  { key: 'philosophy', name: 'Philosophy' },
  { key: 'self-help', name: 'Self-Help' },
  { key: 'young_adult', name: 'Young Adult' },
];

function Books() {
  const [trending, setTrending] = useState([]);
  const [subjectData, setSubjectData] = useState({});
  const [loadedSubjects, setLoadedSubjects] = useState(new Set());
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Load trending + first 3 subjects immediately, rest lazily
  useEffect(() => {
    async function loadInitial() {
      const t = await getTrendingBooks();
      setTrending(t);
      setHeroLoaded(true);

      const initialSubjects = SUBJECTS.slice(0, 3);
      const results = await Promise.all(initialSubjects.map(s => getBooksBySubject(s.key)));
      const sd = {};
      initialSubjects.forEach((s, i) => { sd[s.key] = results[i]; });
      setSubjectData(sd);
      setLoadedSubjects(new Set(initialSubjects.map(s => s.key)));
    }
    loadInitial();
  }, []);

  // Lazy-load remaining subjects
  const loadSubject = useCallback(async (key) => {
    if (loadedSubjects.has(key)) return;
    setLoadedSubjects(prev => new Set([...prev, key]));
    const data = await getBooksBySubject(key);
    setSubjectData(prev => ({ ...prev, [key]: data }));
  }, [loadedSubjects]);

  // Intersection observer for lazy loading
  const observerRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const key = node.dataset.subject;
        if (key) loadSubject(key);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
  }, [loadSubject]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const data = await searchBooks(query);
    setResults(data);
  };

  const clearSearch = () => { setResults(null); setQuery(''); };

  const hero = trending[0];

  return (
    <div className="min-w-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-accent/40 transition-colors" />
        </div>
        {results && <button type="button" onClick={clearSearch} className="text-white/40 hover:text-white"><X size={18} /></button>}
      </form>

      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">Results for &ldquo;{query}&rdquo;</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
          </div>
          {results.length === 0 && (
            <div className="text-center py-20 text-white/40">
              <h3 className="text-lg font-medium text-white/60 mb-2">No books found</h3>
              <p className="text-sm">Try searching for a title or author</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Hero Banner */}
          {!heroLoaded ? <SkeletonHero /> : hero && (
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-10 -mt-2 mb-10 h-[40vh] sm:h-[50vh] min-h-[280px] overflow-hidden rounded-b-3xl bg-gradient-to-br from-accent/20 via-dark-800 to-dark-900">
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 flex items-end">
                <div className="flex items-end gap-6 p-6 sm:p-10 w-full">
                  {hero.poster_path && (
                    <img src={hero.poster_path} alt={hero.title} className="h-40 sm:h-52 rounded-xl shadow-2xl flex-shrink-0" />
                  )}
                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-2 text-accent text-xs font-semibold mb-2">
                      <Book size={14} /> TRENDING TODAY
                    </div>
                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight truncate">{hero.title}</h1>
                    <p className="text-white/50 text-sm mb-1">by {hero.author}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      {hero.rating && <span className="flex items-center gap-1 text-gold"><Star size={12} className="fill-gold" /> {hero.rating}</span>}
                      {hero.first_publish_year && <span>{hero.first_publish_year}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 Trending */}
          <div className="mb-10 min-w-0">
            <h2 className="text-[15px] font-semibold text-white/80 mb-4 uppercase tracking-wide">Trending Books</h2>
            {trending.length === 0 ? <SkeletonRow /> : (
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {trending.slice(0, 10).map((item, i) => (
                  <div key={item.key || i} className="flex-shrink-0 flex items-end group/card">
                    <span className="text-[5rem] sm:text-[7rem] font-black leading-none -mr-3 sm:-mr-4 select-none text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.08)' }}>{i + 1}</span>
                    {item.poster_path ? (
                      <img src={item.poster_path} alt={item.title} className="h-32 sm:h-40 rounded-xl relative z-10 shadow-lg group-hover/card:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-32 sm:h-40 w-24 sm:w-28 rounded-xl bg-dark-600 relative z-10 flex items-center justify-center text-white/30 text-xs p-2 text-center">{item.title}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject/Genre Rows */}
          {SUBJECTS.map(s => {
            const books = subjectData[s.key];
            const loaded = loadedSubjects.has(s.key);

            return (
              <div key={s.key} ref={loaded ? undefined : observerRef} data-subject={s.key}>
                {!loaded ? (
                  <SkeletonRow title={s.name} />
                ) : books?.length > 0 ? (
                  <ScrollRow title={s.name}>
                    {books.map((b, i) => <div key={b.key || i} className="flex-shrink-0 w-[150px]"><MediaCard item={b} mediaType="book" /></div>)}
                  </ScrollRow>
                ) : null}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default Books;
