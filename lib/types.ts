export type SongSearchResult = {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName?: string | null;
  duration?: number | null;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

export type SongDetails = SongSearchResult & {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
};

export type LyricsLine = {
  time: number;
  text: string;
};

export type TypingStats = {
  correctChars: number;
  wrongChars: number;
  completedLines: number;
  startedAt: number | null;
  elapsedSeconds: number;
  wpm: number;
  accuracy: number;
  progress: number;
};

export type YouTubeVideoResult = {
  videoId: string;
  title: string;
  url: string;
  duration?: number;
};

export type PlayerState = "idle" | "ready" | "playing" | "paused" | "finished";
