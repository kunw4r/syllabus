'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';
import { PreviewModalProvider } from './PreviewModalProvider';
import { MotionProvider } from '@/components/motion/MotionProvider';
import DownloadProvider from './DownloadProvider';
import DownloadBar from '@/components/ui/DownloadBar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <MotionProvider>
          <DownloadProvider>
            <PreviewModalProvider>
              {children}
              <DownloadBar />
            </PreviewModalProvider>
          </DownloadProvider>
        </MotionProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
