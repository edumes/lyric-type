"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BackgroundYouTubePlayer,
  type BackgroundYouTubePlayerHandle,
} from "@/components/background-youtube-player";
import { LyricsDisplay } from "@/components/lyrics-display";
import { PlaybackControls } from "@/components/playback-controls";
import { ResultModal } from "@/components/result-modal";
import { StatsPanel } from "@/components/stats-panel";
import { Badge } from "@/components/ui/badge";
import { getActiveLyricIndex } from "@/lib/lrc-parser";
import {
  compareLine,
  createTypingStats,
} from "@/lib/typing-metrics";
import type {
  LyricsLine,
  PlayerState,
  SongDetails,
  YouTubeVideoResult,
} from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

type TypingGameProps = {
  song: SongDetails;
  lyrics: LyricsLine[];
  video: YouTubeVideoResult;
  onChangeSong: () => void;
};

type Totals = {
  correctChars: number;
  wrongChars: number;
  completedLines: number;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

const emptyTotals: Totals = {
  correctChars: 0,
  wrongChars: 0,
  completedLines: 0,
};

export function TypingGame({ song, lyrics, video, onChangeSong }: TypingGameProps) {
  const playerRef = useRef<BackgroundYouTubePlayerHandle>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputValueRef = useRef("");
  const previousLineIndexRef = useRef(-1);
  const savedLineIndexesRef = useRef<Set<number>>(new Set());
  const finishedRef = useRef(false);

  const [playerReady, setPlayerReady] = useState(false);
  const [state, setState] = useState<PlayerState>("ready");
  const [currentTime, setCurrentTime] = useState(0);
  const [lineInput, setLineInput] = useState("");
  const [totals, setTotals] = useState<Totals>(emptyTotals);
  const [resultOpen, setResultOpen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const duration = song.duration ?? video.duration ?? lyrics[lyrics.length - 1]?.time ?? 0;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const activeLineIndex = Math.max(0, getActiveLyricIndex(lyrics, currentTime));
  const currentLine = lyrics[activeLineIndex];

  const recordLine = useCallback(
    (lineIndex: number, typedValue: string) => {
      if (lineIndex < 0 || savedLineIndexesRef.current.has(lineIndex)) {
        return;
      }

      const expected = lyrics[lineIndex]?.text ?? "";
      const comparison = compareLine(expected, typedValue);
      savedLineIndexesRef.current.add(lineIndex);

      setTotals((current) => ({
        correctChars: current.correctChars + comparison.correctChars,
        wrongChars: current.wrongChars + comparison.wrongChars,
        completedLines: current.completedLines + 1,
      }));
    },
    [lyrics],
  );

  const resetSessionState = useCallback(() => {
    savedLineIndexesRef.current = new Set();
    previousLineIndexRef.current = -1;
    finishedRef.current = false;
    inputValueRef.current = "";
    setTotals(emptyTotals);
    setLineInput("");
    setCurrentTime(0);
    setResultOpen(false);
    setPlaybackError(null);
  }, []);

  const focusTypingInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const finishSession = useCallback(() => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    recordLine(previousLineIndexRef.current, inputValueRef.current);
    inputValueRef.current = "";
    setLineInput("");
    setState("finished");
    setResultOpen(true);
  }, [recordLine]);

  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate(rate);

    if (state === "playing") {
      focusTypingInput();
    }
  }, [focusTypingInput, state]);

  const handlePlayerStateChange = useCallback(
    (playerState: number) => {
      if (finishedRef.current) {
        return;
      }

      if (playerState === 1) {
        setState("playing");
      } else if (playerState === 2) {
        setState("paused");
      } else if (playerState === 0) {
        finishSession();
      }
    },
    [finishSession],
  );

  const handlePlaybackError = useCallback((message: string) => {
    setPlaybackError(message);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!playerReady) {
      setPlaybackError("The YouTube player is still loading.");
      return;
    }

    setPlaybackError(null);

    if (state === "playing") {
      playerRef.current?.pauseVideo();
      setState("paused");
      return;
    }

    if (state === "finished") {
      resetSessionState();
      playerRef.current?.seekTo(0);
    }

    playerRef.current?.setPlaybackRate(playbackRate);
    playerRef.current?.playVideo();
    setState("playing");
    focusTypingInput();
  }, [focusTypingInput, playbackRate, playerReady, resetSessionState, state]);

  const handleRestart = useCallback(() => {
    resetSessionState();
    playerRef.current?.seekTo(0);

    if (playerReady) {
      playerRef.current?.setPlaybackRate(playbackRate);
      playerRef.current?.playVideo();
      setState("playing");
      focusTypingInput();
    } else {
      setState("ready");
    }
  }, [focusTypingInput, playbackRate, playerReady, resetSessionState]);

  useEffect(() => {
    if (state !== "playing") {
      return;
    }

    const updateTime = () => {
      setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
    };

    updateTime();
    const interval = window.setInterval(updateTime, 180);

    return () => window.clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (playerReady) {
      playerRef.current?.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, playerReady]);

  useEffect(() => {
    if (state !== "playing" || duration <= 0) {
      return;
    }

    if (currentTime >= duration - 0.2) {
      finishSession();
    }
  }, [currentTime, duration, finishSession, state]);

  useEffect(() => {
    if (!currentLine) {
      return;
    }

    const previousLineIndex = previousLineIndexRef.current;

    if (previousLineIndex === -1) {
      previousLineIndexRef.current = activeLineIndex;
      return;
    }

    if (previousLineIndex !== activeLineIndex) {
      recordLine(previousLineIndex, inputValueRef.current);
      inputValueRef.current = "";
      setLineInput("");
      previousLineIndexRef.current = activeLineIndex;
    }
  }, [activeLineIndex, currentLine, recordLine]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onChangeSong();
        return;
      }

      if (event.code === "Space" && !isEditableTarget(event.target)) {
        event.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, onChangeSong]);

  const currentLineComparison = useMemo(() => {
    if (!currentLine) {
      return { correctChars: 0, wrongChars: 0 };
    }

    return compareLine(currentLine.text, lineInput);
  }, [currentLine, lineInput]);

  const stats = useMemo(
    () =>
      createTypingStats({
        correctChars: totals.correctChars + currentLineComparison.correctChars,
        wrongChars: totals.wrongChars + currentLineComparison.wrongChars,
        completedLines: totals.completedLines,
        startedAt: null,
        elapsedSeconds: currentTime,
        progress,
      }),
    [currentLineComparison, currentTime, progress, totals],
  );

  const isPlaying = state === "playing";
  const canPlay = playerReady && state !== "finished";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundYouTubePlayer
        ref={playerRef}
        videoId={video.videoId}
        active={state === "playing" || state === "paused" || state === "finished"}
        playbackRate={playbackRate}
        onReady={handlePlayerReady}
        onStateChange={handlePlayerStateChange}
        onPlaybackError={handlePlaybackError}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-50">Lyric Type</h1>
              <Badge variant="outline">{state}</Badge>
              <Badge variant="secondary">{playbackRate}x</Badge>
              {!playerReady ? <Badge variant="secondary">loading player</Badge> : null}
            </div>
            <p className="mt-2 truncate text-sm text-zinc-400">
              {song.trackName} - {song.artistName}
              {song.duration ? ` - ${formatDuration(song.duration)}` : ""}
            </p>
          </div>
          <div className="min-w-0 rounded-md border border-zinc-800/80 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-400">
            <span className="block truncate text-zinc-200">{video.title}</span>
            <span className="font-mono text-xs">{video.videoId}</span>
          </div>
        </header>

        <StatsPanel stats={stats} elapsedSeconds={currentTime} />

        {playbackError ? (
          <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-100">
            {playbackError}
          </div>
        ) : null}

        <section
          className={cn(
            "relative flex flex-1 cursor-text items-center rounded-lg border border-zinc-800/80 bg-black/35 px-4 backdrop-blur-md sm:px-6",
            state !== "playing" && "cursor-default",
          )}
          onClick={() => {
            if (state === "playing") {
              focusTypingInput();
            }
          }}
        >
          <textarea
            ref={inputRef}
            aria-label="Typing input"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={lineInput}
            disabled={state !== "playing"}
            onChange={(event) => {
              const value = event.target.value.replace(/\r?\n/g, " ");
              inputValueRef.current = value;
              setLineInput(value);
            }}
            className="absolute inset-0 z-20 h-full w-full resize-none bg-transparent text-transparent caret-transparent opacity-0 outline-none"
          />
          <LyricsDisplay lines={lyrics} currentIndex={activeLineIndex} input={lineInput} />
        </section>

        <PlaybackControls
          canPlay={canPlay || state === "finished"}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          playbackRate={playbackRate}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          onChangeSong={onChangeSong}
          onPlaybackRateChange={handlePlaybackRateChange}
        />
      </main>

      <ResultModal
        open={resultOpen}
        stats={stats}
        elapsedSeconds={currentTime}
        onOpenChange={setResultOpen}
        onRestart={handleRestart}
        onChangeSong={onChangeSong}
      />
    </div>
  );
}
