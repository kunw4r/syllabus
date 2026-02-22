const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

function cleanGBUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace('http://', 'https://').replace(/&edge=curl/g, '');
}

function highResGBUrl(url: string | undefined): string | null {
  if (!url) return null;
  return cleanGBUrl(url)!.replace(/\bzoom=\d+\b/, 'zoom=0');
}

export async function searchGoogleBooks(query: string, maxResults = 20) {
  try {
    const res = await fetch(
      `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books`
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return (data.items || []).map(mapGoogleBook);
  } catch {
    return [];
  }
}

export async function getGoogleBookDetails(volumeId: string) {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_BASE}/volumes/${volumeId}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return mapGoogleBook(data);
  } catch {
    return null;
  }
}

export function mapGoogleBook(item: any) {
  const v = item.volumeInfo || {};
  const rawThumb = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
  const cover_urls: string[] = [];
  if (rawThumb) {
    const hires = highResGBUrl(rawThumb);
    const standard = cleanGBUrl(rawThumb);
    if (hires) cover_urls.push(hires);
    if (standard && standard !== hires) cover_urls.push(standard);
  }
  [v.imageLinks?.extraLarge, v.imageLinks?.large, v.imageLinks?.medium]
    .filter(Boolean)
    .forEach((url: string) => {
      const cleaned = cleanGBUrl(url);
      if (cleaned && !cover_urls.includes(cleaned)) cover_urls.push(cleaned);
    });

  return {
    key: item.id,
    title: v.title || '',
    author: (v.authors || [])[0] || 'Unknown',
    description: v.description || '',
    poster_path: cover_urls[0] || null,
    cover_urls,
    authors: (v.authors || []).map((name: string) => ({ name })),
    first_publish_date: v.publishedDate || '',
    subjects: v.categories || [],
    rating: v.averageRating || null,
    ratings_count: v.ratingsCount || 0,
    want_to_read: 0,
    currently_reading: 0,
    already_read: 0,
    edition_count: 1,
    media_type: 'book' as const,
    google_id: item.id,
    industry_identifiers: v.industryIdentifiers || [],
    info_link: v.infoLink || '',
    preview_link: v.previewLink || '',
  };
}
