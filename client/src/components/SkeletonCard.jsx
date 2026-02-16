import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[140px] sm:w-[160px] animate-pulse">
      <div className="bg-dark-700 rounded-lg aspect-[2/3] w-full mb-2" />
      <div className="bg-dark-700 rounded h-3 w-3/4 mb-1" />
      <div className="bg-dark-700 rounded h-3 w-1/2" />
    </div>
  );
}

export function SkeletonRow({ title }) {
  return (
    <div className="mb-8">
      {title && <div className="bg-dark-700 rounded h-5 w-40 mb-4 animate-pulse" />}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative h-[50vh] sm:h-[60vh] rounded-xl overflow-hidden mb-8 animate-pulse bg-dark-700">
      <div className="absolute bottom-0 left-0 p-6 sm:p-10 space-y-3 w-full">
        <div className="bg-dark-600 rounded h-8 w-1/3" />
        <div className="bg-dark-600 rounded h-4 w-2/3" />
        <div className="bg-dark-600 rounded h-4 w-1/2" />
      </div>
    </div>
  );
}
