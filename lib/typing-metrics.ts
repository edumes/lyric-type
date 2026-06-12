import type { TypingStats } from "@/lib/types";

export function charactersMatch(expected?: string, typed?: string) {
  if (expected === undefined || typed === undefined) {
    return false;
  }

  return expected.toLocaleLowerCase() === typed.toLocaleLowerCase();
}

export function compareLine(expected: string, typed: string) {
  let correctChars = 0;
  let wrongChars = 0;

  for (let index = 0; index < typed.length; index += 1) {
    if (charactersMatch(expected[index], typed[index])) {
      correctChars += 1;
    } else {
      wrongChars += 1;
    }
  }

  return { correctChars, wrongChars };
}

export function calculateAccuracy(correctChars: number, wrongChars: number) {
  const attempted = correctChars + wrongChars;
  if (attempted === 0) {
    return 100;
  }

  return Math.round((correctChars / attempted) * 100);
}

export function calculateWpm(correctChars: number, elapsedSeconds: number) {
  if (elapsedSeconds <= 0) {
    return 0;
  }

  return Math.round(correctChars / 5 / (elapsedSeconds / 60));
}

export function createTypingStats(input: {
  correctChars: number;
  wrongChars: number;
  completedLines: number;
  startedAt: number | null;
  elapsedSeconds: number;
  progress: number;
}): TypingStats {
  return {
    ...input,
    accuracy: calculateAccuracy(input.correctChars, input.wrongChars),
    wpm: calculateWpm(input.correctChars, input.elapsedSeconds),
  };
}
