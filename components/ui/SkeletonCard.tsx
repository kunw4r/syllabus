'use client';

interface SkeletonRowProps {
  count?: number;
}

export function SkeletonCard() {
  return (
    <div className="shrink-0 w-[140px] sm:w-[160px] animate-pulse">
      <div className="aspect-[2/3] rounded-xl bg-white/5" />
      <div className="mt-2 h-4 w-3/4 rounded bg-white/5" />
      <div className="mt-1 h-3 w-1/2 rounded bg-white/5" />
    </div>
  );
}

export function SkeletonRow({ count = 8 }: SkeletonRowProps) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="w-full h-[300px] sm:h-[400px] rounded-2xl bg-white/5 animate-pulse" />
  );
}
