'use client';

interface SkeletonRowProps {
  count?: number;
}

export function SkeletonCard() {
  return (
    <div className="shrink-0 w-[240px] sm:w-[280px] animate-pulse">
      <div className="aspect-[16/9] rounded-xl bg-white/5" />
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
