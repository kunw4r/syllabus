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
    setQuery(suggestion.text);
    setShowSuggestions(false);
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
          className={`w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl outline-none transition-all focus:border-accent/50 focus:bg-white/[0.07] ${
            isNavbar
              ? 'pl-9 pr-8 py-2 text-sm'
              : 'pl-11 pr-10 py-3 text-sm'
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.text}-${i}`}
              onClick={() => handleSuggestionClick(s)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              {s.type === 'scenario' ? (
                <Sparkles size={16} className="text-accent shrink-0" />
              ) : s.poster ? (
                <img
                  src={`${TMDB_IMG}${s.poster}`}
                  alt=""
                  className="w-8 h-12 rounded object-cover shrink-0"
                />
              ) : (
                <Search size={16} className="text-white/30 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-white/80 truncate">{s.text}</p>
                {s.type === 'scenario' && (
                  <p className="text-[10px] text-accent/60 uppercase tracking-wider">AI Search</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
