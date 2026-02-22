// ─── Shared constants used across the Syllabus app ───

// ─── TMDB Image Base URLs ───

export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/';
export const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// ─── Genre slug → TMDB ID (used by Curated Picks) ───

export const GENRE_MAP: Record<string, string> = {
  all: '',
  action: '28', comedy: '35', drama: '18', scifi: '878',
  thriller: '53', romance: '10749', horror: '27', animation: '16',
  documentary: '99', crime: '80', fantasy: '14', family: '10751',
};

// ─── Scenario phrase → genres/keywords (AI Scenario Search) ───

export const SCENARIO_KEYWORDS: Record<string, { genres: string; keywords: string }> = {
  'date night': { genres: '10749,35', keywords: '' },
  'date': { genres: '10749,35', keywords: '' },
  'romantic': { genres: '10749', keywords: '' },
  'family': { genres: '10751,16', keywords: '' },
  'kids': { genres: '10751,16', keywords: '' },
  'children': { genres: '10751,16', keywords: '' },
  'scary': { genres: '27', keywords: '' },
  'horror': { genres: '27', keywords: '' },
  'funny': { genres: '35', keywords: '' },
  'laugh': { genres: '35', keywords: '' },
  'comedy': { genres: '35', keywords: '' },
  'cry': { genres: '18,10749', keywords: '' },
  'emotional': { genres: '18,10749', keywords: '' },
  'sad': { genres: '18', keywords: '' },
  'action': { genres: '28', keywords: '' },
  'adrenaline': { genres: '28,53', keywords: '' },
  'escape': { genres: '14,12,878', keywords: '' },
  'mind off': { genres: '28,12,35', keywords: '' },
  'take my mind': { genres: '28,12,35,14', keywords: '' },
  'relax': { genres: '35,10751,10402', keywords: '' },
  'chill': { genres: '35,10402', keywords: '' },
  'thriller': { genres: '53,9648', keywords: '' },
  'suspense': { genres: '53,9648', keywords: '' },
  'mystery': { genres: '9648', keywords: '' },
  'mind bending': { genres: '878,9648', keywords: '' },
  'trippy': { genres: '878,9648', keywords: '' },
  'sci-fi': { genres: '878', keywords: '' },
  'space': { genres: '878', keywords: '1612' },
  'war': { genres: '10752,18', keywords: '' },
  'history': { genres: '36', keywords: '' },
  'true story': { genres: '18,36', keywords: '9672' },
  'based on': { genres: '18', keywords: '9672' },
  'superhero': { genres: '28,878', keywords: '9715' },
  'animated': { genres: '16', keywords: '' },
  'anime': { genres: '16', keywords: '' },
  'documentary': { genres: '99', keywords: '' },
  'learn': { genres: '99,36', keywords: '' },
  'inspiring': { genres: '18', keywords: '9748' },
  'motivat': { genres: '18', keywords: '9748' },
  'adventure': { genres: '12,28', keywords: '' },
  'fantasy': { genres: '14', keywords: '' },
  'magic': { genres: '14', keywords: '' },
  'zombie': { genres: '27', keywords: '12377' },
  'survival': { genres: '28,53', keywords: '10349' },
  'heist': { genres: '80,53', keywords: '10051' },
  'feel good': { genres: '35,10751,10749', keywords: '' },
  'wholesome': { genres: '35,10751', keywords: '' },
  'coming of age': { genres: '18', keywords: '10683' },
  'teen': { genres: '18,35', keywords: '10683' },
  'western': { genres: '37', keywords: '' },
  'music': { genres: '10402', keywords: '' },
  'sport': { genres: '18', keywords: '6075' },
  'revenge': { genres: '28,53', keywords: '10084' },
};

// ─── Mood → genre IDs by media type (Discover by Mood) ───

export const MOOD_GENRES: Record<string, { movie: string; tv: string }> = {
  light: { movie: '35,10751,10402', tv: '35,10751' },
  dark: { movie: '28,53,27,80', tv: '28,80,9648' },
  mind: { movie: '878,9648,14', tv: '878,9648' },
  feel: { movie: '10749,18,10402', tv: '10749,18' },
  adventure: { movie: '12,28,14', tv: '10759,14' },
  chill: { movie: '99,36,10770', tv: '99,10764' },
};

// ─── Genre name → TMDB ID (used by Blends) ───

export const BLEND_GENRE_MAP: Record<string, number> = {
  'Action': 28, 'Comedy': 35, 'Drama': 18, 'Horror': 27, 'Romance': 10749,
  'Thriller': 53, 'Sci-Fi': 878, 'Animation': 16, 'Crime': 80,
  'Documentary': 99, 'Adventure': 12, 'Fantasy': 14, 'Mystery': 9648,
  'Science Fiction': 878,
};

// ─── Genre filters for Top 100 ───

export const MOVIE_GENRES = [
  { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' }, { id: 14, name: 'Fantasy' }, { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' }, { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
] as const;

export const TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' }, { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' }, { id: 9648, name: 'Mystery' },
  { id: 10764, name: 'Reality' }, { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10768, name: 'War & Politics' },
] as const;

// ─── TMDB Genre ID → Name (reverse lookup for recommendations) ───

export const GENRE_ID_TO_NAME: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  // TV-specific
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// ─── Scenario search suggestions (shown in auto-suggest) ───

export const SCENARIO_SUGGESTIONS: { phrase: string; icon: string }[] = [
  { phrase: 'feel good movies', icon: '😊' },
  { phrase: 'mind bending sci-fi', icon: '🧠' },
  { phrase: 'date night picks', icon: '💕' },
  { phrase: 'scary horror films', icon: '👻' },
  { phrase: 'funny comedies', icon: '😂' },
  { phrase: 'inspiring true stories', icon: '⭐' },
  { phrase: 'epic adventure films', icon: '🗺️' },
  { phrase: 'emotional dramas', icon: '😢' },
  { phrase: 'classic heist movies', icon: '🏦' },
  { phrase: 'anime to binge watch', icon: '🎌' },
  { phrase: 'family movie night', icon: '👨‍👩‍👧‍👦' },
  { phrase: 'thriller suspense', icon: '🔪' },
];

// ─── Streaming provider ID → name + URL (Where to Watch) ───

export const STREAMING_PROVIDERS: Record<number, { name: string; url: string }> = {
  8: { name: 'Netflix', url: 'https://www.netflix.com' },
  9: { name: 'Prime Video', url: 'https://www.amazon.com/gp/video' },
  337: { name: 'Disney+', url: 'https://www.disneyplus.com' },
  1899: { name: 'Max', url: 'https://play.max.com' },
  15: { name: 'Hulu', url: 'https://www.hulu.com' },
  531: { name: 'Paramount+', url: 'https://www.paramountplus.com' },
  350: { name: 'Apple TV+', url: 'https://tv.apple.com' },
  386: { name: 'Peacock', url: 'https://www.peacocktv.com' },
  283: { name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
};
