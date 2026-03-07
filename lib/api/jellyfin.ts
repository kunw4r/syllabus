// ─── Jellyfin API Client ───
// Connects to a self-hosted Jellyfin server for browsing & streaming

const DEVICE_ID = 'syllabus-web-client';
const CLIENT_NAME = 'Syllabus';
const CLIENT_VERSION = '1.0.0';

export interface JellyfinConfig {
  serverUrl: string;
  apiKey?: string;
  userId?: string;
  accessToken?: string;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
  ServerId: string;
  HasPassword: boolean;
  PrimaryImageTag?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: 'Movie' | 'Series' | 'Episode' | 'Season' | 'BoxSet' | 'MusicAlbum' | 'Audio' | 'Folder';
  Overview?: string;
  ProductionYear?: number;
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  UserData?: {
    PlaybackPositionTicks: number;
    PlayCount: number;
    IsFavorite: boolean;
    Played: boolean;
    UnplayedItemCount?: number;
  };
  MediaSources?: JellyfinMediaSource[];
  Genres?: string[];
  Studios?: { Name: string; Id: string }[];
  People?: { Id: string; Name: string; Role?: string; Type: string; PrimaryImageTag?: string }[];
  ProviderIds?: Record<string, string>;
}

export interface JellyfinMediaSource {
  Id: string;
  Name: string;
  Path?: string;
  Container: string;
  Size?: number;
  Bitrate?: number;
  MediaStreams: JellyfinMediaStream[];
  DirectPlaySupported?: boolean;
  TranscodingUrl?: string;
}

export interface JellyfinMediaStream {
  Type: 'Video' | 'Audio' | 'Subtitle';
  Codec: string;
  Language?: string;
  DisplayTitle?: string;
  Index: number;
  IsDefault: boolean;
  IsExternal: boolean;
  DeliveryUrl?: string;
}

export interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
  ImageTags?: Record<string, string>;
}

// ─── Storage helpers ───

const STORAGE_KEY = 'jellyfin_config';

