import type { SongDetails, SongSearchResult } from "@/lib/types";

const LRCLIB_BASE_URL = "https://lrclib.net/api";
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SONG_CACHE_TTL_MS = 20 * 60 * 1000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type RawLrclibSong = {
  id?: number;
  name?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string | null;
  duration?: number | null;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const searchCache = new Map<string, CacheEntry<SongSearchResult[]>>();
const songCache = new Map<string, CacheEntry<SongDetails>>();

export class LrclibRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttlMs: number,
) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

function normalizeSong(song: RawLrclibSong): SongSearchResult {
  const trackName = song.trackName || song.name || "Unknown track";

  return {
    id: Number(song.id),
    name: song.name || trackName,
    trackName,
    artistName: song.artistName || "Unknown artist",
    albumName: song.albumName ?? null,
    duration: typeof song.duration === "number" ? song.duration : null,
    instrumental: Boolean(song.instrumental),
    plainLyrics: song.plainLyrics ?? null,
    syncedLyrics: song.syncedLyrics ?? null,
  };
}

function normalizeSearchTerm(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 160);
}

function comparable(input: string) {
  return input
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAdvancedResult(
  song: SongSearchResult,
  input: { trackName: string; artistName: string },
) {
  const expectedTrack = comparable(input.trackName);
  const expectedArtist = comparable(input.artistName);
  const actualTrack = comparable(song.trackName);
  const actualArtist = comparable(song.artistName);

  let score = 0;

  if (actualTrack === expectedTrack) {
    score += 80;
  } else if (actualTrack.includes(expectedTrack) || expectedTrack.includes(actualTrack)) {
    score += 42;
  }

  if (actualArtist === expectedArtist) {
    score += 80;
  } else if (actualArtist.includes(expectedArtist) || expectedArtist.includes(actualArtist)) {
    score += 42;
  }

  if (song.syncedLyrics) {
    score += 12;
  }

  if (song.albumName) {
    score += 2;
  }

  return score;
}

async function fetchLrclib<T>(
  path: string,
  options: { attempts?: number; timeoutMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 18_000;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${LRCLIB_BASE_URL}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "lyric-type/0.1 (synchronized lyrics typing app)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (RETRYABLE_STATUSES.has(response.status) && attempt < attempts) {
        await sleep(500 * attempt);
        continue;
      }

      throw new LrclibRequestError(
        response.status === 504
          ? "LRCLIB is timing out right now. Try the search again in a moment."
          : `LRCLIB request failed with status ${response.status}.`,
        response.status,
      );
    } catch (error) {
      lastError = error;

      if (error instanceof LrclibRequestError) {
        throw error;
      }

      if (attempt < attempts) {
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  if (lastError instanceof Error && lastError.name === "TimeoutError") {
    throw new LrclibRequestError(
      "LRCLIB is taking too long to respond. Try a more specific search or try again in a moment.",
      504,
    );
  }

  throw new LrclibRequestError(
    "Unable to reach LRCLIB right now. Try again in a moment.",
  );
}

export async function searchSongs(query: string): Promise<SongSearchResult[]> {
  const sanitizedQuery = normalizeSearchTerm(query);
  if (!sanitizedQuery) {
    return [];
  }

  const cacheKey = sanitizedQuery.toLocaleLowerCase();
  const cached = getCached(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const songs = await fetchLrclib<RawLrclibSong[]>(
    `/search?q=${encodeURIComponent(sanitizedQuery)}`,
    { attempts: 3, timeoutMs: 20_000 },
  );

  const normalizedSongs = songs
    .filter((song) => typeof song.id === "number")
    .map(normalizeSong);

  setCached(searchCache, cacheKey, normalizedSongs, SEARCH_CACHE_TTL_MS);

  return normalizedSongs;
}

export async function searchSongsByTrackAndArtist(input: {
  trackName: string;
  artistName: string;
}): Promise<SongSearchResult[]> {
  const trackName = normalizeSearchTerm(input.trackName);
  const artistName = normalizeSearchTerm(input.artistName);

  if (!trackName || !artistName) {
    return [];
  }

  const cacheKey = `advanced:${trackName.toLocaleLowerCase()}:${artistName.toLocaleLowerCase()}`;
  const cached = getCached(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const combinedResults = await searchSongs(`${trackName} ${artistName}`);
  const rankedResults = combinedResults
    .map((song) => ({
      song,
      score: scoreAdvancedResult(song, { trackName, artistName }),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ song }) => song);

  setCached(searchCache, cacheKey, rankedResults, SEARCH_CACHE_TTL_MS);

  return rankedResults;
}

export async function getSongById(id: string): Promise<SongDetails> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("Invalid LRCLIB song id");
  }

  const cacheKey = String(numericId);
  const cached = getCached(songCache, cacheKey);
  if (cached) {
    return cached;
  }

  const song = await fetchLrclib<RawLrclibSong>(`/get/${numericId}`, {
    attempts: 3,
    timeoutMs: 20_000,
  });
  const normalizedSong = normalizeSong(song);

  setCached(songCache, cacheKey, normalizedSong, SONG_CACHE_TTL_MS);

  return normalizedSong;
}
