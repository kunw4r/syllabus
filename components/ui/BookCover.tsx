'use client';

import { useState, useRef } from 'react';

interface BookCoverProps {
  coverUrls?: string[];
  alt?: string;
  className?: string;
  enable3D?: boolean;
}

export default function BookCover({
  coverUrls = [],
  alt = '',
  className = '',
  enable3D = false,
}: BookCoverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!coverUrls.length || failed) {
    return (
      <div
        className={`bg-dark-700 flex items-center justify-center text-white/10 ${className}`}
      >
        <span className="text-4xl">{'\u{1F4DA}'}</span>
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enable3D || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    containerRef.current.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };

  const handleMouseLeave = () => {
    if (!enable3D || !containerRef.current) return;
    containerRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  };

  if (enable3D) {
    return (
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="transition-transform duration-300 ease-out"
      >
        <img
          ref={imgRef}
          src={coverUrls[currentIndex]}
          alt={alt}
          className={className}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

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
