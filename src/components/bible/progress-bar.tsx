"use client";

import { Progress } from "@/components/ui/progress";

type Props = {
  label: string;
  current: number;
  total: number;
  showPercentage?: boolean;
};

export function ProgressBar({
  label,
  current,
  total,
  showPercentage = true,
}: Props) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {current.toLocaleString()} / {total.toLocaleString()}
          {showPercentage && ` (${percentage.toFixed(1)}%)`}
        </span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}
