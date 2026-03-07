'use client';

interface SkeletonRowProps {
  count?: number;
  title?: boolean;
}

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
  );
}

export function SkeletonCard() {
  return (
    <div className="shrink-0 w-[240px] sm:w-[280px]">
      <div className="relative aspect-[16/9] rounded-xl bg-white/[0.04] overflow-hidden">
        <ShimmerOverlay />
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 6, title = true }: SkeletonRowProps) {
  return (
    <div>
      {title && (
        <div className="relative h-5 w-40 bg-white/[0.04] rounded-lg mb-4 overflow-hidden">
          <ShimmerOverlay />
        </div>
      )}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] min-h-[320px] rounded-b-3xl bg-white/[0.03] overflow-hidden">
      <ShimmerOverlay />
      {/* Fake gradient overlay like real hero */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
      {/* Fake title block */}
      <div className="absolute bottom-8 left-6 sm:left-10 space-y-3">
        <div className="relative h-8 sm:h-10 w-64 sm:w-80 bg-white/[0.06] rounded-lg overflow-hidden">
          <ShimmerOverlay />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-5 w-14 bg-white/[0.04] rounded overflow-hidden">
            <ShimmerOverlay />
          </div>
          <div className="relative h-5 w-20 bg-white/[0.04] rounded overflow-hidden">
            <ShimmerOverlay />
          </div>
        </div>
        <div className="relative h-3 w-96 max-w-[70vw] bg-white/[0.03] rounded overflow-hidden">
          <ShimmerOverlay />
        </div>
        <div className="relative h-3 w-72 max-w-[55vw] bg-white/[0.03] rounded overflow-hidden">
          <ShimmerOverlay />
        </div>
        <div className="flex gap-3 mt-2">
          <div className="relative h-11 w-28 bg-white/[0.06] rounded-lg overflow-hidden">
            <ShimmerOverlay />
          </div>
          <div className="relative h-11 w-11 bg-white/[0.04] rounded-full overflow-hidden">
            <ShimmerOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full home page loading skeleton — hero + rows */
export function HomePageSkeleton() {
  return (
    <div>
      {/* Hero skeleton — full bleed */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 -mt-6 lg:-mt-4 mb-10">
        <SkeletonHero />
      </div>
      {/* Content rows */}
      <div className="space-y-10">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow count={5} />
      </div>
    </div>
  );
}
