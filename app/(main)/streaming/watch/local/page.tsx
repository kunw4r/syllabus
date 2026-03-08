'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/components/ui/VideoPlayer'), { ssr: false });

function LocalPlayer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const src = searchParams.get('src') || '';
  const title = searchParams.get('title') || 'Playback';

  if (!src) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white/40">
        <p>No stream source provided</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <VideoPlayer
        src={src}
        title={title}
        onBack={() => router.back()}
        onEnded={() => router.back()}
      />
    </div>
  );
}

export default function LocalWatchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" /></div>}>
      <LocalPlayer />
    </Suspense>
  );
}
