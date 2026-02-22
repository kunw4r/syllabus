const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data as T);
  return fetcher().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

export function getMALRating(title: string) {
  if (!title) return Promise.resolve(null);
  return cached(`mal:${title}`, async () => {
    try {
      const res = await fetch(`/api/jikan?q=${encodeURIComponent(title)}&limit=1`);
      const data = await res.json();
      const anime = data.data?.[0];
      if (!anime) return null;
      return {
        score: anime.score,
        scored_by: anime.scored_by,
        mal_id: anime.mal_id,
        url: anime.url,
      };
    } catch { return null; }
  });
}
