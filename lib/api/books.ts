import { searchGoogleBooks, getGoogleBookDetails, mapGoogleBook } from './google-books';

const OL_BASE = 'https://openlibrary.org';
const OL_COVERS = 'https://covers.openlibrary.org';
const BOOK_CACHE_TTL = 60 * 60 * 1000;

const cache = new Map<string, { data: any; ts: number }>();

function cached<T>(key: string, fetcher: () => Promise<T>, ttl = BOOK_CACHE_TTL): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data as T);
  return fetcher().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

const OL_SEARCH_FIELDS = [
  'key', 'title', 'author_name', 'cover_i', 'cover_edition_key',
  'isbn', 'first_publish_year', 'ratings_average', 'ratings_count',
  'edition_count', 'subject',
].join(',');

const JUNK_EDITION_PATTERNS = [
  /study guide/i, /\bsummary\b/i, /\bsummaries\b/i, /analysis of/i,
  /condensed/i, /abridged/i, /cliffs? notes/i, /sparknotes/i,
  /bookrags/i, /bookcaps/i, /\bworkbook\b/i, /teacher'?s? guide/i,
  /reading guide/i, /\bquiz\b/i, /\bcollect(ed|ion)\b/i,
];

function buildCoverUrls(work: any, size = 'M'): string[] {
  const urls: string[] = [];
  const coverId = work.cover_i || work.cover_id;
  if (coverId && Number(coverId) > 0) {
    urls.push(`${OL_COVERS}/b/id/${coverId}-${size}.jpg`);
  }
  const seen = new Set<string>();
  for (const isbn of [...(work.isbn || []), ...(work.isbn_13 || []), ...(work.isbn_10 || [])]) {
    if (!seen.has(isbn)) {
      seen.add(isbn);
      urls.push(`${OL_COVERS}/b/isbn/${isbn}-${size}.jpg`);
    }
    if (seen.size >= 3) break;
  }
  if (work.cover_edition_key) {
    urls.push(`${OL_COVERS}/b/olid/${work.cover_edition_key}-${size}.jpg`);
  }
  return urls;
}

function mapOLBook(w: any) {
  const coverUrls = buildCoverUrls(w, 'M');
  return {
    key: w.key,
    title: w.title,
    author: w.author_name?.[0] || w.authors?.[0]?.name || 'Unknown',
    poster_path: coverUrls[0] || null,
    cover_urls: coverUrls,
    isbn: w.isbn || [],
    first_publish_year: w.first_publish_year,
    rating: w.ratings_average ? Math.round(w.ratings_average * 20) / 10 : null,
    ratings_count: w.ratings_count || 0,
    want_to_read: w.want_to_read_count || 0,
    already_read: w.already_read_count || 0,
    currently_reading: w.currently_reading_count || 0,
    edition_count: w.edition_count || 0,
    subject: (w.subject || []).slice(0, 5),
    media_type: 'book' as const,
  };
}

function mapSubjectWork(w: any) {
  const coverUrls: string[] = [];
  if (w.cover_id && Number(w.cover_id) > 0) {
    coverUrls.push(`${OL_COVERS}/b/id/${w.cover_id}-M.jpg`);
  }
  if (w.cover_edition_key) {
    coverUrls.push(`${OL_COVERS}/b/olid/${w.cover_edition_key}-M.jpg`);
  }
  return {
    key: w.key,
    title: w.title,
    author: w.authors?.[0]?.name || 'Unknown',
    poster_path: coverUrls[0] || null,
    cover_urls: coverUrls,
    first_publish_year: w.first_publish_year,
    edition_count: w.edition_count || 0,
    media_type: 'book' as const,
  };
}

