# Lyric Type

A Next.js App Router web app for synchronized music typing. Search LRCLIB for a song, load synchronized LRC lyrics, find a matching YouTube video on the backend with `yt-dlp`, then type the current lyric line while the app controls a blurred, darkened, non-interactive YouTube background.

## Local Setup

Install project dependencies:

```bash
npm install
```

This project includes shadcn/ui-style components under `components/ui`. To reproduce the setup from a fresh app, initialize shadcn/ui and add the required components:

```bash
npx shadcn@latest init
npx shadcn@latest add button input card dialog progress skeleton badge scroll-area tooltip
```

Install `yt-dlp` in the environment that runs the Next.js backend:

```bash
# macOS
brew install yt-dlp

# Linux
sudo apt install yt-dlp
# or
pipx install yt-dlp

# Windows
winget install yt-dlp.yt-dlp
```

Windows users can also install the official executable from the `yt-dlp` project releases and place it on `PATH`.

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Architecture

- `app/page.tsx` renders the client app shell.
- `app/api/lrclib/search/route.ts` proxies LRCLIB search.
- `app/api/lrclib/song/[id]/route.ts` loads selected song details.
- `app/api/youtube/search/route.ts` runs `yt-dlp "ytsearch5:{query}" --dump-json --flat-playlist` with a timeout and returns only metadata.
- `components/background-youtube-player.tsx` loads the YouTube IFrame API and exposes app-controlled `playVideo`, `pauseVideo`, `seekTo`, and `getCurrentTime`.
- `components/typing-game.tsx` polls YouTube playback time, selects the active lyric line, captures typing, and calculates metrics.
- `lib/lrc-parser.ts`, `lib/youtube.ts`, and `lib/typing-metrics.ts` contain parsing, video ID extraction, and WPM/accuracy logic.

The app does not use the YouTube Data API or any YouTube API key. YouTube lookup is performed only through the backend `yt-dlp` CLI and no audio or video is downloaded.

## Deployment Notes

`yt-dlp` is a server-side binary, so deployments must run in an environment that can install and execute it:

- VPS
- Docker
- Self-hosted Node.js server
- A platform that allows installing backend binaries

Restricted serverless environments may not support `yt-dlp`. In that case, the automatic video search can fail, and the app keeps a manual YouTube URL or ID fallback so a user can still start a session.

## Easypanel / Docker

This repository includes a production `Dockerfile` for VPS deployments through Easypanel.

In Easypanel:

- Create an app from this Git repository.
- Select Dockerfile-based build.
- Use port `3000`.
- No `YOUTUBE_API_KEY` is required.

The image installs `yt-dlp` in the runtime container with `pip`, then runs the app with:

```bash
npm start
```

You can verify the binary inside a running container with:

```bash
yt-dlp --version
```

## Next Steps

- Leaderboard
- Login
- Match history
- Song-specific rankings
- Multiplayer mode
- Karaoke mode without typing
