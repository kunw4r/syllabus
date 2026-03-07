'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import PreviewModal from '@/components/ui/PreviewModal';

interface PreviewTarget {
  item: any;
  mediaType: 'movie' | 'tv' | 'book';
}

interface PreviewModalContextValue {
  openPreview: (item: any, mediaType: 'movie' | 'tv' | 'book') => void;
  closePreview: () => void;
}

const PreviewModalContext = createContext<PreviewModalContextValue>({
  openPreview: () => {},
  closePreview: () => {},
});

export function usePreviewModal() {
  return useContext(PreviewModalContext);
}

export function PreviewModalProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<PreviewTarget | null>(null);

  const openPreview = useCallback((item: any, mediaType: 'movie' | 'tv' | 'book') => {
    setTarget({ item, mediaType });
  }, []);

  const closePreview = useCallback(() => {
    setTarget(null);
  }, []);

  return (
    <PreviewModalContext.Provider value={{ openPreview, closePreview }}>
      {children}
      <PreviewModal
        item={target?.item || null}
        mediaType={target?.mediaType || 'movie'}
        onClose={closePreview}
      />
    </PreviewModalContext.Provider>
  );
}