async function enrichBookWithGoogleCover(book: any) {
  if ((book.cover_urls || []).some((u: string) => u.includes('books.google.com') || u.includes('googleapis.com'))) {
    return book;
  }
  let gbResults: any[] = [];
  const isbns = (book.industry_identifiers || []).map((id: any) => id.identifier)
    .concat(book.isbn_13 || [], book.isbn_10 || [], book.isbn || []);
  for (const isbn of isbns.slice(0, 5)) {
    gbResults = await searchGoogleBooks(`isbn:${isbn}`, 1);
    if (gbResults.length > 0) break;
  }
  if (gbResults.length === 0 && book.title) {
    const titleQ = `intitle:${book.title}`;
    const q = book.author && book.author !== 'Unknown'
      ? `${titleQ} inauthor:${book.author}` : titleQ;
    const candidates = await searchGoogleBooks(q, 8);
    const filtered = candidates.filter((c: any) => {
      const t = c.title || '';
      if (JUNK_EDITION_PATTERNS.some(p => p.test(t))) return false;
      const origWords = book.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      if (origWords.length > 0) {
        const ct = t.toLowerCase();
        const matched = origWords.filter((w: string) => ct.includes(w)).length;
        if (matched / origWords.length < 0.5) return false;
      }
      return true;
    });
    const pool = filtered.length > 0 ? filtered : candidates;
    pool.sort((a: any, b: any) => (b.ratings_count || 0) - (a.ratings_count || 0));
    gbResults = pool.slice(0, 1);
  }
  if (gbResults.length > 0) {
    const gb = gbResults[0];
    if (gb.cover_urls && gb.cover_urls.length > 0) {
      book.cover_urls = [...gb.cover_urls, ...(book.cover_urls || [])];
      book.poster_path = gb.poster_path || book.poster_path;
    }
  }
  return book;
}

async function enrichBatch(books: any[], batchSize = 4) {
  for (let i = 0; i < books.length; i += batchSize) {
    await Promise.all(books.slice(i, i + batchSize).map(b => enrichBookWithGoogleCover(b)));
  }
}

