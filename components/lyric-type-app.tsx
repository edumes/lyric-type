"use client";

import { Keyboard, Loader2, Music2 } from "lucide-react";
import { useState } from "react";

import { SongResults } from "@/components/song-results";
import { SongSearch } from "@/components/song-search";
import { TypingGame } from "@/components/typing-game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { parseLRC } from "@/lib/lrc-parser";
import type {
  LyricsLine,
  SongDetails,
  SongSearchResult,
  YouTubeVideoResult,
} from "@/lib/types";
import { extractYouTubeVideoId, toYouTubeWatchUrl } from "@/lib/youtube";

type ApiErrorResponse = {
  error?: string;
  code?: string;
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    return payload.error || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function LyricTypeApp() {
  const [searchMode, setSearchMode] = useState<"simple" | "advanced">("simple");
  const [query, setQuery] = useState("");
  const [trackQuery, setTrackQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [results, setResults] = useState<SongSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedResult, setSelectedResult] = useState<SongSearchResult | null>(null);
  const [song, setSong] = useState<SongDetails | null>(null);
  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  const [video, setVideo] = useState<YouTubeVideoResult | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [manualVideoInput, setManualVideoInput] = useState("");
  const [manualVideoError, setManualVideoError] = useState<string | null>(null);

  const resetSelection = () => {
    setSelectedResult(null);
    setSong(null);
    setLyrics([]);
    setSelecting(false);
    setLyricsLoading(false);
    setLyricsError(null);
    setVideo(null);
    setVideoLoading(false);
    setVideoError(null);
    setManualVideoInput("");
    setManualVideoError(null);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const trimmedTrackQuery = trackQuery.trim();
    const trimmedArtistQuery = artistQuery.trim();

    if (
      (searchMode === "simple" && !trimmedQuery) ||
      (searchMode === "advanced" && (!trimmedTrackQuery || !trimmedArtistQuery))
    ) {
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(true);
    resetSelection();

    try {
      const params = new URLSearchParams();

      if (searchMode === "advanced") {
        params.set("trackName", trimmedTrackQuery);
        params.set("artistName", trimmedArtistQuery);
      } else {
        params.set("q", trimmedQuery);
      }

      const response = await fetch(`/api/lrclib/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as { results: SongSearchResult[] };
      setResults(payload.results ?? []);
    } catch (error) {
      setResults([]);
      setSearchError(
        error instanceof Error ? error.message : "Unable to search for songs.",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSongSelect = async (result: SongSearchResult) => {
    setSelectedResult(result);
    setSong(null);
    setLyrics([]);
    setVideo(null);
    setLyricsError(null);
    setVideoError(null);
    setManualVideoError(null);
    setSelecting(true);
    setLyricsLoading(true);

    let loadedSong: SongDetails | null = null;
    let parsedLyrics: LyricsLine[] = [];

    try {
      const response = await fetch(`/api/lrclib/song/${result.id}`);

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as { song: SongDetails };
      loadedSong = payload.song;
      parsedLyrics = parseLRC(loadedSong.syncedLyrics);

      if (!loadedSong.syncedLyrics || parsedLyrics.length === 0) {
        setLyricsError("This song does not have synchronized lyrics available.");
        return;
      }

      setSong(loadedSong);
      setLyrics(parsedLyrics);
      setLyricsLoading(false);
      setVideoLoading(true);

      const params = new URLSearchParams({
        trackName: loadedSong.trackName,
        artistName: loadedSong.artistName,
      });

      if (loadedSong.duration) {
        params.set("duration", String(loadedSong.duration));
      }

      const videoResponse = await fetch(`/api/youtube/search?${params.toString()}`);

      if (!videoResponse.ok) {
        throw new Error(await readApiError(videoResponse));
      }

      const foundVideo = (await videoResponse.json()) as YouTubeVideoResult;
      setVideo(foundVideo);
    } catch (error) {
      if (!loadedSong || parsedLyrics.length === 0) {
        setLyricsError(
          error instanceof Error ? error.message : "Unable to load song lyrics.",
        );
      } else {
        setVideoError(
          error instanceof Error
            ? error.message
            : "Unable to find a matching YouTube video.",
        );
      }
    } finally {
      setSelecting(false);
      setLyricsLoading(false);
      setVideoLoading(false);
    }
  };

  const handleManualVideoSubmit = () => {
    setManualVideoError(null);
    const videoId = extractYouTubeVideoId(manualVideoInput);

    if (!videoId) {
      setManualVideoError("Enter a valid YouTube URL or video ID.");
      return;
    }

    setVideo({
      videoId,
      title: "Manual YouTube video",
      url: toYouTubeWatchUrl(videoId),
      duration: song?.duration ?? undefined,
    });
    setVideoError(null);
  };

  if (song && lyrics.length > 0 && video) {
    return (
      <TypingGame
        song={song}
        lyrics={lyrics}
        video={video}
        onChangeSong={resetSelection}
      />
    );
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-amber-300/10 text-amber-200">
              <Keyboard className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-50">Lyric Type</h1>
              <p className="text-sm text-zinc-400">music-synced typing practice</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-zinc-50">Find a song</CardTitle>
            <CardDescription>
              Search LRCLIB by free text or separate song and artist fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SongSearch
              mode={searchMode}
              query={query}
              trackName={trackQuery}
              artistName={artistQuery}
              loading={searchLoading}
              onModeChange={setSearchMode}
              onQueryChange={setQuery}
              onTrackNameChange={setTrackQuery}
              onArtistNameChange={setArtistQuery}
              onSearch={handleSearch}
            />
            {searchError ? (
              <div className="rounded-md border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-100">
                {searchError}
              </div>
            ) : null}
            <SongResults
              results={results}
              loading={searchLoading}
              searched={hasSearched}
              selecting={selecting}
              onSelect={handleSongSelect}
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Music2 className="size-5 text-amber-200" />
              Session
            </CardTitle>
            <CardDescription>
              Select a synchronized lyric result to prepare playback.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!selectedResult ? (
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-5 text-sm text-zinc-400">
                Waiting for a song selection.
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-base font-medium text-zinc-50">
                  {selectedResult.trackName}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {selectedResult.artistName}
                  {selectedResult.albumName ? ` - ${selectedResult.albumName}` : ""}
                </div>
              </div>
            )}

            {lyricsLoading ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin" />
                  Loading synchronized lyrics
                </div>
                <Skeleton className="h-24 bg-zinc-900" />
              </div>
            ) : null}

            {lyricsError ? (
              <div className="rounded-lg border border-amber-300/30 bg-amber-950/20 p-4 text-sm text-amber-100">
                {lyricsError}
              </div>
            ) : null}

            {song && lyrics.length > 0 ? (
              <div className="rounded-lg border border-emerald-300/25 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                {lyrics.length} synchronized lyric lines loaded.
              </div>
            ) : null}

            {videoLoading ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin" />
                  Searching YouTube with yt-dlp
                </div>
                <Skeleton className="h-20 bg-zinc-900" />
              </div>
            ) : null}

            {videoError && song ? (
              <div className="grid gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-sm text-zinc-300">{videoError}</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={manualVideoInput}
                    onChange={(event) => setManualVideoInput(event.target.value)}
                    placeholder="YouTube URL or ID"
                    aria-label="Manual YouTube URL or ID"
                    className="border-zinc-700 bg-zinc-950"
                  />
                  <Button type="button" onClick={handleManualVideoSubmit}>
                    Use video
                  </Button>
                </div>
                {manualVideoError ? (
                  <div className="text-sm text-red-300">{manualVideoError}</div>
                ) : null}
              </div>
            ) : null}

            {selectedResult ? (
              <Button type="button" variant="outline" onClick={resetSelection}>
                Change song
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
