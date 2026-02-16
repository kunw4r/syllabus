// Google Books API integration for Syllabus
// https://developers.google.com/books/docs/v1/using

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

/**
 * Search books by title, author, or ISBN using Google Books API.
 * @param {string} query
 * @param {number} [maxResults=20]
 * @returns {Promise<Array>} Array of mapped book objects
 */
export async function searchGoogleBooks(query, maxResults = 20) {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return (data.items || []).map(mapGoogleBook);
  } catch {
    return [];
  }
}

/**
 * Get book details by Google Books volume ID.
 * @param {string} volumeId
 * @returns {Promise<Object|null>} Book details object
 */
export async function getGoogleBookDetails(volumeId) {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_BASE}/volumes/${volumeId}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return mapGoogleBook(data);
  } catch {
    return null;
  }
}

/**
 * Map Google Books API item to Syllabus book object shape.
 */
export function mapGoogleBook(item) {
  const v = item.volumeInfo || {};
  return {
    key: item.id,
    title: v.title || '',
    description: v.description || '',
    poster_path: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    cover_urls: [
      v.imageLinks?.extraLarge,
      v.imageLinks?.large,
      v.imageLinks?.medium,
      v.imageLinks?.thumbnail,
      v.imageLinks?.smallThumbnail
    ].filter(Boolean).map(url => url.replace('http://', 'https://')),
    authors: (v.authors || []).map(name => ({ name })),
    first_publish_date: v.publishedDate || '',
    subjects: v.categories || [],
    rating: v.averageRating || null,
    ratings_count: v.ratingsCount || 0,
    want_to_read: 0,
    currently_reading: 0,
    already_read: 0,
    edition_count: 1,
    media_type: 'book',
    google_id: item.id,
    industry_identifiers: v.industryIdentifiers || [],
    info_link: v.infoLink || '',
    preview_link: v.previewLink || '',
  };
}