export function getTrendingBooks() {
  return cached('ol:trending', async () => {
    try {
      const res = await fetch(`${OL_BASE}/trending/weekly.json?limit=30`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      let books = (data.works || []).map(mapOLBook).slice(0, 20);
      await enrichBatch(books);
      return books.filter((b: any) => b.cover_urls.length > 0);
    } catch { return []; }
  });
}

export function getBooksBySubject(subject: string) {
  const slug = subject.toLowerCase().replace(/\s+/g, '_');
  return cached(`ol:subject:${slug}`, async () => {
    try {
      const res = await fetch(
        `${OL_BASE}/subjects/${encodeURIComponent(slug)}.json?limit=24&details=false`
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      let books = (data.works || []).map(mapSubjectWork);
      await enrichBatch(books);
      return books.filter((b: any) => b.cover_urls.length > 0);
    } catch { return []; }
  });
}

export async function searchBooks(query: string) {
  let results = await searchGoogleBooks(query, 24);
  if (results.length > 0) return results;
  try {
    const res = await fetch(
      `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=24&fields=${OL_SEARCH_FIELDS}`
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const books = (data.docs || []).map(mapOLBook);
    await enrichBatch(books);
    return books;
  } catch { return []; }
}

export function getBookDetails(workKey: string): Promise<any> {
  if (!workKey.startsWith('/works/')) {
    return cached(`gb:detail:${workKey}`, async () => {
      const gb = await getGoogleBookDetails(workKey);
      if (gb) return gb;
      return getBookDetails(`/works/${workKey}`);
    });
  }
  const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
  return cached(`ol:detail:${key}`, async () => {
    try {
      const [work, ratings, shelves, editions] = await Promise.all([
        fetch(`${OL_BASE}${key}.json`).then(r => r.json()),
        fetch(`${OL_BASE}${key}/ratings.json`).then(r => r.json()).catch(() => null),
        fetch(`${OL_BASE}${key}/bookshelves.json`).then(r => r.json()).catch(() => null),
        fetch(`${OL_BASE}${key}/editions.json?limit=10`).then(r => r.json()).catch(() => null),
      ]);
      const authorKeys = (work.authors || [])
        .map((a: any) => a.author?.key || a.key)
        .filter(Boolean)
        .slice(0, 5);
      const authorResults = await Promise.all(
        authorKeys.map((k: string) =>
          fetch(`${OL_BASE}${k}.json`).then(r => r.json()).catch(() => null)
        )
      );
      const authors = authorResults.filter(Boolean).map((a: any) => ({
        name: a.name || a.personal_name || 'Unknown',
        key: a.key,
        photo: a.photos?.[0] ? `${OL_COVERS}/a/id/${a.photos[0]}-M.jpg` : null,
        bio: typeof a.bio === 'string' ? a.bio : a.bio?.value || '',
      }));
      const coverUrls: string[] = [];
      for (const coverId of (work.covers || []).slice(0, 3)) {
        if (coverId > 0) coverUrls.push(`${OL_COVERS}/b/id/${coverId}-L.jpg`);
      }
      for (const ed of (editions?.entries || []).slice(0, 10)) {
        for (const coverId of (ed.covers || []).slice(0, 2)) {
          if (coverId > 0) coverUrls.push(`${OL_COVERS}/b/id/${coverId}-L.jpg`);
        }
        const isbn = ed.isbn_13?.[0] || ed.isbn_10?.[0];
        if (isbn) coverUrls.push(`${OL_COVERS}/b/isbn/${isbn}-L.jpg`);
        const olid = ed.key?.replace('/books/', '');
        if (olid) coverUrls.push(`${OL_COVERS}/b/olid/${olid}-L.jpg`);
      }
      const uniqueCovers = [...new Set(coverUrls)];
      const desc = typeof work.description === 'string'
        ? work.description : work.description?.value || '';
      const result = {
        key: work.key,
        title: work.title,
        author: authors[0]?.name || 'Unknown',
        description: desc,
        poster_path: uniqueCovers[0] || null,
        cover_urls: uniqueCovers,
        first_publish_date: work.first_publish_date || '',
        subjects: (work.subjects || []).slice(0, 8),
        rating: ratings?.summary?.average
          ? Math.round(ratings.summary.average * 20) / 10 : null,
        ratings_count: ratings?.summary?.count || 0,
        want_to_read: shelves?.counts?.want_to_read || 0,
        currently_reading: shelves?.counts?.currently_reading || 0,
        already_read: shelves?.counts?.already_read || 0,
        edition_count: editions?.size || editions?.entries?.length || 0,
        authors,
        media_type: 'book' as const,
      };
      await enrichBookWithGoogleCover(result);
      return result;
    } catch { return null; }
  });
}

export function getTop100Books(subject: string | null = null) {
  const key = subject ? `top100:books:${subject}` : 'top100:books';
  return cached(key, async () => {
    try {
      const q = subject ? `subject:${subject}` : 'subject:fiction OR subject:literature';
      const res = await fetch(
        `${OL_BASE}/search.json?q=${encodeURIComponent(q)}&sort=rating+desc&limit=150` +
        `&fields=${OL_SEARCH_FIELDS},want_to_read_count,already_read_count,currently_reading_count`
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      let books = (data.docs || [])
        .filter((d: any) => (d.ratings_count || 0) >= 20 && d.ratings_average)
        .sort((a: any, b: any) => (b.ratings_average || 0) - (a.ratings_average || 0))
        .slice(0, 120)
        .map(mapOLBook);
      await enrichBatch(books);
      return books.filter((b: any) => b.cover_urls.length > 0).slice(0, 100);
    } catch { return []; }
  });
}

export async function getBookRecommendations(book: any) {
  const subjects = book.subjects || book.subject || [];
  if (subjects.length === 0) return [];
  for (const subject of subjects.slice(0, 3)) {
    try {
      const slug = subject.toLowerCase().replace(/[\s/]+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (!slug) continue;
      const results = await getBooksBySubject(slug);
      const filtered = results.filter((b: any) => b.key !== book.key);
      if (filtered.length >= 4) return filtered.slice(0, 8);
    } catch { continue; }
  }
  return [];
}

export async function multiSearchBooks(query: string) {
  const res = await fetch(
    `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,cover_edition_key,isbn,first_publish_year`
  );
  const data = await res.json().catch(() => ({ docs: [] }));
  return (data.docs || []).slice(0, 5).map(mapOLBook);
}