export function getStoredConfig(): JellyfinConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeConfig(config: JellyfinConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Auth header ───

function authHeader(config: JellyfinConfig): Record<string, string> {
  const parts = [
    `MediaBrowser Client="${CLIENT_NAME}"`,
    `Device="Web Browser"`,
    `DeviceId="${DEVICE_ID}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (config.accessToken) {
    parts.push(`Token="${config.accessToken}"`);
  }
  return {
    'X-Emby-Authorization': parts.join(', '),
    'Content-Type': 'application/json',
  };
}

// ─── Core fetch ───

async function jfetch<T>(config: JellyfinConfig, path: string, options?: RequestInit): Promise<T> {
  const url = `${config.serverUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeader(config),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jellyfin ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return '' as unknown as T;
}

// ─── Server Info ───

export async function getServerInfo(serverUrl: string) {
  const res = await fetch(`${serverUrl.replace(/\/$/, '')}/System/Info/Public`);
  if (!res.ok) throw new Error('Cannot reach Jellyfin server');
  return res.json();
}

// ─── Authentication ───

export async function authenticateByName(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ User: JellyfinUser; AccessToken: string }> {
  const config: JellyfinConfig = { serverUrl };
  return jfetch(config, '/Users/AuthenticateByName', {
    method: 'POST',
    body: JSON.stringify({ Username: username, Pw: password }),
  });
}

// ─── Libraries ───

export async function getLibraries(config: JellyfinConfig): Promise<JellyfinLibrary[]> {
  const data = await jfetch<{ Items: JellyfinLibrary[] }>(
    config,
    `/Users/${config.userId}/Views`
  );
  return data.Items || [];
}

// ─── Browse Items ───

export async function getItems(
  config: JellyfinConfig,
  params: {
    parentId?: string;
    includeTypes?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    startIndex?: number;
    searchTerm?: string;
    genres?: string;
    filters?: string;
    fields?: string;
    recursive?: boolean;
  } = {}
): Promise<{ Items: JellyfinItem[]; TotalRecordCount: number }> {
  const query = new URLSearchParams();
  if (params.parentId) query.set('ParentId', params.parentId);
  if (params.includeTypes) query.set('IncludeItemTypes', params.includeTypes);
  if (params.sortBy) query.set('SortBy', params.sortBy);
  if (params.sortOrder) query.set('SortOrder', params.sortOrder);
  if (params.limit) query.set('Limit', String(params.limit));
  if (params.startIndex) query.set('StartIndex', String(params.startIndex));
  if (params.searchTerm) query.set('SearchTerm', params.searchTerm);
  if (params.genres) query.set('Genres', params.genres);
  if (params.filters) query.set('Filters', params.filters);
  if (params.recursive !== false) query.set('Recursive', 'true');
  query.set('Fields', params.fields || 'Overview,Genres,MediaSources,People,ProviderIds,Studios');

  return jfetch(config, `/Users/${config.userId}/Items?${query.toString()}`);
}

// ─── Get Single Item ───

export async function getItem(config: JellyfinConfig, itemId: string): Promise<JellyfinItem> {
  return jfetch(config, `/Users/${config.userId}/Items/${itemId}`);
}

// ─── Get Seasons ───

export async function getSeasons(config: JellyfinConfig, seriesId: string): Promise<JellyfinItem[]> {
  const data = await jfetch<{ Items: JellyfinItem[] }>(
    config,
    `/Shows/${seriesId}/Seasons?UserId=${config.userId}`
  );
  return data.Items || [];
}

// ─── Get Episodes ───

export async function getEpisodes(
  config: JellyfinConfig,
  seriesId: string,
  seasonId: string
): Promise<JellyfinItem[]> {
  const data = await jfetch<{ Items: JellyfinItem[] }>(
    config,
    `/Shows/${seriesId}/Episodes?SeasonId=${seasonId}&UserId=${config.userId}&Fields=Overview,MediaSources`
  );
  return data.Items || [];
}

// ─── Resume Items (Continue Watching) ───

export async function getResumeItems(config: JellyfinConfig, limit = 12): Promise<JellyfinItem[]> {
  const data = await jfetch<{ Items: JellyfinItem[] }>(
    config,
    `/Users/${config.userId}/Items/Resume?Limit=${limit}&Fields=Overview,MediaSources&MediaTypes=Video`
  );
  return data.Items || [];
}

// ─── Latest Items ───

export async function getLatestItems(config: JellyfinConfig, parentId?: string, limit = 20): Promise<JellyfinItem[]> {
  const query = new URLSearchParams({ Limit: String(limit), Fields: 'Overview,MediaSources' });
  if (parentId) query.set('ParentId', parentId);
  return jfetch(config, `/Users/${config.userId}/Items/Latest?${query.toString()}`);
}

// ─── Next Up (TV) ───

export async function getNextUp(config: JellyfinConfig, limit = 20): Promise<JellyfinItem[]> {
  const data = await jfetch<{ Items: JellyfinItem[] }>(
    config,
    `/Shows/NextUp?UserId=${config.userId}&Limit=${limit}&Fields=Overview,MediaSources`
  );
  return data.Items || [];
}

// ─── Similar Items ───

export async function getSimilarItems(config: JellyfinConfig, itemId: string, limit = 12): Promise<JellyfinItem[]> {
  const data = await jfetch<{ Items: JellyfinItem[] }>(
    config,
    `/Items/${itemId}/Similar?UserId=${config.userId}&Limit=${limit}&Fields=Overview`
  );
  return data.Items || [];
}

// ─── Playback Info (gets streaming URL) ───

export async function getPlaybackInfo(
  config: JellyfinConfig,
  itemId: string
): Promise<JellyfinMediaSource[]> {
  const data = await jfetch<{ MediaSources: JellyfinMediaSource[] }>(
    config,
    `/Items/${itemId}/PlaybackInfo?UserId=${config.userId}`,
    { method: 'POST', body: JSON.stringify({ DeviceProfile: getDeviceProfile() }) }
  );
  return data.MediaSources || [];
}

// ─── Stream URL builders ───

export function getStreamUrl(config: JellyfinConfig, itemId: string, mediaSourceId?: string): string {
  const base = config.serverUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    Static: 'true',
    api_key: config.accessToken || '',
  });
  if (mediaSourceId) params.set('MediaSourceId', mediaSourceId);
  return `${base}/Videos/${itemId}/stream?${params.toString()}`;
}

export function getHlsStreamUrl(config: JellyfinConfig, itemId: string, mediaSourceId?: string): string {
  const base = config.serverUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    DeviceId: DEVICE_ID,
    api_key: config.accessToken || '',
    VideoCodec: 'h264',
    AudioCodec: 'aac',
    MaxStreamingBitrate: '20000000',
    PlaySessionId: crypto.randomUUID(),
  });
  if (mediaSourceId) params.set('MediaSourceId', mediaSourceId);
  return `${base}/Videos/${itemId}/master.m3u8?${params.toString()}`;
}

