"use client";

import { useEffect, useRef } from "react";

import { charactersMatch } from "@/lib/typing-metrics";
import type { LyricsLine } from "@/lib/types";
import { cn } from "@/lib/utils";

type LyricsDisplayProps = {
  lines: LyricsLine[];
  currentIndex: number;
  input: string;
};

function CharacterFeedbackLine({
  expected,
  typed,
}: {
  expected: string;
  typed: string;
}) {
  const expectedCharacters = expected.split("");
  const extraCharacters = typed.slice(expected.length).split("");

  return (
    <span className="relative block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {expectedCharacters.map((character, index) => {
        const typedCharacter = typed[index];
        const isTyped = typedCharacter !== undefined;
        const isCorrect = isTyped && charactersMatch(character, typedCharacter);
        const showCaret = index === typed.length;

        return (
          <span
            key={`${character}-${index}`}
            className={cn(
              "relative whitespace-pre",
              !isTyped && "text-zinc-500/80",
              isTyped && isCorrect && "text-amber-100",
              isTyped && !isCorrect && "text-red-400",
            )}
          >
            {showCaret ? (
              <span className="absolute -left-px top-[0.16em] h-[0.9em] w-px animate-pulse bg-amber-200" />
            ) : null}
            {character}
          </span>
        );
      })}
      {typed.length >= expected.length ? (
        <span className="relative inline-block h-[0.9em] w-px animate-pulse bg-amber-200 align-middle" />
      ) : null}
      {extraCharacters.map((character, index) => (
        <span key={`extra-${character}-${index}`} className="whitespace-pre text-red-400">
          {character}
        </span>
      ))}
    </span>
  );
}

export function LyricsDisplay({ lines, currentIndex, input }: LyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    const activeLine = lineRefs.current.get(currentIndex);

    if (!container || !activeLine) {
      return;
    }

    const nextScrollTop =
      activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: "smooth",
    });
  }, [currentIndex]);

  if (lines.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto h-[min(58vh,560px)] min-h-[360px] w-full max-w-6xl overflow-hidden py-32 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] sm:py-40"
    >
      <div className="flex flex-col gap-5">
        {lines.map((line, index) => {
        const isCurrent = index === currentIndex;
        const isPrevious = index < currentIndex;
        const distance = Math.abs(index - currentIndex);

        return (
          <div
            key={`${line.time}-${line.text}`}
            ref={(node) => {
              if (node) {
                lineRefs.current.set(index, node);
              } else {
                lineRefs.current.delete(index);
              }
            }}
            className={cn(
              "origin-left scroll-m-40 transition-all duration-500 ease-out",
              isCurrent
                ? "scale-100 text-3xl font-semibold leading-tight text-zinc-50 blur-0 sm:text-4xl md:text-5xl"
                : "scale-[0.96] text-lg leading-snug text-zinc-500 sm:text-xl",
              isPrevious && "opacity-25",
              !isPrevious && !isCurrent && "opacity-45",
              distance > 4 && "opacity-0 blur-sm",
            )}
            aria-live={isCurrent ? "polite" : undefined}
            aria-hidden={!isCurrent}
          >
            {isCurrent ? (
              <CharacterFeedbackLine expected={line.text} typed={input} />
            ) : (
              <span className="block break-words [overflow-wrap:anywhere]">{line.text}</span>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}
