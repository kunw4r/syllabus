# Syllabus — Streaming Branch

## Branch: `feature/streaming`
This branch adds streaming/watching capabilities to the Syllabus detail pages. Movies and TV shows can be streamed via embedded providers or downloaded via torrents.

## Project Stack
- Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 3
- Framer Motion (uses `m` from framer-motion, not `motion`)
- Supabase for backend auth/data
- hls.js for HLS video playback
- Dark cinematic UI theme (bg: #0e1117)

## Streaming Architecture

### How It Works
1. User clicks **Watch Now** on any movie/TV detail page
2. Server-side API (`/api/resolve-stream`) checks all 6 providers in parallel
3. Cinematic loading screen with cycling movie backdrops while checking
4. First working provider loads in full-screen iframe
5. Provider's own player handles video, subtitles, quality
6. Hover top bar: server switcher, episode navigator (TV), reload, close
7. Auto-adds to library as "watching" (continue watching)

### Key Files — Streaming
- `components/details/StreamingModal.tsx` — Full-screen streaming experience
  - Server-side auto-cycling (checks which providers are up)
  - Cinematic loading screen with backdrop cycling
  - TV episode browser with season tabs + thumbnails
  - Prev/next episode navigation
  - Server switcher dropdown
  - Continue watching integration
- `app/api/resolve-stream/route.ts` — Server-side provider health checker
  - Checks all 6 embed providers in parallel (5s timeout each)
  - Returns working providers sorted by reliability
  - Validates response content (not just HTTP 200)
- `app/api/sources/route.ts` — Torrent source search (YTS movies, EZTV TV)
- `app/api/torrent/route.ts` — qBittorrent WebAPI proxy (add/status/delete)
- `app/api/stream/route.ts` — Local video file streaming with range requests

### Key Files — Jellyfin Integration
- `lib/api/jellyfin.ts` — Jellyfin API client (auth, browsing, playback, progress)
- `lib/api/opensubtitles.ts` — OpenSubtitles API for subtitle fetching
- `components/ui/VideoPlayer.tsx` — Custom video player with HLS, subtitles, PiP
- `app/(main)/streaming/page.tsx` — Jellyfin library browser
- `app/(main)/streaming/watch/[id]/page.tsx` — Jellyfin watch page

### Key Files — Torrent/Download
- `lib/api/torrent-sources.ts` — YTS (movies) + EZTV (TV) torrent search
- `lib/api/qbittorrent.ts` — qBittorrent WebAPI client

### Embed Providers (in priority order)
1. VidSrc PRO (`vidsrc.pro`)
2. Embed.su (`embed.su`)
3. VidSrc ICU (`vidsrc.icu`)
4. VidSrc CC (`vidsrc.cc`)
5. SuperEmbed (`multiembed.mov`)
6. AutoEmbed (`player.autoembed.cc`)

### Docker Media Stack (~/media-server/)
- Jellyfin (:8096), Radarr (:7878), Sonarr (:8989)
- Prowlarr (:9696), Bazarr (:6767), qBittorrent (:8080)
- qBittorrent credentials: admin / ZU4C2CcRY (temp password)

## Planned Features (Next Phase)
These require a stream URL extraction backend:
- **Custom video player for streams** — extract m3u8/mp4 URLs from providers, play in our VideoPlayer instead of iframe
- **Our own subtitle overlay** — OpenSubtitles integration with our player (language picker, delay, styles)
- **Skip Intro** — requires timing data (could use chapter markers or audio fingerprinting)
- **Episode browser in player** — with thumbnails, descriptions, "Show more" (partially done)
- **Continue Watching progress** — track playback position, resume from where you left off

### Implementation Plan for Stream Extraction
1. Research `@movie-web/providers` or build custom extractors
2. Server-side route fetches embed HTML → decrypts/finds m3u8 URL
3. Return direct URL to client → play in our VideoPlayer with HLS.js
4. Add OpenSubtitles subtitle tracks as VTT to the player
5. Provider-specific extraction (each encrypts differently, needs maintenance)

## Conventions
- Always commit and push after making changes
- Use `getRatingBg`/`getRatingGlow`/`getRatingHex` for dynamic rating colors
- Framer Motion variants need `as const` on ease arrays for TypeScript
- Quote paths with parentheses in shell commands: `git add "app/(main)/..."`
- Download sources capped at 4GB max
- YTS domain: `yts.torrentbay.st` (yts.mx blocked)
