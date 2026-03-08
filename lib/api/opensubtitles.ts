// ─── OpenSubtitles API Client ───
// Fetches subtitles from OpenSubtitles.com for any movie/TV episode
// Uses TMDB/IMDB IDs to find matching subtitles

const API_BASE = 'https://api.opensubtitles.com/api/v1';

// Public API key for OpenSubtitles (rate limited, for dev/educational use)
// In production, register at opensubtitles.com/consumers for your own key
const API_KEY = ''; // Set via NEXT_PUBLIC_OPENSUBTITLES_API_KEY env var

function getApiKey(): string {
  return (typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.props?.pageProps?.openSubtitlesKey
    : undefined)
    || process.env.NEXT_PUBLIC_OPENSUBTITLES_API_KEY
    || API_KEY;
}

export interface SubtitleResult {
  id: string;
  language: string;
  languageName: string;
  release: string;
  downloadCount: number;
  rating: number;
  fileId: number;
  fps: number;
  hearingImpaired: boolean;
  machineTranslated: boolean;
  format: string;
}

export interface SubtitleDownload {
  link: string;
  fileName: string;
  remaining: number;
}

// ─── Language mapping ───

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ja: 'Japanese',
  ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  hu: 'Hungarian', ro: 'Romanian', el: 'Greek', he: 'Hebrew', th: 'Thai',
  vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', bn: 'Bengali', ta: 'Tamil',
  te: 'Telugu', bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
  sr: 'Serbian', uk: 'Ukrainian', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian',
  sq: 'Albanian', mk: 'Macedonian', bs: 'Bosnian', ka: 'Georgian',
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: 'gb', es: 'es', fr: 'fr', de: 'de', it: 'it', pt: 'pt', nl: 'nl',
  pl: 'pl', ru: 'ru', ja: 'jp', ko: 'kr', zh: 'cn', ar: 'sa', hi: 'in',
  tr: 'tr', sv: 'se', da: 'dk', fi: 'fi', no: 'no', cs: 'cz', hu: 'hu',
  ro: 'ro', el: 'gr', he: 'il', th: 'th', vi: 'vn', id: 'id', ms: 'my',
  bn: 'bd', ta: 'in', te: 'in', bg: 'bg', hr: 'hr', sk: 'sk', sl: 'si',
  sr: 'rs', uk: 'ua', lt: 'lt', lv: 'lv', et: 'ee', sq: 'al', mk: 'mk',
  bs: 'ba', ka: 'ge',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

export function getFlagEmoji(langCode: string): string {
  const cc = LANGUAGE_FLAGS[langCode] || langCode;
  return cc.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

// ─── Search subtitles ───

export async function searchSubtitles(params: {
  imdbId?: string;
  tmdbId?: number;
  query?: string;
  season?: number;
  episode?: number;
  languages?: string;
  type?: 'movie' | 'episode';
}): Promise<SubtitleResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const query = new URLSearchParams();
  if (params.imdbId) query.set('imdb_id', params.imdbId);
  if (params.tmdbId) query.set('tmdb_id', String(params.tmdbId));
  if (params.query) query.set('query', params.query);
  if (params.season) query.set('season_number', String(params.season));
  if (params.episode) query.set('episode_number', String(params.episode));
  if (params.languages) query.set('languages', params.languages);
  if (params.type) query.set('type', params.type);
  query.set('order_by', 'download_count');
  query.set('order_direction', 'desc');

  try {
    const res = await fetch(`${API_BASE}/subtitles?${query.toString()}`, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((item: any) => ({
      id: item.id,
      language: item.attributes?.language || '',
      languageName: getLanguageName(item.attributes?.language || ''),
      release: item.attributes?.release || item.attributes?.feature_details?.title || '',
      downloadCount: item.attributes?.download_count || 0,
      rating: item.attributes?.ratings || 0,
      fileId: item.attributes?.files?.[0]?.file_id || 0,
      fps: item.attributes?.fps || 0,
      hearingImpaired: item.attributes?.hearing_impaired || false,
      machineTranslated: item.attributes?.machine_translated || false,
      format: item.attributes?.format || 'srt',
    }));
  } catch (err) {
    console.error('[OpenSubtitles] Search failed:', err);
    return [];
  }
}

// ─── Download subtitle ───

export async function downloadSubtitle(fileId: number): Promise<SubtitleDownload | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      link: data.link,
      fileName: data.file_name,
      remaining: data.remaining,
    };
  } catch (err) {
    console.error('[OpenSubtitles] Download failed:', err);
    return null;
  }
}

// ─── Convert SRT to VTT (browsers need WebVTT) ───

export function srtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n';
  vtt += srt
    .replace(/\r\n/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/^\d+\n/gm, '');
  return vtt;
}

// ─── Fetch subtitle as blob URL (for <track> element) ───

export async function fetchSubtitleAsVttUrl(fileId: number): Promise<string | null> {
  const download = await downloadSubtitle(fileId);
  if (!download?.link) return null;

  try {
    const res = await fetch(download.link);
    if (!res.ok) return null;
    let text = await res.text();

    // Convert SRT to VTT if needed
    if (!text.trim().startsWith('WEBVTT')) {
      text = srtToVtt(text);
    }

    const blob = new Blob([text], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ─── Group subtitles by language ───

export function groupByLanguage(subs: SubtitleResult[]): Map<string, SubtitleResult[]> {
  const map = new Map<string, SubtitleResult[]>();
  for (const sub of subs) {
    const lang = sub.language;
    if (!map.has(lang)) map.set(lang, []);
    map.get(lang)!.push(sub);
  }
  // Sort each group by download count
  for (const [, list] of map) {
    list.sort((a, b) => b.downloadCount - a.downloadCount);
  }
  return map;
}
