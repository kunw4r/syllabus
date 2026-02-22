'use client';

import { useState, useRef } from 'react';

interface BookCoverProps {
  coverUrls?: string[];
  alt?: string;
  className?: string;
}

export default function BookCover({
  coverUrls = [],
  alt = '',
  className = '',
}: BookCoverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!coverUrls.length || failed) {
    return (
      <div
        className={`bg-dark-700 flex items-center justify-center text-white/10 ${className}`}
      >
        <span className="text-4xl">📚</span>
      </div>
    );
  }

  const handleLoad = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth <= 1 && img.naturalHeight <= 1) {
      if (currentIndex + 1 < coverUrls.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setFailed(true);
      }
    }
  };

  const handleError = () => {
    if (currentIndex + 1 < coverUrls.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <img
      ref={imgRef}
      src={coverUrls[currentIndex]}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
