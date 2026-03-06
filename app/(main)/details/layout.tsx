'use client';

import { useEffect } from 'react';

export default function DetailsLayout({ children }: { children: React.ReactNode }) {
  // Hide the desktop sidebar and reclaim full width on detail pages
  useEffect(() => {
    const sidebar = document.querySelector('nav.fixed.left-0.hidden.lg\\:flex') as HTMLElement | null;
    const main = document.querySelector('main.lg\\:ml-60') as HTMLElement | null;
    const inner = main?.querySelector(':scope > div') as HTMLElement | null;

    if (sidebar) sidebar.style.display = 'none';
    if (main) {
      main.style.marginLeft = '0';
      main.style.paddingTop = '0';
    }
    if (inner) {
      inner.style.paddingLeft = '0';
      inner.style.paddingRight = '0';
      inner.style.paddingTop = '0';
      inner.style.paddingBottom = '0';
    }

    return () => {
      if (sidebar) sidebar.style.display = '';
      if (main) {
        main.style.marginLeft = '';
        main.style.paddingTop = '';
      }
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
