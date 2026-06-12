import type { LyricsLine } from "@/lib/types";

const TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function parseTimestamp(minutes: string, seconds: string, fraction = "0") {
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);
  const divisor = fraction.length === 3 ? 1000 : fraction.length === 2 ? 100 : 10;
  const parsedFraction = Number(fraction) / divisor;

  if (
    !Number.isFinite(parsedMinutes) ||
    !Number.isFinite(parsedSeconds) ||
    !Number.isFinite(parsedFraction)
  ) {
    return null;
  }

  return parsedMinutes * 60 + parsedSeconds + parsedFraction;
}

export function parseLRC(syncedLyrics?: string | null): LyricsLine[] {
  if (!syncedLyrics) {
    return [];
  }

  const lines: LyricsLine[] = [];

  for (const rawLine of syncedLyrics.split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(TIMESTAMP_PATTERN)];
    if (timestamps.length === 0) {
      continue;
    }

    const text = rawLine.replace(TIMESTAMP_PATTERN, "").trim();
    if (!text) {
      continue;
    }

    for (const timestamp of timestamps) {
      const time = parseTimestamp(timestamp[1], timestamp[2], timestamp[3] ?? "0");
      if (time === null) {
        continue;
      }

      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function getActiveLyricIndex(lines: LyricsLine[], currentTime: number) {
  if (lines.length === 0) {
    return -1;
  }

  let activeIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].time <= currentTime) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
}
