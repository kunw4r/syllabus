'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Star, BookOpen, TrendingUp } from 'lucide-react';
import MediaCard from '@/components/ui/MediaCard';
import BookCover from '@/components/ui/BookCover';
import ScrollRow from '@/components/ui/ScrollRow';
import { SkeletonRow, SkeletonHero } from '@/components/ui/SkeletonCard';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';
import {
  getTrendingBooks,
  getBooksBySubject,
  searchBooks,
} from '@/lib/api/books';

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

export default function BooksPage() {
  const router = useRouter();
  const [trending, setTrending] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<Record<string, any[]>>({});
  const [loadedSubjects, setLoadedSubjects] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [t, ...subjectResults] = await Promise.all([
          getTrendingBooks(),
          ...SUBJECTS.slice(0, 2).map((s) => getBooksBySubject(s.key)),
        ]);
        setTrending(t);
        const sd: Record<string, any[]> = {};
        SUBJECTS.slice(0, 2).forEach((s, i) => {
          sd[s.key] = subjectResults[i];
        });
        setSubjectData(sd);
        setLoadedSubjects(new Set(SUBJECTS.slice(0, 2).map((s) => s.key)));
      } catch (err) {
        console.error('[Books] Initial load failed:', err);
      }
      setInitialLoaded(true);
    }
    loadInitial();
  }, []);

  const loadSubject = useCallback(
    async (key: string) => {
      if (loadedSubjects.has(key)) return;
      setLoadedSubjects((prev) => new Set([...prev, key]));
      try {
        const books = await getBooksBySubject(key);
        setSubjectData((prev) => ({ ...prev, [key]: books }));
      } catch {
        setSubjectData((prev) => ({ ...prev, [key]: [] }));
      }
    },
    [loadedSubjects]
  );

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const key = node.dataset.subject;
            if (key) loadSubject(key);
            observer.disconnect();
          }
        },
        { rootMargin: '300px' }
      );
      observer.observe(node);
    },
    [loadSubject]
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchBooks(query);
    setResults(data);
    setSearching(false);
  };

  const clearSearch = () => {
    setResults(null);
    setQuery('');
  };

  const hero = trending[0];
  const heroSecondary = trending.slice(1, 4);

  const navigateToBook = (book: any) => {
    const workKey = book.key?.replace('/works/', '') || '';
    if (workKey) router.push(`/details/book/${workKey}`);
  };

  if (!initialLoaded) {
    return (
      <div className="min-w-0">
        <SkeletonHero />
        <div className="mt-8"><SkeletonRow /></div>
        <div className="mt-8"><SkeletonRow /></div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Hero section */}
      {hero && (
        <div className="-mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-6 lg:-mt-4 mb-8">
          <div className="relative h-[40vh] sm:h-[48vh] min-h-[300px] max-h-[500px] overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-dark-900 to-dark-900" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(217,119,6,0.08),transparent_60%)]" />

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent z-[1]" />

            {/* Content */}
            <div className="absolute inset-0 z-[2] flex items-end">
              <div className="flex items-end gap-6 sm:gap-8 px-5 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 pb-8 sm:pb-10 w-full">
                {/* Book cover */}
                <div
                  className="shrink-0 cursor-pointer group"
                  onClick={() => navigateToBook(hero)}
                >
                  <div className="relative">
                    <BookCover
                      coverUrls={hero.cover_urls}
                      alt={hero.title}
                      className="h-40 sm:h-52 lg:h-56 rounded-lg shadow-2xl shadow-black/60 object-contain group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 rounded-lg ring-1 ring-white/10" />
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 pb-1 flex-1">
                  <div className="flex items-center gap-2 text-amber-400/80 text-xs font-semibold mb-2 tracking-wide uppercase">
                    <TrendingUp size={14} /> Trending This Week
                  </div>
                  <h1
                    className="font-serif text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white leading-[1.1] mb-2 cursor-pointer hover:text-accent transition-colors line-clamp-2"
                    onClick={() => navigateToBook(hero)}
                  >
                    {hero.title}
                  </h1>
                  <p className="text-white/40 text-sm sm:text-base mb-3">
                    by {hero.author}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {hero.rating > 0 && (
                      <span
                        className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 shadow-lg"
                        style={{ background: getRatingBg(Number(hero.rating)), boxShadow: getRatingGlow(Number(hero.rating)) }}
                      >
                        <Star size={14} className="fill-current" style={{ color: getRatingHex(Number(hero.rating)) }} />
                        <span className="font-bold" style={{ color: getRatingHex(Number(hero.rating)) }}>{hero.rating}</span>
                      </span>
                    )}
                    {hero.first_publish_year && (
                      <span className="text-white/30">{hero.first_publish_year}</span>
                    )}
                  </div>

                  {/* Secondary picks */}
                  {heroSecondary.length > 0 && (
                    <div className="hidden lg:flex items-center gap-4 mt-5">
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">Also trending</span>
                      {heroSecondary.map((b: any) => (
                        <div
                          key={b.key || b.google_books_id}
                          className="flex items-center gap-2.5 cursor-pointer group/sec"
                          onClick={() => navigateToBook(b)}
                        >
                          <BookCover
                            coverUrls={b.cover_urls}
                            alt={b.title}
                            className="h-10 rounded shadow-lg object-contain"
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-white/60 group-hover/sec:text-accent truncate max-w-[140px] transition-colors font-medium">{b.title}</p>
                            <p className="text-[10px] text-white/25 truncate max-w-[140px]">{b.author}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {results ? (
        <>
          <h2 className="text-xl font-semibold mb-5">
            Results for &ldquo;{query}&rdquo;
          </h2>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {results.map((b: any, i: number) => (
                <MediaCard key={b.key || i} item={b} mediaType="book" />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-white/40">
              <BookOpen size={40} className="mx-auto mb-3 text-white/15" />
              <h3 className="text-lg font-medium text-white/60 mb-2">
                No books found
              </h3>
              <p className="text-sm">
                Try a different title, author, or ISBN
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {/* Trending Row */}
          {trending.length > 0 && (
            <ScrollRow title="Trending This Week">
              {trending.map((b: any, i: number) => (
                <MediaCard key={b.key || i} item={b} mediaType="book" />
              ))}
            </ScrollRow>
          )}

          {/* Subject Rows */}
          {SUBJECTS.map((s) => {
            const books = subjectData[s.key];
            const loaded = loadedSubjects.has(s.key);
            return (
              <div
                key={s.key}
                ref={loaded ? undefined : observerRef}
                data-subject={s.key}
              >
                {!loaded ? (
                  <div className="mt-6">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                      {s.name}
                    </h2>
                    <SkeletonRow />
                  </div>
                ) : books?.length > 0 ? (
                  <ScrollRow title={s.name}>
                    {books.map((b: any, i: number) => (
                      <MediaCard key={b.key || i} item={b} mediaType="book" />
                    ))}
                  </ScrollRow>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
