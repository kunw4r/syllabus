import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, BookOpen, TrendingUp } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import BookCover from '../components/BookCover';
import ScrollRow from '../components/ScrollRow';
import { SkeletonRow, SkeletonHero } from '../components/SkeletonCard';
import { getTrendingBooks, getBooksBySubject, searchBooks } from '../services/api';

const SUBJECTS = [
  { key: 'fiction', name: 'Fiction' },
  { key: 'science fiction', name: 'Science Fiction' },
  { key: 'fantasy', name: 'Fantasy' },
  { key: 'mystery', name: 'Mystery & Thriller' },
  { key: 'romance', name: 'Romance' },
  { key: 'horror', name: 'Horror' },
  { key: 'biography', name: 'Biography & Memoir' },
  { key: 'history', name: 'History' },
  { key: 'science', name: 'Science' },
  { key: 'true crime', name: 'True Crime' },
  { key: 'philosophy', name: 'Philosophy' },
  { key: 'self-help', name: 'Self-Help' },
];

function Books() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [subjectData, setSubjectData] = useState({});
  const [loadedSubjects, setLoadedSubjects] = useState(new Set());
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // ── Load trending + first 2 subjects ──
  useEffect(() => {
    async function loadInitial() {
      try {
        const [t, ...subjectResults] = await Promise.all([
          getTrendingBooks(),
          ...SUBJECTS.slice(0, 2).map(s => getBooksBySubject(s.key)),
        ]);
        setTrending(t);
        const sd = {};
        SUBJECTS.slice(0, 2).forEach((s, i) => { sd[s.key] = subjectResults[i]; });
        setSubjectData(sd);
        setLoadedSubjects(new Set(SUBJECTS.slice(0, 2).map(s => s.key)));
      } catch (err) {
        console.error('[Books] Initial load failed:', err);
      }
      setInitialLoaded(true);
    }
    loadInitial();
  }, []);

  // ── Lazy-load subject rows on scroll ──
  const loadSubject = useCallback(async (key) => {
    if (loadedSubjects.has(key)) return;
    setLoadedSubjects(prev => new Set([...prev, key]));
    try {
      const books = await getBooksBySubject(key);
      setSubjectData(prev => ({ ...prev, [key]: books }));
    } catch {
      setSubjectData(prev => ({ ...prev, [key]: [] }));
    }
  }, [loadedSubjects]);

  const observerRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const key = node.dataset.subject;
        if (key) loadSubject(key);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
  }, [loadSubject]);

  // ── Search ──
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchBooks(query);
    setResults(data);
    setSearching(false);
  };

  const clearSearch = () => { setResults(null); setQuery(''); };

  const hero = trending[0];

  const navigateToBook = (book) => {
    const workKey = book.key?.replace('/works/', '') || '';
    if (workKey) navigate(`/details/book/${workKey}`);
  };

  // ── Loading skeleton ──
  if (!initialLoaded) return (
    <div className="min-w-0">
      <SkeletonHero />
      <SkeletonRow title />
      <SkeletonRow title />
    </div>
  );

  return (
    <div className="min-w-0">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-accent/40 transition-colors"
          />
        </div>
        <button type="submit" disabled={searching}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
          {searching
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Search size={14} />}
          Search
        </button>
        {results && (
          <button type="button" onClick={clearSearch} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </form>

      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">Results for &ldquo;{query}&rdquo;</h2>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {results.map((b, i) => <MediaCard key={b.key || i} item={b} mediaType="book" />)}
            </div>
          ) : (
            <div className="text-center py-20 text-white/40">
              <BookOpen size={40} className="mx-auto mb-3 text-white/15" />
              <h3 className="text-lg font-medium text-white/60 mb-2">No books found</h3>
              <p className="text-sm">Try a different title, author, or ISBN</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Hero Banner */}
          {hero && (
            <div
              className="relative -mx-4 sm:-mx-6 lg:-mx-10 -mt-2 mb-10 h-[36vh] sm:h-[44vh] min-h-[260px] overflow-hidden rounded-b-3xl bg-gradient-to-br from-accent/20 via-dark-800 to-dark-900 cursor-pointer group"
              onClick={() => navigateToBook(hero)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
              <div className="absolute inset-0 flex items-end">
                <div className="flex items-end gap-6 p-6 sm:p-10 w-full">
                  <BookCover
                    urls={hero.cover_urls}
                    alt={hero.title}
                    className="h-36 sm:h-48 rounded-xl shadow-2xl flex-shrink-0 object-contain group-hover:scale-105 transition-transform duration-300"
                  >
                    <div className="h-36 sm:h-48 w-24 sm:w-32 rounded-xl bg-dark-600 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={32} className="text-white/15" />
                    </div>
                  </BookCover>
                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-2 text-accent text-xs font-semibold mb-2">
                      <TrendingUp size={14} /> TRENDING THIS WEEK
                    </div>
                    <h1 className="text-xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight line-clamp-2">{hero.title}</h1>
                    <p className="text-white/50 text-sm mb-1">by {hero.author}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      {hero.rating > 0 && (
                        <span className="flex items-center gap-1 text-gold">
                          <Star size={14} className="fill-gold" /> {hero.rating}
                        </span>
                      )}
                      {hero.first_publish_year && <span>{hero.first_publish_year}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trending Row */}
          {trending.length > 0 && (
            <ScrollRow title="Trending This Week">
              {trending.map((b, i) => (
                <div key={b.key || i} className="flex-shrink-0 w-[150px]">
                  <MediaCard item={b} mediaType="book" />
                </div>
              ))}
            </ScrollRow>
          )}

          {/* Subject Rows — lazy loaded on scroll */}
          {SUBJECTS.map(s => {
            const books = subjectData[s.key];
            const loaded = loadedSubjects.has(s.key);
            return (
              <div key={s.key} ref={loaded ? undefined : observerRef} data-subject={s.key}>
                {!loaded ? (
                  <SkeletonRow title={s.name} />
                ) : books?.length > 0 ? (
                  <ScrollRow title={s.name}>
                    {books.map((b, i) => (
                      <div key={b.key || i} className="flex-shrink-0 w-[150px]">
                        <MediaCard item={b} mediaType="book" />
                      </div>
                    ))}
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
