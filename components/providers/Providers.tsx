'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';
import { MotionProvider } from '@/components/motion/MotionProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <MotionProvider>{children}</MotionProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
