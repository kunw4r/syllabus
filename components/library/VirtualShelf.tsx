'use client';

import { Star } from 'lucide-react';

interface VirtualShelfProps {
  items: any[];
  onCardClick: (item: any) => void;
}

export default function VirtualShelf({ items, onCardClick }: VirtualShelfProps) {
  // Break items into shelf rows of 5-7 items depending on screen
  const ITEMS_PER_SHELF = 6;
  const shelves: any[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_SHELF) {
    shelves.push(items.slice(i, i + ITEMS_PER_SHELF));
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-white/30">
        <p>Your shelf is empty. Add some items to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {shelves.map((shelf, shelfIdx) => (
        <div key={shelfIdx}>
          {/* Items on shelf */}
          <div className="flex gap-3 sm:gap-4 justify-center px-2 pb-2">
            {shelf.map((item) => (
              <div
                key={item.id}
                className="w-[80px] sm:w-[100px] md:w-[110px] cursor-pointer group flex flex-col items-center"
                onClick={() => onCardClick(item)}
              >
                <div className="relative">
                  <div className="aspect-[2/3] rounded-md overflow-hidden ring-1 ring-white/5 group-hover:ring-accent/50 transition-all duration-300 group-hover:-translate-y-2 shadow-lg shadow-black/40">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center text-white/10 text-lg">
                        {item.media_type === 'book' ? '\u{1F4DA}' : '\u{1F3AC}'}
                      </div>
                    )}
                  </div>
                  {item.user_rating > 0 && (
                    <div className="absolute -top-1 -right-1 bg-gold rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-[8px] font-black text-dark-900">{Math.round(item.user_rating)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-white/40 truncate w-full text-center mt-1.5 group-hover:text-accent transition-colors">
                  {item.title}
                </p>
              </div>
            ))}
          </div>

          {/* Wooden shelf board */}
          <div className="relative h-4 mx-2">
            <div
              className="absolute inset-x-0 top-0 h-3 rounded-sm"
              style={{
                background: 'linear-gradient(180deg, #4a3728 0%, #3a2a1e 40%, #2d1f14 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            />
            {/* Shelf edge shadow */}
            <div
              className="absolute inset-x-0 top-3 h-1"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
