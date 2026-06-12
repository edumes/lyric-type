"use client";

import { SongCard } from "@/components/song-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { SongSearchResult } from "@/lib/types";

type SongResultsProps = {
  results: SongSearchResult[];
  loading: boolean;
  searched: boolean;
  selecting: boolean;
  onSelect: (song: SongSearchResult) => void;
};

export function SongResults({
  results,
  loading,
  searched,
  selecting,
  onSelect,
}: SongResultsProps) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] border border-zinc-800 bg-zinc-900/70" />
        ))}
      </div>
    );
  }

  if (searched && results.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">
        No matching LRCLIB songs were found.
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-[360px] pr-3">
      <div className="grid gap-3">
        {results.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            disabled={selecting}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