// ─── Image URLs ───

export function getImageUrl(
  config: JellyfinConfig,
  itemId: string,
  type: 'Primary' | 'Backdrop' | 'Banner' | 'Thumb' | 'Logo' = 'Primary',
  maxWidth = 500
): string {
  const base = config.serverUrl.replace(/\/$/, '');
  return `${base}/Items/${itemId}/Images/${type}?maxWidth=${maxWidth}&quality=90`;
}

// ─── Progress Reporting ───

export async function reportPlaybackStart(config: JellyfinConfig, itemId: string, positionTicks = 0) {
  await jfetch(config, '/Sessions/Playing', {
    method: 'POST',
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: positionTicks,
      CanSeek: true,
      MediaSourceId: itemId,
    }),
  });
}

export async function reportPlaybackProgress(config: JellyfinConfig, itemId: string, positionTicks: number, isPaused = false) {
  await jfetch(config, '/Sessions/Playing/Progress', {
    method: 'POST',
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: positionTicks,
      IsPaused: isPaused,
      CanSeek: true,
      MediaSourceId: itemId,
    }),
  });
}

export async function reportPlaybackStopped(config: JellyfinConfig, itemId: string, positionTicks: number) {
  await jfetch(config, '/Sessions/Playing/Stopped', {
    method: 'POST',
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: positionTicks,
      MediaSourceId: itemId,
    }),
  });
}

// ─── Mark as Played/Unplayed ───

export async function markPlayed(config: JellyfinConfig, itemId: string) {
  await jfetch(config, `/Users/${config.userId}/PlayedItems/${itemId}`, { method: 'POST' });
}

export async function markUnplayed(config: JellyfinConfig, itemId: string) {
  await jfetch(config, `/Users/${config.userId}/PlayedItems/${itemId}`, { method: 'DELETE' });
}

// ─── Toggle Favorite ───

export async function toggleFavorite(config: JellyfinConfig, itemId: string, isFavorite: boolean) {
  await jfetch(config, `/Users/${config.userId}/FavoriteItems/${itemId}`, {
    method: isFavorite ? 'DELETE' : 'POST',
  });
}

// ─── Search ───

export async function searchJellyfin(config: JellyfinConfig, query: string, limit = 24) {
  return getItems(config, {
    searchTerm: query,
    includeTypes: 'Movie,Series,Episode',
    limit,
    sortBy: 'SortName',
    sortOrder: 'Ascending',
  });
}

// ─── Device Profile (for transcoding) ───

function getDeviceProfile() {
  return {
    MaxStreamingBitrate: 20000000,
    MaxStaticBitrate: 100000000,
    MusicStreamingTranscodingBitrate: 192000,
    DirectPlayProfiles: [
      { Container: 'mp4,m4v', Type: 'Video', VideoCodec: 'h264,h265,hevc,vp8,vp9,av1', AudioCodec: 'aac,mp3,opus,flac' },
      { Container: 'mkv', Type: 'Video', VideoCodec: 'h264,h265,hevc,vp8,vp9,av1', AudioCodec: 'aac,mp3,opus,flac,vorbis' },
      { Container: 'webm', Type: 'Video', VideoCodec: 'vp8,vp9,av1', AudioCodec: 'opus,vorbis' },
    ],
    TranscodingProfiles: [
      {
        Container: 'ts',
        Type: 'Video',
        VideoCodec: 'h264',
        AudioCodec: 'aac',
        Protocol: 'hls',
        Context: 'Streaming',
        MaxAudioChannels: '6',
        MinSegments: '2',
        BreakOnNonKeyFrames: true,
      },
    ],
    SubtitleProfiles: [
      { Format: 'vtt', Method: 'External' },
      { Format: 'srt', Method: 'External' },
      { Format: 'ass', Method: 'External' },
      { Format: 'ssa', Method: 'External' },
    ],
  };
}

// ─── Helpers ───

export function ticksToSeconds(ticks: number): number {
  return Math.floor(ticks / 10_000_000);
}

export function secondsToTicks(seconds: number): number {
  return Math.floor(seconds * 10_000_000);
}

export function formatDuration(ticks: number): string {
  const totalMin = Math.floor(ticks / 10_000_000 / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function getProgressPercent(item: JellyfinItem): number {
  if (!item.RunTimeTicks || !item.UserData?.PlaybackPositionTicks) return 0;
  return Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
}
