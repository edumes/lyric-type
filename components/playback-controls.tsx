"use client";

import { Gauge, ListMusic, Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/utils";

type PlaybackControlsProps = {
  canPlay: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration?: number | null;
  progress: number;
  playbackRate: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onChangeSong: () => void;
  onPlaybackRateChange: (rate: number) => void;
};

const playbackRates = [0.5, 0.75, 1];

export function PlaybackControls({
  canPlay,
  isPlaying,
  currentTime,
  duration,
  progress,
  playbackRate,
  onPlayPause,
  onRestart,
  onChangeSong,
  onPlaybackRateChange,
}: PlaybackControlsProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-800/90 bg-black/40 p-3 backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Button
            type="button"
            size="lg"
            disabled={!canPlay}
            onClick={onPlayPause}
            className="w-full sm:w-36"
          >
            {isPlaying ? <Pause /> : <Play />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canPlay}
                  onClick={onRestart}
                  aria-label="Restart"
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restart</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onChangeSong}
                  aria-label="Change song"
                >
                  <ListMusic />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change song</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-1">
            <Gauge className="mx-2 size-4 shrink-0 text-zinc-500" />
            {playbackRates.map((rate) => (
              <Button
                key={rate}
                type="button"
                variant={playbackRate === rate ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onPlaybackRateChange(rate)}
                aria-pressed={playbackRate === rate}
                className="h-8 px-2.5 font-mono"
              >
                {rate}x
              </Button>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <Progress value={progress} className="h-2 bg-zinc-800" />
            <div className="mt-2 flex justify-between font-mono text-xs text-zinc-500">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
