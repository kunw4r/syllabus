import type { Metadata, Viewport } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: {
    default: 'Syllabus — Movies, TV Shows & Books',
    template: '%s | Syllabus',
  },
  description:
    'Your personal media shelf — discover, track, and rate movies, TV shows & books with live ratings and smart recommendations.',
  keywords: ['movies', 'tv shows', 'books', 'tracker', 'ratings', 'recommendations'],
  openGraph: {
    title: 'Syllabus — Movies, TV Shows & Books',
    description: 'Discover, track, and rate movies, TV shows & books.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
