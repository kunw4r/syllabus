import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function ScrollRow({ title, children, className = '' }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 600, behavior: 'smooth' });

  return (
    <div className={`mb-10 group/row ${className}`}>
      <h2 className="text-[15px] font-semibold text-white/80 mb-4 uppercase tracking-wide">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute -left-2 top-0 bottom-6 z-10 w-10 bg-gradient-to-r from-dark-900 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
          {children}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute -right-2 top-0 bottom-6 z-10 w-10 bg-gradient-to-l from-dark-900 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

export default ScrollRow;
