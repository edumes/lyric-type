import { spawn } from "node:child_process";

import type { NextRequest } from "next/server";

import type { YouTubeVideoResult } from "@/lib/types";
import { extractYouTubeVideoId, toYouTubeWatchUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YTDLP_TIMEOUT_MS = 12_000;
const MAX_BUFFER_SIZE = 1024 * 1024;

type YtDlpEntry = {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  duration?: number;
  channel?: string;
  uploader?: string;
  playlist_index?: number;
  entries?: YtDlpEntry[];
};

class YtDlpError extends Error {
  constructor(
    message: string,
    readonly code: "missing" | "timeout" | "failed" | "empty",
  ) {
    super(message);
  }
}

function sanitizeSearchTerm(input: string) {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[^\p{L}\p{N}\s.'’&()\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function parseYtDlpOutput(output: string) {
  const entries: YtDlpEntry[] = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as YtDlpEntry;
      if (Array.isArray(parsed.entries)) {
        entries.push(...parsed.entries);
      } else {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return entries;
}

function runYtDlp(query: string) {
  return new Promise<YtDlpEntry[]>((resolve, reject) => {
    const childProcess = spawn(
      "yt-dlp",
      [
        `ytsearch5:${query}`,
        "--dump-json",
        "--flat-playlist",
        "--no-warnings",
        "--skip-download",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      callback();
    }

    const timeout = setTimeout(() => {
      childProcess.kill("SIGKILL");
      finish(() => {
        reject(new YtDlpError("yt-dlp timed out while searching YouTube.", "timeout"));
      });
    }, YTDLP_TIMEOUT_MS);

    childProcess.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_BUFFER_SIZE) {
        childProcess.kill("SIGKILL");
        finish(() => {
          reject(new YtDlpError("yt-dlp returned too much output.", "failed"));
        });
      }
    });

    childProcess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    childProcess.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(new YtDlpError("yt-dlp is not installed on this server.", "missing"));
        } else {
          reject(new YtDlpError(error.message, "failed"));
        }
      });
    });

    childProcess.on("close", (exitCode) => {
      finish(() => {
        if (exitCode !== 0) {
          reject(
            new YtDlpError(
              stderr.trim() || `yt-dlp exited with status ${exitCode}.`,
              "failed",
            ),
          );
          return;
        }

        const entries = parseYtDlpOutput(stdout);
        if (entries.length === 0) {
          reject(new YtDlpError("yt-dlp did not return any videos.", "empty"));
          return;
        }

        resolve(entries);
      });
    });
  });
}

function scoreEntry(
  entry: YtDlpEntry,
  input: { trackName: string; artistName: string; duration?: number },
) {
  const title = entry.title ?? "";
  const source = `${title} ${entry.channel ?? ""} ${entry.uploader ?? ""}`.toLowerCase();
  let score = 0;

  if (source.includes(input.trackName.toLowerCase())) {
    score += 20;
  }

  if (source.includes(input.artistName.toLowerCase())) {
    score += 20;
  }

  if (source.includes("official audio")) {
    score += 60;
  } else if (source.includes("official video")) {
    score += 48;
  } else if (source.includes("lyric video") || source.includes("lyrics")) {
    score += 36;
  }

  if (source.includes("vevo") || source.includes("official")) {
    score += 12;
  }

  if (typeof input.duration === "number" && typeof entry.duration === "number") {
    const difference = Math.abs(input.duration - entry.duration);
    if (difference <= 5) {
      score += 45;
    } else if (difference <= 15) {
      score += 30;
    } else if (difference <= 30) {
      score += 14;
    } else {
      score -= Math.min(30, Math.floor(difference / 10));
    }
  }

  for (const penalty of [
    "acoustic",
    "cover",
    "instrumental",
    "karaoke",
    "piano",
    "pianoforte",
    "reaction",
    "remix",
    "sped up",
    "slowed",
  ]) {
    if (source.includes(penalty)) {
      score -= 24;
    }
  }

  if (source.includes("live")) {
    score -= 18;
  }

  score -= entry.playlist_index ?? 0;

  return score;
}

function toVideoResult(entry: YtDlpEntry): YouTubeVideoResult | null {
  const videoId = extractYouTubeVideoId(
    entry.id ?? entry.webpage_url ?? entry.url ?? "",
  );

  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: entry.title || "YouTube result",
    url: toYouTubeWatchUrl(videoId),
    duration: typeof entry.duration === "number" ? entry.duration : undefined,
  };
}

export async function GET(request: NextRequest) {
  const trackName = sanitizeSearchTerm(
    request.nextUrl.searchParams.get("trackName") ?? "",
  );
  const artistName = sanitizeSearchTerm(
    request.nextUrl.searchParams.get("artistName") ?? "",
  );
  const durationParam = Number(request.nextUrl.searchParams.get("duration"));
  const duration = Number.isFinite(durationParam) && durationParam > 0 ? durationParam : undefined;

  if (!trackName || !artistName) {
    return Response.json(
      { error: "Missing trackName or artistName." },
      { status: 400 },
    );
  }

  const query = sanitizeSearchTerm(`${trackName} ${artistName} official audio`);

  try {
    const entries = await runYtDlp(query);
    const rankedResults = entries
      .map((entry) => ({
        result: toVideoResult(entry),
        score: scoreEntry(entry, { trackName, artistName, duration }),
      }))
      .filter(
        (entry): entry is { result: YouTubeVideoResult; score: number } =>
          entry.result !== null,
      )
      .sort((a, b) => b.score - a.score);

    const bestResult = rankedResults[0]?.result;
    if (!bestResult) {
      return Response.json(
        { error: "No playable YouTube video was found." },
        { status: 404 },
      );
    }

    return Response.json(bestResult);
  } catch (error) {
    if (error instanceof YtDlpError) {
      const status =
        error.code === "missing" ? 503 : error.code === "timeout" ? 504 : 502;

      return Response.json(
        {
          error: error.message,
          code: error.code,
        },
        { status },
      );
    }

    return Response.json(
      { error: "Unable to search YouTube with yt-dlp." },
      { status: 502 },
    );
  }
}
