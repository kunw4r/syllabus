'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronDown, Play, Star } from 'lucide-react';
import VideoPlayer from '@/components/ui/VideoPlayer';
import ScrollRow from '@/components/ui/ScrollRow';
import {
  getStoredConfig,
  getItem,
  getPlaybackInfo,
  getStreamUrl,
  getHlsStreamUrl,
  getImageUrl,
  getSeasons,
  getEpisodes,
  getSimilarItems,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  ticksToSeconds,
  secondsToTicks,
  formatDuration,
  getProgressPercent,
  type JellyfinConfig,
  type JellyfinItem,
  type JellyfinMediaSource,
} from '@/lib/api/jellyfin';
import { getRatingBg, getRatingGlow, getRatingHex } from '@/lib/utils/rating-colors';

export default function WatchPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<JellyfinConfig | null>(null);
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [startPos, setStartPos] = useState(0);
  const [mediaSources, setMediaSources] = useState<JellyfinMediaSource[]>([]);

  // TV series state
  const [isSeries, setIsSeries] = useState(false);
  const [seasons, setSeasons] = useState<JellyfinItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<JellyfinItem | null>(null);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<JellyfinItem | null>(null);
  const [similar, setSimilar] = useState<JellyfinItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const progressTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const lastPosition = useRef(0);

  useEffect(() => {
    const cfg = getStoredConfig();
    if (!cfg?.accessToken) {
      router.push('/streaming/settings');
      return;
    }
    setConfig(cfg);
    loadItem(cfg, id);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [id, router]);

  async function loadItem(cfg: JellyfinConfig, itemId: string) {
    setLoading(true);
    try {
      const data = await getItem(cfg, itemId);
      setItem(data);

      if (data.Type === 'Series') {
        setIsSeries(true);
        const ss = await getSeasons(cfg, itemId);
        setSeasons(ss);
        if (ss.length > 0) {
          setSelectedSeason(ss[0]);
          const eps = await getEpisodes(cfg, itemId, ss[0].Id);
          setEpisodes(eps);
          // Auto-play first unwatched episode
          const unwatched = eps.find((e) => !e.UserData?.Played);
          if (unwatched) {
            await preparePlayback(cfg, unwatched);
            setCurrentEpisode(unwatched);
          } else if (eps.length > 0) {
            await preparePlayback(cfg, eps[0]);
            setCurrentEpisode(eps[0]);
          }
        }
      } else if (data.Type === 'Movie' || data.Type === 'Episode') {
        await preparePlayback(cfg, data);
      }

      // Load similar
      getSimilarItems(cfg, itemId).then(setSimilar).catch(() => {});
    } catch (err) {
      console.error('[Watch] Failed to load:', err);
    }
    setLoading(false);
  }

  async function preparePlayback(cfg: JellyfinConfig, playItem: JellyfinItem) {
    const sources = await getPlaybackInfo(cfg, playItem.Id);
    setMediaSources(sources);

    if (sources.length > 0) {
      const source = sources[0];
      // Try direct play first, fall back to HLS transcoding
      const url = source.DirectPlaySupported !== false
        ? getStreamUrl(cfg, playItem.Id, source.Id)
        : getHlsStreamUrl(cfg, playItem.Id, source.Id);
      setStreamUrl(url);
    }

    // Resume position
    const pos = playItem.UserData?.PlaybackPositionTicks
      ? ticksToSeconds(playItem.UserData.PlaybackPositionTicks)
      : 0;
    setStartPos(pos);

    // Report playback start
    reportPlaybackStart(cfg, playItem.Id, playItem.UserData?.PlaybackPositionTicks || 0).catch(() => {});
  }

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      lastPosition.current = currentTime;
    },
    []
  );

  // Periodic progress reporting
  useEffect(() => {
    if (!config || !item) return;
    const playingId = currentEpisode?.Id || item.Id;
    if (item.Type === 'Series' && !currentEpisode) return;

    progressTimer.current = setInterval(() => {
      if (lastPosition.current > 0) {
        reportPlaybackProgress(
          config,
          playingId,
          secondsToTicks(lastPosition.current)
        ).catch(() => {});
      }
    }, 10000);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      // Report stop when leaving
      if (lastPosition.current > 0) {
        reportPlaybackStopped(config, playingId, secondsToTicks(lastPosition.current)).catch(() => {});
      }
    };
  }, [config, item, currentEpisode]);

  const handleEnded = useCallback(() => {
    if (!config || !currentEpisode) return;
    // Report as complete
    reportPlaybackStopped(config, currentEpisode.Id, currentEpisode.RunTimeTicks || 0).catch(() => {});

    // Auto-play next episode
    const idx = episodes.findIndex((e) => e.Id === currentEpisode.Id);
    if (idx >= 0 && idx < episodes.length - 1) {
      const next = episodes[idx + 1];
      setCurrentEpisode(next);
      preparePlayback(config, next);
    }
  }, [config, currentEpisode, episodes]);

  const selectSeason = async (season: JellyfinItem) => {
    if (!config || !item) return;
    setSelectedSeason(season);
    const eps = await getEpisodes(config, item.Id, season.Id);
    setEpisodes(eps);
  };

  const playEpisode = async (ep: JellyfinItem) => {
    if (!config) return;
    setCurrentEpisode(ep);
    await preparePlayback(config, ep);
  };

  if (loading || !item || !config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const activeItem = currentEpisode || item;
  const rating = activeItem.CommunityRating;

  return (
    <div className="-mx-5 sm:-mx-8 lg:-mx-14 xl:-mx-20 2xl:-mx-28 -mt-6 lg:-mt-4">
      {/* Video Player */}
      {streamUrl && (
        <div className="w-full aspect-video max-h-[75vh] bg-black">
          <VideoPlayer
            src={streamUrl}
            title={activeItem.Name}
            subtitle={
              activeItem.Type === 'Episode'
                ? `${activeItem.SeriesName || item.Name} — S${activeItem.ParentIndexNumber || 0}E${activeItem.IndexNumber || 0}`
                : undefined
            }
            posterUrl={getImageUrl(config, activeItem.Id, 'Backdrop', 1280)}
            startPositionSeconds={startPos}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onBack={() => router.push('/streaming')}
          />
        </div>
      )}

      {/* Info section */}
      <div className="px-5 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <div className="max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {isSeries ? item.Name : activeItem.Name}
          </h1>

          <div className="flex items-center gap-3 text-sm text-white/50 mb-4">
            {rating && rating > 0 && (
              <span
                className="inline-flex items-center gap-1 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5"
                style={{ background: getRatingBg(rating), boxShadow: getRatingGlow(rating) }}
              >
                <Star size={14} className="fill-current" style={{ color: getRatingHex(rating) }} />
                <span style={{ color: getRatingHex(rating) }}>{rating.toFixed(1)}</span>
              </span>
            )}
            {activeItem.ProductionYear && <span>{activeItem.ProductionYear}</span>}
            {activeItem.RunTimeTicks && <span>{formatDuration(activeItem.RunTimeTicks)}</span>}
            {activeItem.OfficialRating && (
              <span className="border border-white/20 rounded px-1.5 py-0.5 text-xs">{activeItem.OfficialRating}</span>
            )}
            {activeItem.Genres && activeItem.Genres.length > 0 && (
              <span>{activeItem.Genres.slice(0, 3).join(', ')}</span>
            )}
          </div>

          {/* Episode title for series */}
          {currentEpisode && (
            <p className="text-white/70 text-sm mb-2">
              S{currentEpisode.ParentIndexNumber || 0}E{currentEpisode.IndexNumber || 0} &mdash; {currentEpisode.Name}
            </p>
          )}

          {activeItem.Overview && (
            <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-2xl">
              {activeItem.Overview}
            </p>
          )}
        </div>

        {/* Season / Episode picker for Series */}
        {isSeries && seasons.length > 0 && (
          <div className="mt-8">
            {/* Season selector */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold">Episodes</h2>
              <div className="relative">
                <select
                  value={selectedSeason?.Id || ''}
                  onChange={(e) => {
                    const s = seasons.find((s) => s.Id === e.target.value);
                    if (s) selectSeason(s);
                  }}
                  className="appearance-none bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-sm cursor-pointer hover:bg-white/15 transition-colors"
                >
                  {seasons.map((s) => (
                    <option key={s.Id} value={s.Id} className="bg-dark-800">
                      {s.Name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/50" />
              </div>
            </div>

            {/* Episodes list */}
            <div className="space-y-2">
              {episodes.map((ep) => {
                const isActive = currentEpisode?.Id === ep.Id;
                const progress = getProgressPercent(ep);
                return (
                  <button
                    key={ep.Id}
                    onClick={() => playEpisode(ep)}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-accent/10 border border-accent/20'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-white/5 shrink-0">
                      <img
                        src={getImageUrl(config, ep.Id, 'Primary', 300)}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play size={20} className="fill-white" />
                        </div>
                      )}
                      {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/40 text-xs">E{ep.IndexNumber || 0}</span>
                        <h3 className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-white'}`}>
                          {ep.Name}
                        </h3>
                      </div>
                      {ep.Overview && (
                        <p className="text-white/30 text-xs line-clamp-2 leading-relaxed">{ep.Overview}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/30">
                        {ep.RunTimeTicks && <span>{formatDuration(ep.RunTimeTicks)}</span>}
                        {ep.UserData?.Played && <span className="text-accent">Watched</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Similar Items */}
        {similar.length > 0 && (
          <div className="mt-10">
            <ScrollRow title="More Like This">
              {similar.map((s) => (
                <button
                  key={s.Id}
                  onClick={() => router.push(`/streaming/watch/${s.Id}`)}
                  className="group shrink-0 w-[140px]"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-2">
                    <img
                      src={getImageUrl(config, s.Id, 'Primary', 300)}
                      alt={s.Name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={20} className="fill-white" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white truncate">{s.Name}</p>
                </button>
              ))}
            </ScrollRow>
          </div>
        )}
      </div>
    </div>
  );
}
