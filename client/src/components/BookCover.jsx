import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * BookCover — resilient cover image with automatic fallback chain.
 *
 * Open Library returns 1×1 transparent pixels for missing covers
 * instead of a proper 404. This component detects that and automatically
 * tries the next URL in the provided chain until one works.
 *
 * @param {string[]}  urls      — ordered cover URLs to try
 * @param {string}    alt       — image alt text
 * @param {string}    className — applied to both <img> and fallback
 * @param {ReactNode} children  — custom fallback (default: BookOpen icon)
 */
function BookCover({ urls = [], alt = '', className = '', children }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);

  // Reset when the book changes
  const urlKey = urls[0] || '';
  useEffect(() => { setIndex(0); setBroken(false); }, [urlKey]);

  const advance = () => {
    setIndex(prev => {
      const next = prev + 1;
      if (next >= urls.length) { setBroken(true); return prev; }
      return next;
    });
  };

  if (broken || urls.length === 0) {
    return children ?? (
      <div className={`${className} bg-dark-600 flex flex-col items-center justify-center`}>
        <BookOpen size={20} className="text-white/15" />
      </div>
    );
  }

  return (
    <img
      key={urls[index]}
      src={urls[index]}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={advance}
      onLoad={e => { if (e.target.naturalWidth <= 1) advance(); }}
    />
  );
}

export default React.memo(BookCover);
