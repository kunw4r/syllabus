'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';
import { PreviewModalProvider } from './PreviewModalProvider';
import { MotionProvider } from '@/components/motion/MotionProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <MotionProvider>
          <PreviewModalProvider>{children}</PreviewModalProvider>
        </MotionProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
