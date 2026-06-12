import type { NextRequest } from "next/server";

import {
  LrclibRequestError,
  searchSongs,
  searchSongsByTrackAndArtist,
} from "@/lib/lrclib";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const trackName = request.nextUrl.searchParams.get("trackName")?.trim() ?? "";
  const artistName = request.nextUrl.searchParams.get("artistName")?.trim() ?? "";

  if (!query && (!trackName || !artistName)) {
    return Response.json(
      { error: "Missing search query, or trackName and artistName." },
      { status: 400 },
    );
  }

  try {
    const results =
      trackName && artistName
        ? await searchSongsByTrackAndArtist({ trackName, artistName })
        : await searchSongs(query);

    return Response.json({ results });
  } catch (error) {
    const status =
      error instanceof LrclibRequestError && error.status === 504 ? 504 : 503;

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to search LRCLIB right now.",
      },
      { status },
    );
  }
}
