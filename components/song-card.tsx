"use client";

import { Music2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SongSearchResult } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type SongCardProps = {
  song: SongSearchResult;
  disabled?: boolean;
  onSelect: (song: SongSearchResult) => void;
};

export function SongCard({ song, disabled, onSelect }: SongCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(song)}
      className="block w-full rounded-lg text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
    >
      <Card className="border-zinc-800/90 bg-zinc-950/80 transition-colors hover:border-amber-300/50 hover:bg-zinc-900/90">
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-300/10 text-amber-200">
            <Music2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium text-zinc-50">
              {song.trackName}
            </span>
            <span className="block truncate text-sm text-zinc-400">
              {song.artistName}
              {song.albumName ? ` - ${song.albumName}` : ""}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant={song.syncedLyrics ? "default" : "secondary"}>
              {song.syncedLyrics ? "synced" : "check"}
            </Badge>
            <span className="font-mono text-xs text-zinc-500">
              {formatDuration(song.duration)}
            </span>
          </span>
        </CardContent>
      </Card>
    </button>
  );
}
