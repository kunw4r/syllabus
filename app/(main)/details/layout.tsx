'use client';

import { useEffect } from 'react';

export default function DetailsLayout({ children }: { children: React.ReactNode }) {
  // Remove padding on detail pages for full-bleed layout
  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement | null;
    const inner = main?.querySelector(':scope > div') as HTMLElement | null;

    if (main) main.style.paddingTop = '0';
    if (inner) {
      inner.style.paddingLeft = '0';
      inner.style.paddingRight = '0';
      inner.style.paddingTop = '0';
      inner.style.paddingBottom = '0';
    }

    return () => {
      if (main) main.style.paddingTop = '';
      if (inner) {
        inner.style.paddingLeft = '';
        inner.style.paddingRight = '';
        inner.style.paddingTop = '';
        inner.style.paddingBottom = '';
      }
    };
  }, []);

  return <>{children}</>;
}
