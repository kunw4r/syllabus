'use client';

import { ExternalLink } from 'lucide-react';

const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92';

const PROVIDER_URLS: Record<string, (title: string) => string> = {
  'Netflix': (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  'Amazon Prime Video': (t) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(t)}`,
  'Amazon Video': (t) => `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(t)}`,
  'Disney Plus': (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  'Apple TV': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  'Apple TV Plus': (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  'Stan': (t) => `https://www.stan.com.au/search?q=${encodeURIComponent(t)}`,
  'Binge': (t) => `https://binge.com.au/search?q=${encodeURIComponent(t)}`,
  'Paramount Plus': (t) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(t)}`,
  'Hulu': (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  'Max': (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'HBO Max': (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'Peacock': (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}`,
  'Crunchyroll': (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  'Google Play Movies': (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`,
  'YouTube': (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
};

function getProviderUrl(providerName: string, title: string, fallbackLink?: string): string {
  for (const [key, urlFn] of Object.entries(PROVIDER_URLS)) {
    if (
      providerName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(providerName.toLowerCase())
    ) {
      return urlFn(title);
    }
  }
  return fallbackLink || '#';
}

interface StreamingProvidersProps {
  providers: any;
  title: string;
}

export default function StreamingProviders({ providers, title }: StreamingProvidersProps) {
  if (!providers) return null;

  const streaming = providers.flatrate || [];
  const rent = providers.rent || [];
  const buy = providers.buy || [];

  if (streaming.length === 0 && rent.length === 0 && buy.length === 0) return null;

  const ProviderGroup = ({ items, label, limit = 6 }: { items: any[]; label: string; limit?: number }) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] text-white/30 mb-1.5 uppercase">{label}</p>
        <div className="flex flex-wrap gap-2">
          {items.slice(0, limit).map((p: any) => (
            <a key={p.provider_id} href={getProviderUrl(p.provider_name, title, providers.link)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.08] transition-colors">
              {p.logo_path && <img src={`${TMDB_LOGO}${p.logo_path}`} alt="" className="w-6 h-6 rounded object-cover" />}
              <span className="text-xs font-medium">{p.provider_name}</span>
              <ExternalLink size={11} className="text-white/20" />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Where to Watch</h3>
      <div className="space-y-3">
        <ProviderGroup items={streaming} label="Stream" />
        <ProviderGroup items={rent} label="Rent" />
        <ProviderGroup items={buy} label="Buy" />
      </div>
    </div>
  );
}
