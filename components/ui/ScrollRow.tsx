'use client';

import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollRowProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function ScrollRow({
  title,
  children,
  className = '',
}: ScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
    }
  };

  return (
    <section className={className}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => scroll(-1)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      >
        {children}
      </div>
    </section>
  );
}
