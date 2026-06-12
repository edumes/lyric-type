"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TypingStats } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type ResultModalProps = {
  open: boolean;
  stats: TypingStats;
  elapsedSeconds: number;
  onOpenChange: (open: boolean) => void;
  onRestart: () => void;
  onChangeSong: () => void;
};

export function ResultModal({
  open,
  stats,
  elapsedSeconds,
  onOpenChange,
  onRestart,
  onChangeSong,
}: ResultModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Final result</DialogTitle>
          <DialogDescription>
            {formatDuration(elapsedSeconds)} elapsed, {stats.completedLines} lines completed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-500">wpm</div>
            <div className="font-mono text-3xl text-amber-100">{stats.wpm}</div>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-500">accuracy</div>
            <div className="font-mono text-3xl text-emerald-200">
              {stats.accuracy}%
            </div>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-500">correct</div>
            <div className="font-mono text-3xl text-zinc-100">
              {stats.correctChars}
            </div>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-500">wrong</div>
            <div className="font-mono text-3xl text-red-300">{stats.wrongChars}</div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onChangeSong}>
            Change song
          </Button>
          <Button type="button" onClick={onRestart}>
            Restart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
