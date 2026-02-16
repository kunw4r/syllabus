import React, { useEffect, useState, useCallback } from 'react';
import { Search, X, Book, Star } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import ScrollRow from '../components/ScrollRow';
import { SkeletonRow } from '../components/SkeletonCard';
import { getTrendingBooks, getBooksBySubject, searchBooks } from '../services/api';

const SUBJECTS = [
  { key: 'fiction', name: 'Fiction' },
  { key: 'literary fiction', name: 'Literary Fiction' },
  { key: 'science fiction', name: 'Science Fiction' },
  { key: 'fantasy', name: 'Fantasy' },
  { key: 'mystery', name: 'Mystery & Thriller' },
  { key: 'romance', name: 'Romance' },
  { key: 'horror', name: 'Horror' },
  { key: 'biography', name: 'Biography & Memoir' },
  { key: 'history', name: 'History' },
  { key: 'science', name: 'Science' },
  { key: 'philosophy', name: 'Philosophy' },
  { key: 'self-help', name: 'Self-Help' },
  { key: 'business', name: 'Business & Finance' },
  { key: 'poetry', name: 'Poetry' },
  { key: 'comics', name: 'Comics & Graphic Novels' },
  { key: 'true crime', name: 'True Crime' },
  { key: 'young adult fiction', name: 'Young Adult' },
  { key: 'children', name: "Children's Books" },
  { key: 'cooking', name: 'Cooking & Food' },
  { key: 'art', name: 'Art & Design' },
];

function Books() {
  const [trending, setTrending] = useState([]);
  const [subjectData, setSubjectData] = useState({});
  const [loadedSubjects, setLoadedSubjects] = useState(new Set());
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Load trending + first 4 subjects immediately
  useEffect(() => {
    async function loadInitial() {
      const [t, ...initialResults] = await Promise.all([
        getTrendingBooks(),
        ...SUBJECTS.slice(0, 4).map(s => getBooksBySubject(s.key)),
      ]);
      setTrending(t);
      setHeroLoaded(true);
      const sd = {};
      SUBJECTS.slice(0, 4).forEach((s, i) => { sd[s.key] = initialResults[i]; });
      setSubjectData(sd);
      setLoadedSubjects(new Set(SUBJECTS.slice(0, 4).map(s => s.key)));
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
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books by title, author..."
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
          {heroLoaded && hero && (
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-10 -mt-2 mb-10 h-[36vh] sm:h-[44vh] min-h-[260px] overflow-hidden rounded-b-3xl bg-gradient-to-br from-accent/20 via-dark-800 to-dark-900">
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 flex items-end">
                <div className="flex items-end gap-6 p-6 sm:p-10 w-full">
                  {hero.poster_path && (
                    <img src={hero.poster_path} alt={hero.title} className="h-36 sm:h-48 rounded-xl shadow-2xl flex-shrink-0" />
                  )}
                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-2 text-accent text-xs font-semibold mb-2">
                      <Book size={14} /> NEW & NOTEWORTHY
                    </div>
                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight line-clamp-2">{hero.title}</h1>
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

          {/* Trending Row */}
          {trending.length > 0 && (
            <ScrollRow title="Trending Now">
              {trending.map((b, i) => <div key={b.key || i} className="flex-shrink-0 w-[150px]"><MediaCard item={b} mediaType="book" /></div>)}
            </ScrollRow>
          )}

          {/* Subject/Genre Rows — library-style categories */}
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
