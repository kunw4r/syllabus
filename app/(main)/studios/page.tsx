'use client';

import Link from 'next/link';
import { STUDIOS } from '@/lib/constants';
import { STUDIO_LOGOS } from '@/components/ui/StudioLogos';

export default function StudiosPage() {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-black mb-2">Studios</h1>
      <p className="text-white/40 text-sm mb-8">
        Browse movies and shows by studio, production company, or film industry
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {STUDIOS.map((studio) => {
          const Logo = STUDIO_LOGOS[studio.slug];
          return (
            <Link
              key={studio.slug}
              href={`/studios/${studio.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/5 hover:border-white/15 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/30"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${studio.color} opacity-15 group-hover:opacity-25 transition-opacity`} />
              <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 gap-3">
                {Logo ? <Logo size={44} /> : <span className="text-3xl">{studio.icon}</span>}
                <span className="text-sm sm:text-base font-semibold text-white text-center leading-tight">
                  {studio.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
