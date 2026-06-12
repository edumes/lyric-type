"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchMode = "simple" | "advanced";

type SongSearchProps = {
  mode: SearchMode;
  query: string;
  trackName: string;
  artistName: string;
  loading: boolean;
  onModeChange: (mode: SearchMode) => void;
  onQueryChange: (query: string) => void;
  onTrackNameChange: (trackName: string) => void;
  onArtistNameChange: (artistName: string) => void;
  onSearch: () => void;
};

export function SongSearch({
  mode,
  query,
  trackName,
  artistName,
  loading,
  onModeChange,
  onQueryChange,
  onTrackNameChange,
  onArtistNameChange,
  onSearch,
}: SongSearchProps) {
  const canSearch =
    mode === "advanced"
      ? Boolean(trackName.trim() && artistName.trim())
      : Boolean(query.trim());

  return (
    <form
      className="grid w-full gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <div className="flex w-fit rounded-md border border-zinc-800 bg-zinc-950/80 p-1">
        {(["simple", "advanced"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={mode === option ? "secondary" : "ghost"}
            onClick={() => onModeChange(option)}
            className={cn("h-8 px-3", mode === option && "text-zinc-50")}
          >
            {option === "simple" ? "Basic" : "Advanced"}
          </Button>
        ))}
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        {mode === "advanced" ? (
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <Input
              aria-label="Track name"
              value={trackName}
              onChange={(event) => onTrackNameChange(event.target.value)}
              placeholder="song name"
              className="h-12 border-zinc-700/80 bg-zinc-950/70 text-base"
            />
            <Input
              aria-label="Artist name"
              value={artistName}
              onChange={(event) => onArtistNameChange(event.target.value)}
              placeholder="artist name"
              className="h-12 border-zinc-700/80 bg-zinc-950/70 text-base"
            />
          </div>
        ) : (
          <Input
            aria-label="Song search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="song, artist, or lyric"
            className="h-12 border-zinc-700/80 bg-zinc-950/70 text-base"
          />
        )}
        <Button type="submit" className="h-12 sm:w-36" disabled={loading || !canSearch}>
          <Search />
          Search
        </Button>
      </div>
    </form>
  );
}
