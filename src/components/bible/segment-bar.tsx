"use client";

import { cn } from "@/lib/utils";
import type { Segment } from "@/lib/bible/bible";

type Props = {
  segments: Segment[];
  className?: string;
  height?: string;
};

export function SegmentBar({ segments, className, height = "h-2" }: Props) {
  const totalVerses = segments.reduce((sum, s) => sum + s.verseCount, 0);
  if (totalVerses === 0) return null;

  return (
    <div className={cn("flex w-full rounded-full overflow-hidden", height, className)}>
      {segments.map((segment, i) => {
        const widthPercent = (segment.verseCount / totalVerses) * 100;
        if (widthPercent < 0.1) return null;
        return (
          <div
            key={i}
            className={cn(
              segment.read ? "bg-primary" : "bg-muted"
            )}
            style={{ width: `${widthPercent}%` }}
          />
        );
      })}
    </div>
  );
}
