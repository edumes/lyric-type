"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TypingStats } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type StatsPanelProps = {
  stats: TypingStats;
  elapsedSeconds: number;
};

const metricClass =
  "min-w-0 rounded-md border border-zinc-800/80 bg-zinc-950/65 p-3";

export function StatsPanel({ stats, elapsedSeconds }: StatsPanelProps) {
  return (
    <Card className="border-zinc-800/90 bg-black/35 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">wpm</div>
            <div className="mt-1 font-mono text-2xl text-amber-100">{stats.wpm}</div>
          </div>
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">accuracy</div>
            <div className="mt-1 font-mono text-2xl text-emerald-200">
              {stats.accuracy}%
            </div>
          </div>
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">correct</div>
            <div className="mt-1 font-mono text-2xl text-zinc-100">
              {stats.correctChars}
            </div>
          </div>
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">wrong</div>
            <div className="mt-1 font-mono text-2xl text-red-300">
              {stats.wrongChars}
            </div>
          </div>
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">lines</div>
            <div className="mt-1 font-mono text-2xl text-zinc-100">
              {stats.completedLines}
            </div>
          </div>
          <div className={metricClass}>
            <div className="text-xs uppercase text-zinc-500">elapsed</div>
            <div className="mt-1 font-mono text-2xl text-zinc-100">
              {formatDuration(elapsedSeconds)}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">progress {Math.round(stats.progress)}%</Badge>
          <Badge variant="secondary">typed {stats.correctChars + stats.wrongChars}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
