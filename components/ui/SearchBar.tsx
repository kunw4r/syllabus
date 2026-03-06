'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles } from 'lucide-react';
import { fetchSuggestions, type Suggestion } from '@/lib/api/ai-search';
import { TMDB_IMG } from '@/lib/constants';

const ROTATING_PLACEHOLDERS = [
  'Search movies, TV shows & books...',
  'Try "feel good movies"',
  'Try "something like Inception"',
  'Try "90s sci-fi classics"',
];

interface SearchBarProps {
  onSearch?: (query: string) => void;
  variant?: 'inline' | 'navbar';
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  onSearch,
  variant = 'inline',
  placeholder,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Rotating placeholders
  useEffect(() => {
    if (placeholder) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholder]);

  // Fetch suggestions (debounced)
  const fetchSuggestionsDebounced = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(q);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setShowSuggestions(false);
    // Direct navigation for content with a TMDB ID
    if (suggestion.type === 'content' && suggestion.tmdbId && suggestion.mediaType && suggestion.mediaType !== 'person') {
      router.push(`/details/${suggestion.mediaType}/${suggestion.tmdbId}`);
      return;
    }
    if (suggestion.type === 'content' && suggestion.tmdbId && suggestion.mediaType === 'person') {
      router.push(`/actors/${suggestion.tmdbId}`);
      return;
    }
    setQuery(suggestion.text);
    if (onSearch) {
      onSearch(suggestion.text);
    } else {
      router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleChange = (val: string) => {
    setQuery(val);
    fetchSuggestionsDebounced(val);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const isNavbar = variant === 'navbar';

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <Search
          size={isNavbar ? 16 : 18}
          className={`absolute left-3 ${isNavbar ? 'lg:left-3' : 'left-4'} top-1/2 -translate-y-1/2 text-white/30`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || ROTATING_PLACEHOLDERS[placeholderIndex]}
          autoFocus={autoFocus}
          className={`w-full bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-all focus:border-accent/50 focus:bg-white/[0.07] ${
            isNavbar
              ? 'pl-9 pr-8 py-1.5 text-xs rounded-full'
              : 'pl-11 pr-10 py-3 text-sm rounded-xl'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isNavbar ? 'right-2' : 'right-3'} top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors`}
          >
            <X size={isNavbar ? 14 : 16} />
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50 animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.text}-${i}`}
              onClick={() => handleSuggestionClick(s)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/[0.06]'
              }`}
            >
              {s.type === 'scenario' ? (
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-accent" />
                </div>
              ) : s.poster ? (
                <img
                  src={`${TMDB_IMG}${s.poster}`}
                  alt=""
                  className="w-9 h-[52px] rounded-md object-cover shrink-0 ring-1 ring-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Search size={14} className="text-white/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/90 truncate font-medium">{s.text}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {s.type === 'scenario' ? (
                    <span className="text-[10px] text-accent/60 uppercase tracking-wider font-medium">AI Search</span>
                  ) : (
                    <>
                      {s.mediaType && (
                        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                          {s.mediaType === 'movie' ? 'Movie' : s.mediaType === 'tv' ? 'TV Show' : s.mediaType === 'person' ? 'Actor' : ''}
                        </span>
                      )}
                      {s.year && (
                        <span className="text-[10px] text-white/25">{s.year}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {s.type === 'content' && s.tmdbId && (
                <span className="text-[10px] text-white/15 shrink-0">↵</span>
              )}
            </button>
          ))}
          {/* Search all footer */}
          <button
            onClick={() => {
              setShowSuggestions(false);
              if (onSearch) {
                onSearch(query);
              } else {
                router.push(`/search?q=${encodeURIComponent(query)}`);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-t border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          >
            <Search size={14} className="text-accent shrink-0" />
            <span className="text-sm text-accent/80 font-medium">Search all for &ldquo;{query}&rdquo;</span>
          </button>
        </div>
      )}
    </div>
  );
}
