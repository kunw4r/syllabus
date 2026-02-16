import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function ScrollRow({ title, children, className = '' }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 400, behavior: 'smooth' });

  return (
    <div className={`mb-10 group/row min-w-0 ${className}`}>
      <h2 className="text-[15px] font-semibold text-white/80 mb-4 uppercase tracking-wide">{title}</h2>
      <div className="relative min-w-0">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-6 z-10 w-10 bg-gradient-to-r from-dark-900 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity items-center justify-center hidden sm:flex"
        >
          <ChevronLeft size={20} />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
          {children}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-6 z-10 w-10 bg-gradient-to-l from-dark-900 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity items-center justify-center hidden sm:flex"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

export default React.memo(ScrollRow);
