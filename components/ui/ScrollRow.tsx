'use client';

import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollRowProps {
  title?: ReactNode;
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
      ref.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
    }
  };

  return (
    <section className={`relative ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-1 relative z-0">
          <h2 className="text-lg sm:text-xl font-bold text-white flex-1 min-w-0">{title}</h2>
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
        className="flex gap-1 overflow-x-auto overflow-y-visible scrollbar-hide pt-6 pb-8 -mt-4 -mb-6 px-5 sm:px-8 lg:px-14 -mx-5 sm:-mx-8 lg:-mx-14"
      >
        {children}
      </div>
    </section>
  );
}
