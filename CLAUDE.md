# Syllabus — Streaming Branch

## Branch: `feature/streaming`
This branch adds Jellyfin media server integration for browsing and streaming personal media libraries.

## Project Stack
- Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 3
- Framer Motion (uses `m` from framer-motion, not `motion`)
- Supabase for backend auth/data
- hls.js for HLS video playback
- Dark cinematic UI theme (bg: #0e1117)

## Streaming Architecture

### Key Files
- `lib/api/jellyfin.ts` — Jellyfin API client (auth, browsing, playback, subtitles, progress)
- `lib/api/opensubtitles.ts` — OpenSubtitles API for external subtitle fetching
- `components/ui/VideoPlayer.tsx` — Custom video player with HLS, subtitles, PiP, quality/source selection
- `app/(main)/streaming/page.tsx` — Streaming library browser (home, movies, tv, search tabs)
- `app/(main)/streaming/settings/page.tsx` — Jellyfin server connection settings
- `app/(main)/streaming/watch/[id]/page.tsx` — Watch page with player, episodes, similar items

### How It Works
1. User connects to their Jellyfin server at `/streaming/settings`
2. Credentials stored in localStorage (never sent to Syllabus servers)
3. Browse library at `/streaming` — shows continue watching, next up, latest
4. Watch content at `/streaming/watch/[id]` — direct play or HLS transcode
5. Subtitles from Jellyfin server + OpenSubtitles fallback
6. Progress syncs back to Jellyfin every 10s

### Video Player Features
- HLS.js for non-Safari browsers, native HLS for Safari
- Keyboard shortcuts: space/k (play/pause), f (fullscreen), m (mute), arrows (seek/volume), c (subtitles), p (PiP)
- Settings panel: quality, source, subtitles (with delay/styles), audio tracks
- Picture-in-Picture with subtitle support (canvas-based rendering)
- Subtitle auto-select based on browser language
- External subtitle upload (SRT/VTT)

### Testing Locally
```bash
git checkout feature/streaming
npm install
npm run dev
# Navigate to http://localhost:3000/streaming/settings
# Enter your Jellyfin server URL and credentials
```

## Conventions
- Always commit and push after making changes
- Use `getRatingBg`/`getRatingGlow`/`getRatingHex` for dynamic rating colors
- Framer Motion variants need `as const` on ease arrays for TypeScript
- Quote paths with parentheses in shell commands: `git add "app/(main)/..."`
